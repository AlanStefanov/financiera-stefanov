import { createClient, Client } from '@libsql/client';

let client: Client | null = null;
let dbInitialized = false;

function getClient(): Client {
  if (!client) {
    const TURSO_URL = process.env.TURSO_URL;
    const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;
    
    if (!TURSO_URL || !TURSO_AUTH_TOKEN) {
      throw new Error('TURSO_URL and TURSO_AUTH_TOKEN environment variables are required');
    }
    
    client = createClient({
      url: TURSO_URL,
      authToken: TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

async function initDB() {
  if (dbInitialized) return;
  dbInitialized = true;
  await initializeDatabase();
}

export const getDB = async () => {
  await initDB();
  return getClient();
};

export const run = async (sql: string, params: any[] = []) => {
  const result = await getClient().execute({ sql, args: params });
  return { lastID: result.lastInsertRowid, changes: result.rowsAffected };
};

export const get = async (sql: string, params: any[] = []) => {
  const result = await getClient().execute({ sql, args: params });
  return result.rows[0] || undefined;
};

export const all = async (sql: string, params: any[] = []) => {
  const result = await getClient().execute({ sql, args: params });
  return result.rows;
};

export const exec = async (sql: string) => {
  await getClient().execute({ sql });
};

export const initializeDatabase = async () => {
  await getClient().execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      lastname TEXT NOT NULL,
      phone TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'operator')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await getClient().execute(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT,
      dni_front TEXT,
      dni_back TEXT,
      created_by INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  await getClient().execute(`
    CREATE TABLE IF NOT EXISTS loan_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      duration_months INTEGER NOT NULL CHECK(duration_months IN (1, 2)),
      modality TEXT NOT NULL CHECK(modality IN ('daily', 'weekly')),
      interest_percentage REAL NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await getClient().execute(`
    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      operator_id INTEGER NOT NULL,
      loan_type_id INTEGER NOT NULL,
      principal_amount REAL NOT NULL,
      total_amount REAL NOT NULL,
      start_date DATETIME NOT NULL,
      end_date DATETIME NOT NULL,
      status TEXT NOT NULL DEFAULT 'orden' CHECK(status IN ('orden', 'aprobado', 'finalizado')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (operator_id) REFERENCES users(id),
      FOREIGN KEY (loan_type_id) REFERENCES loan_types(id)
    )
  `);

  await getClient().execute(`
    CREATE TABLE IF NOT EXISTS loan_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loan_id INTEGER NOT NULL,
      payment_number INTEGER NOT NULL,
      amount REAL NOT NULL,
      due_date DATETIME NOT NULL,
      is_paid INTEGER DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      paid_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (loan_id) REFERENCES loans(id)
    )
  `);

  await getClient().execute(`CREATE INDEX IF NOT EXISTS idx_loans_client_id ON loans(client_id)`);
  await getClient().execute(`CREATE INDEX IF NOT EXISTS idx_loans_operator_id ON loans(operator_id)`);
  await getClient().execute(`CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status)`);
  await getClient().execute(`CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON loan_payments(loan_id)`);

  const loanTypesResult = await getClient().execute('SELECT COUNT(*) as count FROM loan_types');
  if (loanTypesResult.rows[0]?.count === 0) {
    await getClient().execute(`INSERT INTO loan_types (name, duration_months, modality, interest_percentage) VALUES ('Préstamo 1 Mes - Diario', 1, 'daily', 30)`);
    await getClient().execute(`INSERT INTO loan_types (name, duration_months, modality, interest_percentage) VALUES ('Préstamo 1 Mes - Semanal', 1, 'weekly', 30)`);
    await getClient().execute(`INSERT INTO loan_types (name, duration_months, modality, interest_percentage) VALUES ('Préstamo 2 Meses - Diario', 2, 'daily', 50)`);
    await getClient().execute(`INSERT INTO loan_types (name, duration_months, modality, interest_percentage) VALUES ('Préstamo 2 Meses - Semanal', 2, 'weekly', 50)`);
  }

  const adminResult = await getClient().execute("SELECT COUNT(*) as count FROM users WHERE username = 'admin'");
  if (adminResult.rows[0]?.count === 0) {
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync('Dr@wssap1234k', 10);
    await getClient().execute('INSERT INTO users (username, name, lastname, phone, password, role) VALUES (?, ?, ?, ?, ?, ?)', ['admin', 'Admin', 'Sistema', '1122334455', hashedPassword, 'admin']);
  }

  console.log('Base de datos Turso inicializada correctamente');
};