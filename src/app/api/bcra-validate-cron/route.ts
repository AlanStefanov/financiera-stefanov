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
  const total = clientes.length;
  
  const results: any[] = [];

  for (const c of clientes) {
    const bcraResult = await fetchBcra(c.cuil);
    const nombreBcra = bcraResult.success ? bcraResult.data?.results?.denominacion || '' : '';
    
    let status: string | null = null;
    let shouldUpdate = false;
    
    if (!bcraResult.success) {
      continue;
    } else if (!nombreBcra) {
      continue;
    } else {
      const localNorm = normalizar(c.name);
      const bcraNorm = normalizar(nombreBcra);
      if (localNorm.includes(bcraNorm) || bcraNorm.includes(localNorm)) {
        // Extraer la peor situación crediticia real (igual que bcra-check)
        const periodos = bcraResult.data?.results?.periodos || [];
        if (periodos.length > 0) {
          const entidades = periodos[0].entidades || [];
          if (entidades.length > 0) {
            const worstSituacion = entidades.reduce((worst: number, e: any) => {
              return Math.max(worst, e.situacion ?? 0);
            }, 0);
            switch (worstSituacion) {
              case 1: status = 'Normal'; break;
              case 2: status = 'Seguimiento especial'; break;
              case 3: status = 'Problemas'; break;
              case 4: status = 'Alto riesgo'; break;
              case 5: status = 'Irrecuperable'; break;
              default: status = 'Sin deuda';
            }
          } else {
            status = 'Sin deuda';
          }
        } else {
          status = 'Sin deuda';
        }
        shouldUpdate = true;
      } else {
        continue;
      }
    }

    results.push({ id: c.id, name: c.name, cuil: c.cuil, bcra_name: nombreBcra, status });

    if (shouldUpdate) {
      await client.execute({
        sql: "UPDATE clients SET bcra_status = ?, bcra_updated_at = datetime('now') WHERE id = ?",
        args: [status, c.id]
      });
    }
  }

  const updatedCount = results.filter(r => r.status !== null).length;
  const skippedCount = total - results.length;

  return NextResponse.json({ 
    message: 'BCRA validation completed',
    total,
    updated: updatedCount,
    skipped: skippedCount,
    results
  });
}