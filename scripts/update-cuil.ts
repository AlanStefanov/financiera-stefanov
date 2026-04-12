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

async function updateCUIL() {
  const updates = [
    { name: 'PLOZA, ANGEL EMMANUEL', cuil: '20337828367' },
    { name: 'MEDINA IBARRA, VICTOR FABIAN', cuil: '20949602336' },
    { name: 'GUTIERREZ, KARLA', cuil: '27332950477' },
    { name: 'MIRANDA, LUIS LEONARDO', cuil: '20383024119' },
    { name: 'MONTIEL, ROSANA', cuil: '27302803434' },
    { name: 'HERRERA, OSCAR SEBASTIAN', cuil: '20363365517' },
  ];

  for (const u of updates) {
    const result = await client.execute({
      sql: "SELECT id, name FROM clients WHERE name LIKE ?",
      args: [`%${u.name}%`]
    });
    
    if (result.rows.length > 0) {
      const clientId = result.rows[0].id;
      await client.execute({
        sql: "UPDATE clients SET cuil = ? WHERE id = ?",
        args: [u.cuil, clientId]
      });
      console.log(`Updated ${result.rows[0].name} (ID: ${clientId}) -> CUIL: ${u.cuil}`);
    } else {
      console.log(`Client not found: ${u.name}`);
    }
  }
}

updateCUIL().then(() => console.log('Done'));