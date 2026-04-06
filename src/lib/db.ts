import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';

let db: Database | null = null;
let dbPath: string = '';

export const getDB = async (): Promise<Database> => {
  if (!db) {
    const SQL = await initSqlJs({
      locateFile: (file: string) => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file)
    });
    
    const dataDir = path.resolve('./data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    dbPath = path.join(dataDir, 'financiera.db');
    
    if (fs.existsSync(dbPath)) {
      console.log('Cargando base de datos existente...');
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
      initializeDatabase(db);
    } else {
      console.log('Creando nueva base de datos...');
      db = new SQL.Database();
      initializeDatabase(db);
    }
    saveDatabase();
  }
  return db;
};

export const run = (sql: string, params: any[] = []) => {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
  saveDatabase();
  return { lastID: db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] || 0, changes: db.getRowsModified() };
};

export const get = (sql: string, params: any[] = []) => {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
};

export const all = (sql: string, params: any[] = []) => {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: any[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
};

export const exec = (sql: string) => {
  if (!db) throw new Error('Database not initialized');
  db.run(sql);
  saveDatabase();
};

const saveDatabase = () => {
  if (db && dbPath) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
};

const initializeDatabase = (db: Database) => {
  db.run(`
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

  db.run(`
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

  db.run(`
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

  db.run(`
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

  db.run(`
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

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_loans_client_id ON loans(client_id)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_loans_operator_id ON loans(operator_id)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON loan_payments(loan_id)
  `);

  try {
    db.run('ALTER TABLE clients ADD COLUMN is_active INTEGER DEFAULT 1');
  } catch (e) {}

  const loanTypesCount = db.exec('SELECT COUNT(*) FROM loan_types');
  if (loanTypesCount[0]?.values[0]?.[0] === 0) {
    db.run(`INSERT INTO loan_types (name, duration_months, modality, interest_percentage) VALUES ('Préstamo 1 Mes - Diario', 1, 'daily', 30)`);
    db.run(`INSERT INTO loan_types (name, duration_months, modality, interest_percentage) VALUES ('Préstamo 1 Mes - Semanal', 1, 'weekly', 30)`);
    db.run(`INSERT INTO loan_types (name, duration_months, modality, interest_percentage) VALUES ('Préstamo 2 Meses - Diario', 2, 'daily', 50)`);
    db.run(`INSERT INTO loan_types (name, duration_months, modality, interest_percentage) VALUES ('Préstamo 2 Meses - Semanal', 2, 'weekly', 50)`);
  }

  const adminCount = db.exec("SELECT COUNT(*) FROM users WHERE username = 'admin'");
  if (adminCount[0]?.values[0]?.[0] === 0) {
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync('Dr@wssap1234k', 10);
    db.run('INSERT INTO users (username, name, lastname, phone, password, role) VALUES (?, ?, ?, ?, ?, ?)', ['admin', 'Admin', 'Sistema', '1122334455', hashedPassword, 'admin']);
  }

  console.log('Base de datos inicializada correctamente');
};
