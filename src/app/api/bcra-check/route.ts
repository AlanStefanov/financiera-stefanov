import { NextRequest, NextResponse } from 'next/server';

async function fetchBcraWithRetry(cuil: string, retries = 10, delayMs = 600000): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/${cuil}`, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.bcra.gob.ar/BCRAyVos/Situacion_Crediticia.asp',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (response.status === 200) {
        return { success: true, data: await response.json() };
      }
      
      console.log(`BCRA attempt ${attempt} failed with status ${response.status}, retrying in ${delayMs}ms...`);
    } catch (error: any) {
      console.log(`BCRA attempt ${attempt} error: ${error.message}, retrying in ${delayMs}ms...`);
    }
    
    if (attempt < retries) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return { success: false, error: 'BCRA no disponible después de varios intentos' };
}

export async function POST(request: NextRequest) {
  try {
    const { cuil } = await request.json();

    if (!cuil) {
      return NextResponse.json({ message: 'CUIL es requerido' }, { status: 400 });
    }

    const cleanCuil = cuil.replace(/\s/g, '').replace(/\D/g, '');
    
    if (cleanCuil.length < 8 || cleanCuil.length > 11) {
      return NextResponse.json({ message: 'CUIL inválido' }, { status: 400 });
    }

    const result = await fetchBcraWithRetry(cleanCuil, 3, 2000);

    if (!result.success) {
      return NextResponse.json({ 
        message: result.error,
        trying: true
      }, { status: 503 });
    }

    const data = result.data;

    if (!data.results || !data.results.periodos || data.results.periodos.length === 0) {
      return NextResponse.json({ 
        status: 'Sin deuda',
        message: 'El cliente no tiene deuda en BCRA'
      });
    }

    const latestPeriodo = data.results.periodos[0];
    const entidades = latestPeriodo.entidades || [];
    
    if (entidades.length === 0) {
      return NextResponse.json({ 
        status: 'Sin deuda',
        message: 'El cliente no tiene deuda en BCRA'
      });
    }

    const worstSituacion = entidades.reduce((worst: number, e: any) => {
      return Math.max(worst, e.situacion);
    }, 0);

    let statusLabel = 'Normal';
    switch (worstSituacion) {
      case 1: statusLabel = 'Normal'; break;
      case 2: statusLabel = 'Seguimiento especial'; break;
      case 3: statusLabel = 'Problemas'; break;
      case 4: statusLabel = 'Alto riesgo'; break;
      case 5: statusLabel = 'Irrecuperable'; break;
      default: statusLabel = 'Sin deuda';
    }

    const totalMonto = entidades.reduce((sum: number, e: any) => sum + (e.monto || 0), 0);

    return NextResponse.json({ 
      status: statusLabel,
      situacion: worstSituacion,
      entidades: entidades.map((e: any) => ({
        entidad: e.entidad,
        situacion: e.situacion,
        monto: e.monto,
        fechaSit1: e.fechaSit1
      })),
      totalDeuda: totalMonto,
      periodos: data.results.periodos.length
    });

  } catch (error: any) {
    console.error('BCRA check error:', error);
    return NextResponse.json({ 
      message: 'Error al consultar BCRA: ' + error.message 
    }, { status: 500 });
  }
}