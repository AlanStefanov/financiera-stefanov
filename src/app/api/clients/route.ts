import { NextRequest, NextResponse } from 'next/server';
import { getDB, all, run, get } from '@/lib/db';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_in_production';

const saveImage = (base64Data: string, prefix: string): string => {
  if (!base64Data) return '';
  
  const matches = base64Data.match(/^data:([^/]+)\/([^;]+);base64,(.+)$/);
  if (!matches) return '';
  
  const ext = matches[1] === 'image/png' ? 'png' : 'jpg';
  const filename = `${prefix}_${Date.now()}.${ext}`;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'dni');
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  const buffer = Buffer.from(matches[3], 'base64');
  fs.writeFileSync(path.join(uploadDir, filename), buffer);
  
  return `/uploads/dni/${filename}`;
};

export async function GET(request: NextRequest) {
  try {
    await getDB();
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const clients = await all(`
      SELECT c.*, u.name as creator_name, u.lastname as creator_lastname 
      FROM clients c 
      LEFT JOIN users u ON c.created_by = u.id 
      WHERE c.is_active = 1
      ORDER BY c.name
    `);
    return NextResponse.json(clients);
  } catch (error: any) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ message: 'Error al obtener clientes', error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await getDB();
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    const body = await request.json();
    const { name, phone, address, dni_front, dni_back } = body;

    if (!name || !phone) {
      return NextResponse.json({ message: 'Nombre y teléfono son requeridos' }, { status: 400 });
    }

    const result = await run(
      'INSERT INTO clients (name, phone, address, dni_front, dni_back, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [name, phone, address || null, dni_front || null, dni_back || null, decoded.id]
    );

    const client = await get(`
      SELECT c.*, u.name as creator_name, u.lastname as creator_lastname 
      FROM clients c 
      LEFT JOIN users u ON c.created_by = u.id 
      WHERE c.id = ?
    `, [result.lastID]);
    
    return NextResponse.json({
      message: 'Cliente creado exitosamente',
      client
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating client:', error);
    if (error.message && error.message.includes('body')) {
      return NextResponse.json({ message: 'Error: el tamaño de los datos excede el límite permitido. Intenta usar fotos más pequeñas.' }, { status: 413 });
    }
    return NextResponse.json({ message: 'Error al crear cliente', error: error.message }, { status: 500 });
  }
}
