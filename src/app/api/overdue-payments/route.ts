import { NextRequest, NextResponse } from 'next/server';
import { getDB, all } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await getDB();

    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const decoded = jwt.verify(token, getJwtSecret()) as { id: number; role: string };

    const todayArg = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

    let query = `
      SELECT
        lp.id,
        lp.loan_id,
        lp.payment_number,
        lp.amount,
        lp.due_date,
        c.name as client_name,
        c.phone as client_phone,
        u.id as operator_id,
        u.name || ' ' || u.lastname as operator_name
      FROM loan_payments lp
      JOIN loans l ON lp.loan_id = l.id
      JOIN clients c ON l.client_id = c.id
      JOIN users u ON l.operator_id = u.id
      WHERE lp.is_paid = 0
        AND date(lp.due_date) < ?
        AND l.status = 'aprobado'
    `;

    const params: Array<string | number> = [todayArg];
    if (decoded.role !== 'admin') {
      query += ' AND l.operator_id = ?';
      params.push(decoded.id);
    }

    query += ' ORDER BY lp.due_date ASC';

    const overduePayments = await all(query, params);

    return NextResponse.json(overduePayments);
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ message: 'Token inválido o expirado' }, { status: 401 });
    }
    console.error('Error fetching overdue payments:', error);
    return NextResponse.json({ message: 'Error obteniendo pagos atrasados' }, { status: 500 });
  }
}
