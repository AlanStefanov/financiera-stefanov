import { NextRequest, NextResponse } from 'next/server';
import { getDB, all, run, get } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await getDB();
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const payments = all(`
      SELECT p.*, l.total_amount as loan_total, l.principal_amount as loan_principal,
             c.name as client_name, c.phone as client_phone
      FROM payments p
      JOIN loans l ON p.loan_id = l.id
      JOIN clients c ON l.client_id = c.id
      ORDER BY p.payment_date DESC
    `);
    return NextResponse.json(payments);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching payments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await getDB();
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { loan_id, amount, payment_date, is_paid } = body;

    if (!loan_id || !amount || !payment_date) {
      return NextResponse.json({ message: 'Faltan campos requeridos' }, { status: 400 });
    }

    const paidDate = is_paid ? new Date().toISOString() : null;

    const result = await run(
      `INSERT INTO payments (loan_id, amount, payment_date, is_paid, paid_date)
       VALUES (?, ?, ?, ?, ?)`,
      [loan_id, amount, payment_date, is_paid ? 1 : 0, paidDate]
    );

    const payment = await get('SELECT * FROM payments WHERE id = ?', [result.lastID]);

    if (is_paid) {
      const loanPayments = await all('SELECT SUM(amount) as total FROM payments WHERE loan_id = ? AND is_paid = 1', [loan_id]);
      const loan = await get('SELECT total_amount FROM loans WHERE id = ?', [loan_id]);
      
      if (loanPayments[0]?.total && loan?.total_amount && Number(loanPayments[0].total) >= Number(loan.total_amount)) {
        await run('UPDATE loans SET status = ? WHERE id = ?', ['completed', loan_id]);
      }
    }

    return NextResponse.json({
      message: 'Pago registrado exitosamente',
      payment
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error creating payment' }, { status: 500 });
  }
}
