import { NextRequest, NextResponse } from 'next/server';
import { getDB, get, run, all } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_in_production';

const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: number; role: string };
  } catch {
    return null;
  }
};

const getNextBusinessDay = (date: Date): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  while (next.getDay() === 0 || next.getDay() === 6) {
    next.setDate(next.getDate() + 1);
  }
  return next;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    await getDB();
    
    const loan = await get(`
      SELECT l.*, c.name as client_name, c.phone as client_phone, u.username as operator_name,
             lt.name as loan_type_name, lt.modality, lt.duration_months, lt.interest_percentage
      FROM loans l
      JOIN clients c ON l.client_id = c.id
      JOIN users u ON l.operator_id = u.id
      JOIN loan_types lt ON l.loan_type_id = lt.id
      WHERE l.id = ?
    `, [parseInt(id)]);

    if (!loan) {
      return NextResponse.json({ message: 'Préstamo no encontrado' }, { status: 404 });
    }

    const payments = await all('SELECT * FROM loan_payments WHERE loan_id = ? ORDER BY payment_number', [parseInt(id)]);

    return NextResponse.json({ loan, payments });
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching loan' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const user = verifyToken(token || '');
    
    if (!user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    await getDB();
    const body = await request.json();
    const { status, regenerate_payments, fund_source } = body;

    const loan = await get('SELECT * FROM loans WHERE id = ?', [parseInt(id)]);
    if (!loan) {
      return NextResponse.json({ message: 'Préstamo no encontrado' }, { status: 404 });
    }

    if (fund_source && user.role === 'admin') {
      const oldSource = loan.fund_source;
      
      await run('UPDATE loans SET fund_source = ?, updated_at = ? WHERE id = ?', [fund_source, new Date().toISOString(), parseInt(id)]);
      
      if (fund_source === 'financial' && oldSource !== 'financial') {
        await run('INSERT INTO cash_box (amount, type, description, created_by) VALUES (?, ?, ?, ?)',
          [loan.principal_amount, 'withdrawal', `Préstamo ${id} cambiado a Financial`, user.id]);
      } else if (fund_source === 'collections' && oldSource === 'financial') {
        await run('DELETE FROM cash_box WHERE description = ? AND type = ?',
          [`Préstamo ID ${id}`, 'withdrawal']);
      }
      
      return NextResponse.json({ message: 'Fuente actualizada' });
    }
    if (!loan) {
      return NextResponse.json({ message: 'Préstamo no encontrado' }, { status: 404 });
    }

    if (regenerate_payments && user.role === 'admin') {
      await run('DELETE FROM loan_payments WHERE loan_id = ?', [parseInt(id)]);
      
      const loanType = await get('SELECT * FROM loan_types WHERE id = ?', [loan.loan_type_id]);
      if (loanType) {
        const numPayments = loanType.modality === 'daily' ? 20 : loanType.modality === 'weekly' ? 4 : Number(loanType.duration_months);
        const paymentAmount = (loan.total_amount as number) / numPayments;
        const intervalDays = loanType.modality === 'weekly' ? 7 : loanType.modality === 'monthly' ? 28 : 1;
        const baseDate = loan.approved_at
          ? new Date(loan.approved_at as string)
          : (loan.status === 'aprobado' && loan.updated_at
            ? new Date(loan.updated_at as string)
            : new Date(loan.start_date as string));
        let currentDate = new Date(baseDate);
        currentDate = loanType.modality === 'daily'
          ? getNextBusinessDay(currentDate)
          : new Date(currentDate.setDate(currentDate.getDate() + intervalDays));

        for (let i = 0; i < numPayments; i++) {
          await run(
            'INSERT INTO loan_payments (loan_id, payment_number, amount, due_date, is_paid) VALUES (?, ?, ?, ?, 0)',
            [parseInt(id), i + 1, paymentAmount, currentDate.toISOString()]
          );
          currentDate = loanType.modality === 'daily'
            ? getNextBusinessDay(currentDate)
            : new Date(currentDate.setDate(currentDate.getDate() + intervalDays));
        }
      }
      
      const updatedLoan = await get('SELECT * FROM loans WHERE id = ?', [parseInt(id)]);
      const payments = await all('SELECT * FROM loan_payments WHERE loan_id = ? ORDER BY payment_number', [parseInt(id)]);
      
      return NextResponse.json({
        message: 'Cuotas regeneradas exitosamente',
        loan: updatedLoan,
        payments
      });
    }

    if (status) {
      if (status !== 'orden' && status !== 'aprobado' && status !== 'finalizado') {
        return NextResponse.json({ message: 'Estado inválido' }, { status: 400 });
      }

      if (user.role !== 'admin' && status === 'orden') {
        return NextResponse.json({ message: 'No autorizado para cambiar a orden' }, { status: 403 });
      }

      const currentLoan = await get('SELECT l.*, lt.duration_months FROM loans l JOIN loan_types lt ON l.loan_type_id = lt.id WHERE l.id = ?', [parseInt(id)]);
      
      const nowIso = new Date().toISOString();
      const isNewApproval = status === 'aprobado' && currentLoan?.status !== 'aprobado';
      const approvedAt = isNewApproval ? nowIso : (loan.approved_at as string | null);

      if (isNewApproval) {
        const approvalDate = new Date();
        const endDate = new Date(approvalDate);
        endDate.setMonth(endDate.getMonth() + Number(currentLoan?.duration_months || 1));
        await run(
          'UPDATE loans SET status = ?, updated_at = ?, approved_at = ?, start_date = ?, end_date = ? WHERE id = ?',
          [status, nowIso, approvedAt, approvalDate.toISOString(), endDate.toISOString(), parseInt(id)]
        );
      } else {
        await run('UPDATE loans SET status = ?, updated_at = ?, approved_at = ? WHERE id = ?', [status, nowIso, approvedAt, parseInt(id)]);
      }

      const existingPayments = await all('SELECT COUNT(*) as count FROM loan_payments WHERE loan_id = ?', [parseInt(id)]);
      
      const shouldGenerateApprovalSchedule =
        status === 'aprobado' && (currentLoan?.status === 'orden' || Number(existingPayments[0]?.count || 0) === 0);

      if (shouldGenerateApprovalSchedule) {
        const loanType = await get('SELECT * FROM loan_types WHERE id = ?', [currentLoan?.loan_type_id]);
        if (loanType) {
          await run('DELETE FROM loan_payments WHERE loan_id = ?', [parseInt(id)]);

          const numPayments = loanType.modality === 'daily' ? 20 : loanType.modality === 'weekly' ? 4 : Number(loanType.duration_months);
          const paymentAmount = (currentLoan?.total_amount as number) / numPayments;
          const intervalDays = loanType.modality === 'weekly' ? 7 : loanType.modality === 'monthly' ? 28 : 1;
          
          let currentDate = new Date();
          currentDate = loanType.modality === 'daily'
            ? getNextBusinessDay(currentDate)
            : new Date(currentDate.setDate(currentDate.getDate() + intervalDays));

          for (let i = 0; i < numPayments; i++) {
            await run(
              'INSERT INTO loan_payments (loan_id, payment_number, amount, due_date, is_paid) VALUES (?, ?, ?, ?, 0)',
              [parseInt(id), i + 1, paymentAmount, currentDate.toISOString()]
            );
            currentDate = loanType.modality === 'daily'
              ? getNextBusinessDay(currentDate)
              : new Date(currentDate.setDate(currentDate.getDate() + intervalDays));
          }
        }
      }
    }

    const updatedLoan = await get('SELECT * FROM loans WHERE id = ?', [parseInt(id)]);
    const payments = await all('SELECT * FROM loan_payments WHERE loan_id = ? ORDER BY payment_number', [parseInt(id)]);

    return NextResponse.json({
      message: 'Préstamo actualizado exitosamente',
      loan: updatedLoan,
      payments
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error updating loan' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const user = verifyToken(token || '');
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    await getDB();
    run('DELETE FROM loan_payments WHERE loan_id = ?', [parseInt(id)]);
    run('DELETE FROM loans WHERE id = ?', [parseInt(id)]);

    return NextResponse.json({ message: 'Préstamo eliminado exitosamente' });
  } catch (error) {
    return NextResponse.json({ error: 'Error deleting loan' }, { status: 500 });
  }
}
