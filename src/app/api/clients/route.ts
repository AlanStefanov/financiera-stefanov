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
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching clients' }, { status: 500 });
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

    const dniFrontPath = saveImage(dni_front || '', 'front');
    const dniBackPath = saveImage(dni_back || '', 'back');

    const result = await run(
      'INSERT INTO clients (name, phone, address, dni_front, dni_back, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [name, phone, address || null, dniFrontPath, dniBackPath, decoded.id]
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
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error creating client' }, { status: 500 });
  }
}
