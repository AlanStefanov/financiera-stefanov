import { NextRequest, NextResponse } from 'next/server';
import { getDB, run, get } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    await getDB();
    const body = await request.json();
    const { name, phone, address, cuil, dni_front, dni_back } = body;

    if (!name || !phone || !cuil) {
      return NextResponse.json({ message: 'Faltan campos requeridos' }, { status: 400 });
    }

    const existingClient = await get('SELECT id FROM clients WHERE cuil = ?', [cuil]);
    if (existingClient) {
      return NextResponse.json({ message: 'Ya existe un cliente registrado con este CUIL' }, { status: 400 });
    }

    const result = await run(
      'INSERT INTO clients (name, phone, address, cuil, dni_front, dni_back, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, phone, address || null, cuil, dni_front || null, dni_back || null, 1]
    );

    return NextResponse.json({ 
      message: 'Registro exitoso. Te contactaremos pronto.',
      clientId: result.lastID
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error registering client:', error);
    return NextResponse.json({ message: 'Error al registrar cliente' }, { status: 500 });
  }
}