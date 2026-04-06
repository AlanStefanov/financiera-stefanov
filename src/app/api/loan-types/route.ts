import { NextRequest, NextResponse } from 'next/server';
import { getDB, all, get, run } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_in_production';

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

export async function GET(request: NextRequest) {
  try {
    await getDB();
    const loanTypes = await all('SELECT * FROM loan_types ORDER BY duration_months, modality');
    return NextResponse.json(loanTypes);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching loan types' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await getDB();
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token || !verifyAdmin(token)) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, duration_months, modality, interest_percentage } = body;

    if (!name || !duration_months || !modality || !interest_percentage) {
      return NextResponse.json({ message: 'Faltan campos requeridos' }, { status: 400 });
    }

    const result = await run(
      'INSERT INTO loan_types (name, duration_months, modality, interest_percentage) VALUES (?, ?, ?, ?)',
      [name, duration_months, modality, interest_percentage]
    );

    const loanType = await get('SELECT * FROM loan_types WHERE id = ?', [result.lastID]);

    return NextResponse.json({
      message: 'Tipo de préstamo creado exitosamente',
      loanType
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error creating loan type' }, { status: 500 });
  }
}
