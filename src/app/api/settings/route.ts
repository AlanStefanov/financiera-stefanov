import { NextRequest, NextResponse } from 'next/server';
import { getDB, all, run } from '@/lib/db';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_in_production';

const saveLogo = (base64Data: string): string => {
  if (!base64Data) return '';
  
  const matches = base64Data.match(/^data:([^/]+)\/([^;]+);base64,(.+)$/);
  if (!matches) return '';
  
  const ext = matches[1] === 'image/png' ? 'png' : 'jpg';
  const filename = `logo.${ext}`;
  const uploadDir = path.join(process.cwd(), 'public');
  
  const buffer = Buffer.from(matches[3], 'base64');
  fs.writeFileSync(path.join(uploadDir, filename), buffer);
  
  return `/${filename}`;
};

const verifyAdmin = (token: string) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    if (decoded.role !== 'admin') {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
};

export async function GET() {
  try {
    await getDB();
    const settings = await all('SELECT * FROM settings');
    const settingsObj: Record<string, string> = {};
    settings.forEach((s: any) => {
      settingsObj[s.key] = s.value;
    });
    return NextResponse.json(settingsObj);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await getDB();
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token || !verifyAdmin(token)) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ message: 'Faltan campos requeridos' }, { status: 400 });
    }

    let finalValue = value;
    
    if (key === 'company_logo' && value && value.startsWith('data:')) {
      finalValue = saveLogo(value);
    }

    const validKeys = [
      'company_name', 'company_phone', 'company_address', 'company_website',
      'credit_limit_default', 'company_logo'
    ];

    if (!validKeys.includes(key)) {
      return NextResponse.json({ message: 'Clave no válida' }, { status: 400 });
    }

    await run(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
      [key, finalValue, finalValue]
    );

    return NextResponse.json({ message: 'Configuración actualizada', key: key, value: finalValue });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ message: 'Error al actualizar: ' + error.message }, { status: 500 });
  }
}