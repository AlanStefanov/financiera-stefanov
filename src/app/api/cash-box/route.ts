import { NextRequest, NextResponse } from 'next/server';
import { getDB, all, run, get } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_in_production';

const verifyUser = (token: string): { id: number; role: string } | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string };
    return decoded;
  } catch {
    return null;
  }
};

export async function GET(request: NextRequest) {
  try {
    await getDB();
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const user = verifyUser(token || '');
    if (!token || !user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    let cashBox;
    let totalDeposits;
    let totalCollections;
    let totalWithdrawn;
    let totalCollectedAll;
    let loansFromFinancial;
    let loansFromCollections;
    let totalEgresos;

    if (user.role === 'admin') {
      cashBox = await all(`
        SELECT cb.*, u.name as created_by_name 
        FROM cash_box cb 
        LEFT JOIN users u ON cb.created_by = u.id 
        ORDER BY cb.created_at DESC
      `);

      totalDeposits = await get(`
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM cash_box 
        WHERE type = 'deposit'
      `);
      
      totalCollections = await get(`
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM cash_box 
        WHERE type = 'collection'
      `);

      totalEgresos = await get(`
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM cash_box 
        WHERE is_egreso = 1
      `);

      totalWithdrawn = await get(`
        SELECT COALESCE(SUM(principal_amount), 0) as total 
        FROM loans 
        WHERE status IN ('aprobado', 'finalizado')
      `);

      totalCollectedAll = await get(`
        SELECT COALESCE(SUM(paid_amount), 0) as total 
        FROM loan_payments 
        WHERE is_paid = 1
      `);

      loansFromFinancial = await get(`
        SELECT COALESCE(SUM(principal_amount), 0) as total 
        FROM loans 
        WHERE fund_source = 'financial' AND status IN ('aprobado', 'finalizado')
      `);
      
      loansFromCollections = await get(`
        SELECT COALESCE(SUM(principal_amount), 0) as total 
        FROM loans 
        WHERE (fund_source = 'collections' OR fund_source IS NULL) AND status IN ('aprobado', 'finalizado')
      `);
    } else {
      cashBox = await all(`
        SELECT cb.*, u.name as created_by_name 
        FROM cash_box cb 
        LEFT JOIN users u ON cb.created_by = u.id 
        WHERE cb.created_by = ? OR cb.assigned_to = ?
        ORDER BY cb.created_at DESC
      `, [user.id, user.id]);

      totalDeposits = await get(`
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM cash_box 
        WHERE type = 'deposit' AND assigned_to = ?
      `, [user.id]);
      
      totalCollections = await get(`
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM cash_box 
        WHERE type = 'collection' AND created_by = ?
      `, [user.id]);

      totalEgresos = await get(`
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM cash_box 
        WHERE is_egreso = 1 AND (created_by = ? OR assigned_to = ?)
      `, [user.id, user.id]);

      totalWithdrawn = await get(`
        SELECT COALESCE(SUM(principal_amount), 0) as total 
        FROM loans 
        WHERE operator_id = ? AND status IN ('aprobado', 'finalizado')
      `, [user.id]);

      totalCollectedAll = await get(`
        SELECT COALESCE(SUM(paid_amount), 0) as total 
        FROM loan_payments lp 
        WHERE lp.paid_by = ? AND lp.is_paid = 1
      `, [user.id]);

      loansFromFinancial = await get(`
        SELECT COALESCE(SUM(principal_amount), 0) as total 
        FROM loans 
        WHERE operator_id = ? AND fund_source = 'financial' AND status IN ('aprobado', 'finalizado')
      `, [user.id]);
      
      loansFromCollections = await get(`
        SELECT COALESCE(SUM(principal_amount), 0) as total 
        FROM loans 
        WHERE operator_id = ? AND (fund_source = 'collections' OR fund_source IS NULL) AND status IN ('aprobado', 'finalizado')
      `, [user.id]);
    }

    const depositsTotal = Number(totalDeposits?.total || 0);
    const egresosTotal = Number(totalEgresos?.total || 0);
    const financialTotal = depositsTotal - egresosTotal;

    return NextResponse.json({
      movements: cashBox,
      totals: {
        financial: financialTotal,
        collections: totalCollections?.total || 0,
        withdrawn: totalWithdrawn?.total || 0,
        loans_from_financial: loansFromFinancial?.total || 0,
        loans_from_collections: loansFromCollections?.total || 0,
        collected_all: totalCollectedAll?.total || 0,
        deposits: depositsTotal,
        egresos: egresosTotal,
        available: 0,
        caja_completa: Number(totalCollectedAll?.total || 0) - Number(loansFromCollections?.total || 0) - egresosTotal
      }
    });
  } catch (error) {
    console.error('Error fetching cash box:', error);
    return NextResponse.json({ error: 'Error fetching cash box' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await getDB();
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const user = verifyUser(token || '');
    if (!user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, type, description, assigned_to, is_egreso } = body;

    const effectiveType = is_egreso ? 'withdrawal' : type;
    if (!amount || !effectiveType || !['deposit', 'collection', 'withdrawal'].includes(effectiveType)) {
      return NextResponse.json({ message: 'Datos inválidos' }, { status: 400 });
    }

    let assignedToUser = null;
    if (effectiveType === 'deposit' && user.role === 'admin' && assigned_to) {
      assignedToUser = assigned_to;
    } else if (effectiveType === 'deposit') {
      assignedToUser = user.id;
    }

    const egresoValue = is_egreso ? 1 : 0;

    await run(
      'INSERT INTO cash_box (amount, type, description, created_by, assigned_to, is_egreso) VALUES (?, ?, ?, ?, ?, ?)',
      [amount, effectiveType, description || null, user.id, assignedToUser, egresoValue]
    );

    return NextResponse.json({ message: 'Movimiento registrado' }, { status: 201 });
  } catch (error) {
    console.error('Error creating cash movement:', error);
    return NextResponse.json({ error: 'Error creating movement' }, { status: 500 });
  }
}