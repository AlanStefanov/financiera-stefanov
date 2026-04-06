import { NextRequest, NextResponse } from 'next/server';
import { getDB, all, run, get } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_in_production';

const getNextBusinessDay = (date: Date): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  while (next.getDay() === 0 || next.getDay() === 6) {
    next.setDate(next.getDate() + 1);
  }
  return next;
};

export async function GET(request: NextRequest) {
  try {
    await getDB();
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string };
    
    let query = `
      SELECT l.*, c.name as client_name, c.phone as client_phone, u.username as operator_name,
             lt.name as loan_type_name, lt.modality, lt.duration_months, lt.interest_percentage,
             (SELECT COUNT(*) FROM loan_payments WHERE loan_id = l.id) as payment_count,
             (SELECT COUNT(*) FROM loan_payments WHERE loan_id = l.id AND is_paid = 1) as paid_count
      FROM loans l
      JOIN clients c ON l.client_id = c.id
      JOIN users u ON l.operator_id = u.id
      JOIN loan_types lt ON l.loan_type_id = lt.id
    `;
    
    if (decoded.role !== 'admin') {
      query += ` WHERE l.operator_id = ${decoded.id}`;
    }
    
    query += ` ORDER BY l.created_at DESC`;
    
    const loans = await all(query);
    return NextResponse.json(loans);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching loans' }, { status: 500 });
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
    const { client_id, loan_type_id, principal_amount, start_date } = body;

    if (!client_id || !loan_type_id || !principal_amount || !start_date) {
      return NextResponse.json({ message: 'Faltan campos requeridos' }, { status: 400 });
    }

    const loanType = await get('SELECT * FROM loan_types WHERE id = ? AND is_active = 1', [loan_type_id]);
    if (!loanType) {
      return NextResponse.json({ message: 'Tipo de préstamo no encontrado o inactivo' }, { status: 404 });
    }

    const totalAmount = principal_amount * (1 + (loanType.interest_percentage as number) / 100);
    
    const start = new Date(start_date + 'T12:00:00');
    const end = new Date(start_date + 'T12:00:00');
    end.setMonth(end.getMonth() + (loanType.duration_months as number));

    const result = await run(
      `INSERT INTO loans (client_id, operator_id, loan_type_id, principal_amount, total_amount, start_date, end_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'orden')`,
      [client_id, decoded.id, loan_type_id, principal_amount, totalAmount, start.toISOString(), end.toISOString()]
    );

    const numPayments = loanType.modality === 'daily' ? 20 : 4;
    const paymentAmount = totalAmount / numPayments;

    let currentDate = getNextBusinessDay(start);

    for (let i = 0; i < numPayments; i++) {
      await run(
        'INSERT INTO loan_payments (loan_id, payment_number, amount, due_date, is_paid) VALUES (?, ?, ?, ?, 0)',
        [result.lastID, i + 1, paymentAmount, currentDate.toISOString()]
      );
      currentDate = getNextBusinessDay(currentDate);
    }

    const loan = await get('SELECT * FROM loans WHERE id = ?', [result.lastID]);

    return NextResponse.json({
      message: 'Orden de préstamo creada exitosamente',
      loan
    }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error creating loan' }, { status: 500 });
  }
}
