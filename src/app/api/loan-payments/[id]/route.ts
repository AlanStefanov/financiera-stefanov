import { NextRequest, NextResponse } from 'next/server';
import { getDB, get, run, all } from '@/lib/db';

export async function PUT(
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
    const body = await request.json();
    const { is_paid, partial_amount } = body;

    const payment = await get('SELECT * FROM loan_payments WHERE id = ?', [parseInt(id)]);
    if (!payment) {
      return NextResponse.json({ message: 'Pago no encontrado' }, { status: 404 });
    }

    const amount = payment.amount as number;
    const currentPaidAmount = (payment.paid_amount as number) || 0;

    if (partial_amount !== undefined && partial_amount > 0) {
      const newPaidAmount = currentPaidAmount + partial_amount;
      const newIsPaid = newPaidAmount >= amount ? 1 : 0;
      const paidDate = newIsPaid ? new Date().toISOString() : null;
      
      run('UPDATE loan_payments SET is_paid = ?, paid_amount = ?, paid_date = ? WHERE id = ?', 
        [newIsPaid, newPaidAmount, paidDate, parseInt(id)]);
    } else if (is_paid !== undefined) {
      if (is_paid && !payment.is_paid) {
        run('UPDATE loan_payments SET is_paid = 1, paid_amount = ?, paid_date = ? WHERE id = ?', 
          [amount, new Date().toISOString(), parseInt(id)]);
      } else if (!is_paid && payment.is_paid) {
        run('UPDATE loan_payments SET is_paid = 0, paid_amount = 0, paid_date = NULL WHERE id = ?', 
          [parseInt(id)]);
      }
    }

    const loanId = payment.loan_id;
    const allPayments = await all('SELECT COUNT(*) as total, SUM(CASE WHEN is_paid = 1 THEN 1 ELSE 0 END) as paid FROM loan_payments WHERE loan_id = ?', [loanId]);
    const firstPayment = allPayments[0];

    if (firstPayment && Number(firstPayment.total) === Number(firstPayment.paid) && Number(firstPayment.total) > 0) {
      await run('UPDATE loans SET status = ?, updated_at = ? WHERE id = ?', ['finalizado', new Date().toISOString(), loanId]);
    } else if (firstPayment && Number(firstPayment.paid) > 0) {
      await run('UPDATE loans SET status = ?, updated_at = ? WHERE id = ?', ['aprobado', new Date().toISOString(), loanId]);
    }

    const updatedPayment = await get('SELECT * FROM loan_payments WHERE id = ?', [parseInt(id)]);
    const payments = await all('SELECT * FROM loan_payments WHERE loan_id = ? ORDER BY payment_number', [loanId]);

    return NextResponse.json({
      message: 'Pago actualizado exitosamente',
      payment: updatedPayment,
      payments
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error updating payment' }, { status: 500 });
  }
}
