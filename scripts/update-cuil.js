const { createClient } = require('@libsql/client');

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
    { id: 2, name: 'Ayelen Débora Manzy' },
    { id: 3, name: 'Emmanuel Ángel Plaza', cuil: '20337828367' },
    { id: 10, name: 'Fabián Medina Víctor', cuil: '20949602336' },
    { id: 12, name: 'Gutiérrez Karla', cuil: '27332950477' },
    { id: 11, name: 'Leonardo Miranda', cuil: '20383024119' },
    { id: 9, name: 'Rosana Montiel', cuil: '27302803434' },
    { id: 13, name: 'Sebastián Herrera', cuil: '20363365517' },
  ];

  for (const u of updates) {
    const setClauses = [];
    const args = [];
    
    if (u.name) {
      setClauses.push('name = ?');
      args.push(u.name);
    }
    if (u.cuil) {
      setClauses.push('cuil = ?');
      args.push(u.cuil);
    }
    
    args.push(u.id);
    
    await client.execute({
      sql: `UPDATE clients SET ${setClauses.join(', ')} WHERE id = ?`,
      args
    });
    console.log(`Updated ID ${u.id} -> name: ${u.name}, cuil: ${u.cuil || 'N/A'}`);
  }
}

updateCUIL().then(() => console.log('Done')).catch(console.error);