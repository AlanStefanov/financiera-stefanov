import { NextRequest, NextResponse } from 'next/server';
import { getDB, get, run, all } from '@/lib/db';
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token || !verifyAdmin(token)) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    await getDB();
    const user = await get('SELECT id, username, name, lastname, phone, email, role, created_at FROM users WHERE id = ?', [parseInt(id)]);
    
    if (!user) {
      return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });
    }
    
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching user' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token || !verifyAdmin(token)) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    await getDB();
    const body = await request.json();
    const { username, name, lastname, phone, email, password, role } = body;

    const updates: string[] = [];
    const values: any[] = [];

    if (username) {
      const existing = await get('SELECT id FROM users WHERE username = ? AND id != ?', [username, parseInt(id)]);
      if (existing) {
        return NextResponse.json({ message: 'El nombre de usuario ya existe' }, { status: 400 });
      }
      updates.push('username = ?');
      values.push(username);
    }

    if (name) {
      updates.push('name = ?');
      values.push(name);
    }

    if (lastname) {
      updates.push('lastname = ?');
      values.push(lastname);
    }

    if (phone) {
      updates.push('phone = ?');
      values.push(phone);
    }

    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email || null);
    }

    if (password) {
      const hashedPassword = bcrypt.hashSync(password, 10);
      updates.push('password = ?');
      values.push(hashedPassword);
    }

    if (role) {
      if (role !== 'admin' && role !== 'operator') {
        return NextResponse.json({ message: 'Rol inválido' }, { status: 400 });
      }
      updates.push('role = ?');
      values.push(role);
    }

    if (updates.length === 0) {
      return NextResponse.json({ message: 'No hay campos para actualizar' }, { status: 400 });
    }

    values.push(parseInt(id));
    run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    const user = await get('SELECT id, username, name, lastname, phone, role, created_at FROM users WHERE id = ?', [parseInt(id)]);

    return NextResponse.json({
      message: 'Usuario actualizado exitosamente',
      user
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error updating user' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token || !verifyAdmin(token)) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const adminCount = await all('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin']);
    const userToDelete = await get('SELECT role FROM users WHERE id = ?', [parseInt(id)]);
    
    if (userToDelete && userToDelete.role === 'admin' && adminCount[0] && Number(adminCount[0].count) <= 1) {
      return NextResponse.json({ message: 'No puedes eliminar el último administrador' }, { status: 400 });
    }

    await getDB();
    await run('DELETE FROM users WHERE id = ?', [parseInt(id)]);

    return NextResponse.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    return NextResponse.json({ error: 'Error deleting user' }, { status: 500 });
  }
}
