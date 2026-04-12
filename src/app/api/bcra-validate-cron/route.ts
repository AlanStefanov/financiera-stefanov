import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import jwt from 'jsonwebtoken';

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

async function fetchBcraWithRetry(cuil: string, maxRetries = 5, baseDelayMs = 2000): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/${cuil}`, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.bcra.gob.ar/BCRAyVos/Situacion_Crediticia.asp',
        },
        signal: AbortSignal.timeout(20000),
      });

      if (response.status === 200) {
        return { success: true, data: await response.json() };
      }

      console.log(`BCRA attempt ${attempt}/${maxRetries} failed with status ${response.status} for CUIL ${cuil}`);
    } catch (error: any) {
      console.log(`BCRA attempt ${attempt}/${maxRetries} error: ${error.message} for CUIL ${cuil}`);
    }

    if (attempt < maxRetries) {
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return { success: false, error: 'BCRA no disponible después de varios intentos' };
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Solo admins pueden ejecutar esta acción' }, { status: 403 });
    }
  } catch (error) {
    return NextResponse.json({ message: 'Token inválido' }, { status: 401 });
  }

  return handleValidation();
}

export async function GET() {
  return handleValidation();
}

async function handleValidation() {
  const TURSO_URL = process.env.TURSO_URL;
  const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

  if (!TURSO_URL || !TURSO_AUTH_TOKEN) {
    return NextResponse.json({ message: 'Missing env vars' }, { status: 500 });
  }

  const client = createClient({
    url: TURSO_URL,
    authToken: TURSO_AUTH_TOKEN,
  });

  const result = await client.execute({
    sql: "SELECT id, name, cuil FROM clients WHERE cuil IS NOT NULL AND cuil != ''",
  });

  const clientes = result.rows as unknown as { id: number; name: string; cuil: string }[];
  
  const results: any[] = [];
  let processed = 0;
  const total = clientes.length;

  console.log(`Starting BCRA validation for ${total} clients`);

  for (const c of clientes) {
    processed++;
    
    const bcraResult = await fetchBcraWithRetry(c.cuil);
    const nombreBcra = bcraResult.success ? bcraResult.data?.results?.denominacion || '' : '';
    
    let status = 'error';
    if (!bcraResult.success) {
      status = 'api_fail';
    } else if (!nombreBcra) {
      status = 'no_data';
    } else {
      const localNorm = normalizar(c.name);
      const bcraNorm = normalizar(nombreBcra);
      status = localNorm.includes(bcraNorm) || bcraNorm.includes(localNorm) ? 'match' : 'mismatch';
    }

    results.push({ id: c.id, name: c.name, cuil: c.cuil, bcra_name: nombreBcra, status, processed });

    await client.execute({
      sql: "UPDATE clients SET bcra_status = ?, bcra_updated_at = datetime('now') WHERE id = ?",
      args: [status, c.id]
    });

    if (processed % 10 === 0) {
      console.log(`Processed ${processed}/${total} clients`);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const matchCount = results.filter(r => r.status === 'match').length;
  const mismatchCount = results.filter(r => r.status === 'mismatch').length;
  const apiFailCount = results.filter(r => r.status === 'api_fail').length;
  const noDataCount = results.filter(r => r.status === 'no_data').length;

  console.log(`BCRA validation completed: ${matchCount} matches, ${mismatchCount} mismatches, ${apiFailCount} failed, ${noDataCount} no data`);

  return NextResponse.json({ 
    message: 'BCRA validation completed',
    total,
    matches: matchCount,
    mismatches: mismatchCount,
    apiFail: apiFailCount,
    noData: noDataCount,
    results
  });
}