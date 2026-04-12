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
    const { status, regenerate_payments } = body;

    const loan = await get('SELECT * FROM loans WHERE id = ?', [parseInt(id)]);
    if (!loan) {
      return NextResponse.json({ message: 'Préstamo no encontrado' }, { status: 404 });
    }

    if (regenerate_payments && user.role === 'admin') {
      await run('DELETE FROM loan_payments WHERE loan_id = ?', [parseInt(id)]);
      
      const loanType = await get('SELECT * FROM loan_types WHERE id = ?', [loan.loan_type_id]);
      if (loanType) {
        const numPayments = loanType.modality === 'daily' ? 20 : 4;
        const paymentAmount = (loan.total_amount as number) / numPayments;
        
        let currentDate = new Date(loan.start_date as string);
        
        if (loanType.modality === 'weekly') {
          while (currentDate.getDay() !== 5) {
            currentDate.setDate(currentDate.getDate() + 1);
          }
        } else {
          currentDate.setDate(currentDate.getDate() + 1);
          while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }

        for (let i = 0; i < numPayments; i++) {
          run(
            'INSERT INTO loan_payments (loan_id, payment_number, amount, due_date, is_paid) VALUES (?, ?, ?, ?, 0)',
            [parseInt(id), i + 1, paymentAmount, currentDate.toISOString()]
          );
          currentDate.setDate(currentDate.getDate() + 1);
          if (loanType.modality === 'weekly') {
            while (currentDate.getDay() !== 5) {
              currentDate.setDate(currentDate.getDate() + 1);
            }
          } else {
            while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
              currentDate.setDate(currentDate.getDate() + 1);
            }
          }
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

      const currentLoan = await get('SELECT * FROM loans WHERE id = ?', [parseInt(id)]);
      
      run('UPDATE loans SET status = ?, updated_at = ? WHERE id = ?', [status, new Date().toISOString(), parseInt(id)]);

      const existingPayments = await all('SELECT COUNT(*) as count FROM loan_payments WHERE loan_id = ?', [parseInt(id)]);
      
      if (status === 'aprobado' && existingPayments[0]?.count === 0) {
        const loanType = await get('SELECT * FROM loan_types WHERE id = ?', [currentLoan?.loan_type_id]);
        if (loanType) {
          const numPayments = loanType.modality === 'daily' ? 20 : 4;
          const paymentAmount = (currentLoan?.total_amount as number) / numPayments;
          
          let currentDate = new Date();
          currentDate.setDate(currentDate.getDate() + 1);
          
          if (loanType.modality === 'weekly') {
            while (currentDate.getDay() !== 5) {
              currentDate.setDate(currentDate.getDate() + 1);
            }
          } else {
            while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
              currentDate.setDate(currentDate.getDate() + 1);
            }
          }

          for (let i = 0; i < numPayments; i++) {
            run(
              'INSERT INTO loan_payments (loan_id, payment_number, amount, due_date, is_paid) VALUES (?, ?, ?, ?, 0)',
              [parseInt(id), i + 1, paymentAmount, currentDate.toISOString()]
            );
            currentDate.setDate(currentDate.getDate() + 1);
            if (loanType.modality === 'weekly') {
              while (currentDate.getDay() !== 5) {
                currentDate.setDate(currentDate.getDate() + 1);
              }
            } else {
              while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
                currentDate.setDate(currentDate.getDate() + 1);
              }
            }
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
