import { NextRequest, NextResponse } from 'next/server';
import { getDB, all, get, run } from '@/lib/db';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_in_production';

const verifyAdmin = (token: string) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    return decoded.role === 'admin' ? decoded : null;
  } catch {
    return null;
  }
};

export async function GET(request: NextRequest) {
  try {
    await getDB();
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token || !verifyAdmin(token)) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const users = await all('SELECT id, username, name, lastname, phone, email, role, created_at FROM users ORDER BY created_at DESC');
    return NextResponse.json(users);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Error fetching users: ' + (error.message || 'Error desconocido') }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await getDB();
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token || !verifyAdmin(token)) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json({ message: 'Error: formato de datos inválido' }, { status: 400 });
    }
    
    const { username, name, lastname, phone, email, password, role } = body;

    if (!username || !name || !lastname || !phone || !password || !role) {
      return NextResponse.json({ message: 'Faltan campos requeridos' }, { status: 400 });
    }

    if (role !== 'admin' && role !== 'operator') {
      return NextResponse.json({ message: 'Rol inválido' }, { status: 400 });
    }

    const existingUser = await get('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return NextResponse.json({ message: 'El nombre de usuario ya existe' }, { status: 400 });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = await run(
      'INSERT INTO users (username, name, lastname, phone, email, password, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, name, lastname, phone, email || null, hashedPassword, role]
    );

    const user = await get('SELECT id, username, name, lastname, phone, email, role, created_at FROM users WHERE id = ?', [result.lastID]);

    return NextResponse.json({
      message: 'Usuario creado exitosamente',
      user
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ message: 'Error al crear usuario: ' + (error.message || 'Error desconocido') }, { status: 500 });
  }
}
