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
      SELECT l.*, c.name as client_name, c.phone as client_phone, u.name || ' ' || u.lastname as operator_name,
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
    const { client_id, loan_type_id, principal_amount, start_date, regenerate_payments } = body;

    console.log('Creating loan:', { client_id, loan_type_id, principal_amount, start_date });

    if (regenerate_payments && client_id) {
      const existingLoan = await get('SELECT l.*, lt.modality FROM loans l JOIN loan_types lt ON l.loan_type_id = lt.id WHERE l.client_id = ? AND l.status = ? ORDER BY l.id DESC LIMIT 1', [client_id, 'orden']);
      if (!existingLoan) {
        return NextResponse.json({ message: 'No hay préstamo en estado orden para este cliente' }, { status: 404 });
      }

      const loanType = await get('SELECT * FROM loan_types WHERE id = ?', [existingLoan.loan_type_id]);
      if (!loanType) {
        return NextResponse.json({ message: 'Tipo de préstamo no encontrado' }, { status: 404 });
      }

      await run('DELETE FROM loan_payments WHERE loan_id = ?', [existingLoan.id]);

      const numPayments = Number(loanType.modality === 'daily' ? 20 : loanType.modality === 'weekly' ? 4 : loanType.duration_months);
      const paymentAmount = Number(existingLoan.total_amount) / numPayments;

      let currentDate = new Date(existingLoan.start_date as string);
      if (loanType.modality === 'weekly') {
        while (currentDate.getDay() !== 5) {
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else if (loanType.modality === 'daily') {
        currentDate = getNextBusinessDay(new Date(existingLoan.start_date as string));
      }

      for (let i = 0; i < numPayments; i++) {
        await run(
          'INSERT INTO loan_payments (loan_id, payment_number, amount, due_date, is_paid) VALUES (?, ?, ?, ?, 0)',
          [existingLoan.id, i + 1, paymentAmount, currentDate.toISOString()]
        );
        if (loanType.modality === 'weekly') {
          while (currentDate.getDay() !== 5) {
            currentDate.setDate(currentDate.getDate() + 1);
          }
        } else if (loanType.modality === 'daily') {
          currentDate = getNextBusinessDay(currentDate);
        } else {
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      }

      const loan = await get('SELECT * FROM loans WHERE id = ?', [existingLoan.id]);
      return NextResponse.json({
        message: 'Cuotas regeneradas exitosamente',
        loan
      });
    }

    if (!client_id || !loan_type_id || !principal_amount || !start_date) {
      return NextResponse.json({ message: 'Faltan campos requeridos' }, { status: 400 });
    }

    if (principal_amount > 500000) {
      return NextResponse.json({ message: 'El monto máximo del préstamo es $500.000' }, { status: 400 });
    }

    const client = await get('SELECT id, credit_limit FROM clients WHERE id = ?', [client_id]);
    if (!client) {
      return NextResponse.json({ message: 'Cliente no encontrado' }, { status: 404 });
    }

    const creditLimit = (client.credit_limit || 500000) as number;
    if (principal_amount > creditLimit) {
      return NextResponse.json({ message: `El monto supera el límite de crédito del cliente ($${creditLimit.toLocaleString()})` }, { status: 400 });
    }

    const loanType = await get('SELECT * FROM loan_types WHERE id = ? AND is_active = 1', [loan_type_id]);
    if (!loanType) {
      return NextResponse.json({ message: 'Tipo de préstamo no encontrado o inactivo' }, { status: 404 });
    }

    const totalAmount = principal_amount * (1 + (loanType.interest_percentage as number) / 100);
    
    console.log('Loan data:', { 
      client_id, 
      operator_id: decoded.id, 
      loan_type_id, 
      principal_amount, 
      totalAmount 
    });

    // Verify foreign keys exist
    const clientExists = await get('SELECT id FROM clients WHERE id = ?', [client_id]);
    const operatorExists = await get('SELECT id FROM users WHERE id = ?', [decoded.id]);
    const loanTypeExists = await get('SELECT id FROM loan_types WHERE id = ?', [loan_type_id]);
    
    console.log('FK check:', { clientExists, operatorExists, loanTypeExists });

    const start = new Date(start_date + 'T12:00:00');
    const end = new Date(start_date + 'T12:00:00');
    end.setMonth(end.getMonth() + (loanType.duration_months as number));

    const result = await run(
      `INSERT INTO loans (client_id, operator_id, loan_type_id, principal_amount, total_amount, start_date, end_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'orden')`,
      [client_id, decoded.id, loan_type_id, principal_amount, totalAmount, start.toISOString(), end.toISOString()]
    );

    const numPayments = Number(loanType.modality === 'daily' ? 20 : loanType.modality === 'weekly' ? 4 : loanType.duration_months);
    const paymentAmount = totalAmount / numPayments;

    let currentDate = new Date(start);
    currentDate.setDate(currentDate.getDate() + 1);
    if (loanType.modality === 'weekly') {
      while (currentDate.getDay() !== 5) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else if (loanType.modality === 'daily') {
      while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    for (let i = 0; i < numPayments; i++) {
      await run(
        'INSERT INTO loan_payments (loan_id, payment_number, amount, due_date, is_paid) VALUES (?, ?, ?, ?, 0)',
        [result.lastID, i + 1, paymentAmount, currentDate.toISOString()]
      );
      if (loanType.modality === 'weekly') {
        while (currentDate.getDay() !== 5) {
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else if (loanType.modality === 'daily') {
        currentDate = getNextBusinessDay(currentDate);
      } else {
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }

    const loan = await get('SELECT * FROM loans WHERE id = ?', [result.lastID]);

    return NextResponse.json({
      message: 'Orden de préstamo creada exitosamente',
      loan
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating loan:', error);
    return NextResponse.json({ message: 'Error al crear préstamo: ' + (error.message || 'Error desconocido') }, { status: 500 });
  }
}
