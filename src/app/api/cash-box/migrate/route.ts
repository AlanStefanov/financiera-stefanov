import { NextRequest, NextResponse } from 'next/server';
import { getDB, all, run } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_in_production';

export async function POST(request: NextRequest) {
  try {
    await getDB();
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    if (decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Solo admin' }, { status: 403 });
    }

    const paidPayments = await all(`
      SELECT lp.id, lp.loan_id, lp.paid_amount, lp.payment_number, l.fund_source
      FROM loan_payments lp
      JOIN loans l ON lp.loan_id = l.id
      WHERE lp.is_paid = 1
    `);

    console.log('paidPayments:', paidPayments.length);
    console.log('first:', paidPayments[0]);

    let inserted = 0;
    for (const p of paidPayments) {
      const existing = await all(
        'SELECT id FROM cash_box WHERE description LIKE ?',
        [`%Cobro cuota ${p.payment_number} - Préstamo ${p.loan_id}%`]
      );
      if (existing.length === 0) {
        await run(
          'INSERT INTO cash_box (amount, type, description, created_by) VALUES (?, ?, ?, ?)',
          [p.paid_amount, 'collection', `Cobro cuota ${p.payment_number} - Préstamo ${p.loan_id}`, null]
        );
        inserted++;
        console.log('Inserted:', p.loan_id, p.payment_number, p.paid_amount);
      }
    }

    return NextResponse.json({ message: `Se insertaron ${inserted} cobranzas`, total: paidPayments.length });

    return NextResponse.json({ message: `Se insertaron ${inserted} cobranzas` });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}