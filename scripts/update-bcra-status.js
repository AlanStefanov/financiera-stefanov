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

async function updateBcraStatus() {
  const updates = [
    { id: 2, status: 'Normal' },
    { id: 9, status: 'Irrecuperable' },
  ];

  for (const u of updates) {
    await client.execute({
      sql: "UPDATE clients SET bcra_status = ?, bcra_updated_at = datetime('now') WHERE id = ?",
      args: [u.status, u.id]
    });
    console.log(`Updated ID ${u.id} -> BCRA status: ${u.status}`);
  }

  await client.execute({
    sql: "UPDATE clients SET bcra_status = NULL, bcra_updated_at = NULL WHERE id NOT IN (2, 9) AND cuil IS NOT NULL AND cuil != ''",
  });
  console.log('Cleared BCRA status for remaining clients');
}

updateBcraStatus().then(() => console.log('Done')).catch(console.error);