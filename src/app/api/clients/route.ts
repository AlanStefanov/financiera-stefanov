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
      SELECT c.id, c.name, c.phone, c.address, c.created_by, c.is_active, c.created_at, c.updated_at,
             u.name as creator_name, u.lastname as creator_lastname,
             CASE WHEN c.dni_front IS NOT NULL AND c.dni_front != '' THEN 1 ELSE 0 END as has_dni
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

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    } catch (jwtError: any) {
      console.error('JWT Error:', jwtError.message);
      return NextResponse.json({ message: 'Token inválido o expirado: ' + jwtError.message }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json({ message: 'Error: formato de datos inválido' }, { status: 400 });
    }
    
    const { name, phone, address, dni_front, dni_back } = body;

    if (!name || !phone) {
      return NextResponse.json({ message: 'Nombre y teléfono son requeridos' }, { status: 400 });
    }

    const dniFrontSize = dni_front ? dni_front.length : 0;
    const dniBackSize = dni_back ? dni_back.length : 0;
    const totalSize = dniFrontSize + dniBackSize;
    
    if (totalSize > 5000000) {
      return NextResponse.json({ message: 'Las imágenes son muy grandes. Por favor use fotos más pequeñas (máx 5MB)' }, { status: 413 });
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
    return NextResponse.json({ message: 'Error al crear cliente: ' + (error.message || 'Error desconocido'), error: error.message }, { status: 500 });
  }
}