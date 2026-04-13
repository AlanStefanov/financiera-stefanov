import { NextRequest, NextResponse } from 'next/server';
import { getDB, all, get } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await getDB();
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const decoded = jwt.verify(token, getJwtSecret()) as { role: string };
    if (decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Solo admins pueden acceder' }, { status: 403 });
    }

    const operatorEarnings = await all(`
      SELECT 
        u.id as operator_id,
        u.name as operator_name,
        u.lastname as operator_lastname,
        u.email as operator_email,
        COUNT(DISTINCT l.id) as total_loans,
        SUM(l.principal_amount) as total_principal,
        SUM(l.total_amount) as total_with_interest,
        SUM(l.total_amount - l.principal_amount) as total_interest,
        SUM((l.total_amount - l.principal_amount) * 0.5) as potential_earnings,
        SUM(CASE WHEN l.status = 'finalizado' THEN (l.total_amount - l.principal_amount) * 0.5 ELSE 0 END) as actual_earnings
      FROM users u
      LEFT JOIN loans l ON u.id = l.operator_id
      WHERE u.role = 'operator'
      GROUP BY u.id
      ORDER BY actual_earnings DESC
    `);

    const totalStats = await get(`
      SELECT 
        COUNT(DISTINCT l.id) as total_loans,
        SUM(l.principal_amount) as total_principal,
        SUM(l.total_amount) as total_with_interest,
        SUM(l.total_amount - l.principal_amount) as total_interest
      FROM loans l
    `);

    const collections = await all(`
      SELECT 
        lp.id,
        lp.loan_id,
        lp.amount,
        lp.paid_amount,
        lp.due_date,
        lp.paid_date,
        lp.is_paid,
        l.principal_amount,
        l.total_amount,
        c.name as client_name,
        c.phone as client_phone,
        u.name || ' ' || u.lastname as operator_name
      FROM loan_payments lp
      JOIN loans l ON lp.loan_id = l.id
      JOIN clients c ON l.client_id = c.id
      JOIN users u ON l.operator_id = u.id
      ORDER BY lp.due_date DESC
      LIMIT 100
    `);

    const overduePayments = await all(`
      SELECT 
        lp.id,
        lp.loan_id,
        lp.amount,
        lp.due_date,
        l.principal_amount,
        l.status,
        l.modality,
        c.name as client_name,
        c.phone as client_phone,
        u.name || ' ' || u.lastname as operator_name,
        u.email as operator_email
      FROM loan_payments lp
      JOIN loans l ON lp.loan_id = l.id
      JOIN clients c ON l.client_id = c.id
      JOIN users u ON l.operator_id = u.id
      WHERE lp.is_paid = 0 AND lp.due_date < datetime('now') AND l.status != 'orden'
      ORDER BY lp.due_date ASC
    `);

    return NextResponse.json({
      operatorEarnings,
      totalStats,
      collections,
      overduePayments,
      summary: {
        totalOperators: operatorEarnings.length,
        totalLoans: totalStats?.total_loans || 0,
        totalPrincipal: totalStats?.total_principal || 0,
        totalInterest: totalStats?.total_interest || 0,
        totalToPayOperators: (operatorEarnings as any[]).reduce((sum, o) => sum + (o.actual_earnings || 0), 0),
        overdueCount: overduePayments.length,
      }
    });
  } catch (error: any) {
    console.error('Error fetching reports:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error fetching reports: ' + (error.message || 'Error desconocido') }, { status: 500 });
  }
}