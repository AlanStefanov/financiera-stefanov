import { NextRequest, NextResponse } from 'next/server';
import { getDB, get } from '@/lib/db';
import { getJwtSecret } from '@/lib/auth';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    await getDB();
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ message: 'Username y password son requeridos' }, { status: 400 });
    }

    const user = await get('SELECT * FROM users WHERE username = ?', [username]);
    
    if (!user) {
      return NextResponse.json({ message: 'Credenciales inválidas' }, { status: 401 });
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password as string);
    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Credenciales inválidas' }, { status: 401 });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name, lastname: user.lastname },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      message: 'Login exitoso',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error en login' }, { status: 500 });
  }
}
