import { createClient } from '@libsql/client';

const TURSO_URL = process.env.TURSO_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_AUTH_TOKEN) {
  console.error('Missing TURSO_URL or TURSO_AUTH_TOKEN');
  process.exit(1);
}

const client = createClient({
  url: TURSO_URL,
  authToken: TURSO_AUTH_TOKEN,
});

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

async function fetchBcra(cuil: string): Promise<any> {
  const url = `https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/${cuil}`;
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.bcra.gob.ar/BCRAyVos/Situacion_Crediticia.asp',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (response.status === 200) {
        return { success: true, data: await response.json() };
      }
      
      console.log(`BCRA attempt ${attempt} failed with status ${response.status}`);
    } catch (error: any) {
      console.log(`BCRA attempt ${attempt} error: ${error.message}`);
    }
  }
  
  return { success: false, error: 'BCRA no disponible' };
}

async function validarClientes() {
  console.log('Iniciando validación de clientes contra BCRA...\n');
  
  const result = await client.execute({
    sql: "SELECT id, name, cuil FROM clients WHERE cuil IS NOT NULL AND cuil != ''",
  });

  const clientes = result.rows as unknown as { id: number; name: string; cuil: string }[];
  
  console.log(`ID   | Estado          | Nombre Local                    | Nombre BCRA`);
  console.log('─'.repeat(90));

  let coincidencias = 0;
  let errores = 0;
  let sinDatos = 0;

  for (const c of clientes) {
    const bcraResult = await fetchBcra(c.cuil);
    
    if (!bcraResult.success) {
      console.log(`${c.id.toString().padStart(4)} | ⚠️ FALLO API  | ${c.name.substring(0, 30).padEnd(30)} | ${bcraResult.error}`);
      errores++;
      continue;
    }

    const data = bcraResult.data;
    const nombreBcra = data?.results?.denominacion || '';
    
    if (!nombreBcra) {
      console.log(`${c.id.toString().padStart(4)} | ⚠️ SIN DATOS | ${c.name.substring(0, 30).padEnd(30)} | (sin información)`);
      sinDatos++;
      continue;
    }

    const localNorm = normalizar(c.name);
    const bcraNorm = normalizar(nombreBcra);
    
    const coincide = localNorm.includes(bcraNorm) || bcraNorm.includes(localNorm);
    
    if (coincide) {
      console.log(`${c.id.toString().padStart(4)} | ✅ COINCIDE  | ${c.name.substring(0, 30).padEnd(30)} | ${nombreBcra.substring(0, 40)}`);
      coincidencias++;
    } else {
      console.log(`${c.id.toString().padStart(4)} | ❌ ERROR     | ${c.name.substring(0, 30).padEnd(30)} | ${nombreBcra.substring(0, 40)}`);
      errores++;
    }
  }

  console.log('\n─'.repeat(90));
  console.log(`Resumen: ${coincidencias} coincidencias, ${errores} errores, ${sinDatos} sin datos`);
}

validarClientes()
  .then(() => console.log('\nValidación completada'))
  .catch(console.error);