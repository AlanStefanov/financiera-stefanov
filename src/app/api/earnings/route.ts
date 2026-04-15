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

    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string };
    
    let query = '';
    let params: any[] = [];
    
    if (decoded.role === 'admin') {
      query = `
        SELECT 
          u.id as operator_id,
          u.name as operator_name,
          u.lastname as operator_lastname,
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
      `;
    } else {
      query = `
        SELECT 
          l.id as loan_id,
          l.principal_amount,
          l.total_amount,
          (l.total_amount - l.principal_amount) as interest,
          (l.total_amount - l.principal_amount) * 0.5 as potential_earnings,
          CASE WHEN l.status = 'finalizado' THEN (l.total_amount - l.principal_amount) * 0.5 ELSE 0 END as actual_earnings,
          l.status,
          c.name as client_name,
          lt.name as loan_type_name
        FROM loans l
        JOIN clients c ON l.client_id = c.id
        JOIN loan_types lt ON l.loan_type_id = lt.id
        WHERE l.operator_id = ?
        ORDER BY l.created_at DESC
      `;
      params = [decoded.id];
    }

    const results = params.length > 0 ? await all(query, params) : await all(query);
    
    const summary = decoded.role !== 'admin' ? {
      total_loans: 0,
      total_principal: 0,
      total_with_interest: 0,
      total_interest: 0,
      potential_earnings: 0,
      actual_earnings: 0,
    } : null;

    if (decoded.role !== 'admin' && summary) {
      const loans = results as any[];
      summary.total_loans = loans.length;
      summary.total_principal = loans.reduce((sum, l) => sum + (l.principal_amount || 0), 0);
      summary.total_with_interest = loans.reduce((sum, l) => sum + (l.total_amount || 0), 0);
      summary.total_interest = loans.reduce((sum, l) => sum + (l.interest || 0), 0);
      summary.potential_earnings = loans.reduce((sum, l) => sum + (l.potential_earnings || 0), 0);
      summary.actual_earnings = loans.reduce((sum, l) => sum + (l.actual_earnings || 0), 0);
    }

    return NextResponse.json({ 
      data: results,
      summary
    });
  } catch (error) {
    console.error('Error calculating earnings:', error);
    return NextResponse.json({ error: 'Error calculating earnings' }, { status: 500 });
  }
}