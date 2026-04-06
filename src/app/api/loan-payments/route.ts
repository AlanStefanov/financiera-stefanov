import { NextRequest, NextResponse } from 'next/server';
import { getDB, all } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_in_production';

export async function GET(request: NextRequest) {
  try {
    await getDB();
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const payments = await all(`
      SELECT lp.*, l.total_amount as loan_total, l.principal_amount as loan_principal,
             c.name as client_name, c.phone as client_phone
      FROM loan_payments lp
      JOIN loans l ON lp.loan_id = l.id
      JOIN clients c ON l.client_id = c.id
      ORDER BY lp.due_date ASC
    `);
    return NextResponse.json(payments);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching payments' }, { status: 500 });
  }
}