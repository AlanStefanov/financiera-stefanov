import { NextRequest, NextResponse } from 'next/server';
import { getDB, get, run } from '@/lib/db';
import jwt from 'jsonwebtoken';

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
    await getDB();
    const loanType = get('SELECT * FROM loan_types WHERE id = ?', [parseInt(id)]);
    
    if (!loanType) {
      return NextResponse.json({ message: 'Tipo de préstamo no encontrado' }, { status: 404 });
    }
    
    return NextResponse.json(loanType);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching loan type' }, { status: 500 });
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
    const { name, duration_months, modality, interest_percentage, is_active } = body;

    const updates: string[] = [];
    const values: any[] = [];

    if (name) { updates.push('name = ?'); values.push(name); }
    if (duration_months) { updates.push('duration_months = ?'); values.push(duration_months); }
    if (modality) { updates.push('modality = ?'); values.push(modality); }
    if (interest_percentage !== undefined) { updates.push('interest_percentage = ?'); values.push(interest_percentage); }
    if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }

    if (updates.length === 0) {
      return NextResponse.json({ message: 'No hay campos para actualizar' }, { status: 400 });
    }

    values.push(parseInt(id));
    run(`UPDATE loan_types SET ${updates.join(', ')} WHERE id = ?`, values);

    const loanType = get('SELECT * FROM loan_types WHERE id = ?', [parseInt(id)]);
    
    if (!loanType) {
      return NextResponse.json({ message: 'Tipo de préstamo no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Tipo de préstamo actualizado exitosamente',
      loanType
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error updating loan type' }, { status: 500 });
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

    await getDB();
    run('DELETE FROM loan_types WHERE id = ?', [parseInt(id)]);

    return NextResponse.json({ message: 'Tipo de préstamo eliminado exitosamente' });
  } catch (error) {
    return NextResponse.json({ error: 'Error deleting loan type' }, { status: 500 });
  }
}
