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

async function fetchBcra(cuil: string): Promise<any> {
  const url = `https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/${cuil}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (response.status === 200) {
      return { success: true, data: await response.json() };
    }
  } catch (error) {
    console.error('BCRA fetch error:', error);
  }
  
  return { success: false };
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

  for (const c of clientes) {
    const bcraResult = await fetchBcra(c.cuil);
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

    results.push({ id: c.id, name: c.name, cuil: c.cuil, bcra_name: nombreBcra, status });

    await client.execute({
      sql: "UPDATE clients SET bcra_status = ?, bcra_updated_at = datetime('now') WHERE id = ?",
      args: [status, c.id]
    });
  }

  const matchCount = results.filter(r => r.status === 'match').length;
  const mismatchCount = results.filter(r => r.status === 'mismatch').length;

  return NextResponse.json({ 
    message: 'BCRA validation completed',
    total: results.length,
    matches: matchCount,
    mismatches: mismatchCount,
    results
  });
}