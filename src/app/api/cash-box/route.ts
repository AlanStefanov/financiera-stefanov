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
    let totalFinancial;
    let totalCollections;
    let totalWithdrawn;
    let totalCollectedAll;
    let loansFromFinancial;
    let loansFromCollections;

    if (user.role === 'admin') {
      cashBox = await all(`
        SELECT cb.*, u.name as created_by_name 
        FROM cash_box cb 
        LEFT JOIN users u ON cb.created_by = u.id 
        ORDER BY cb.created_at DESC
      `);

      totalFinancial = await get(`
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM cash_box 
        WHERE type = 'deposit'
      `);
      
      totalCollections = await get(`
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM cash_box 
        WHERE type = 'collection'
      `);

      totalWithdrawn = await get(`
        SELECT COALESCE(SUM(principal_amount), 0) as total 
        FROM loans 
        WHERE status = 'aprobado'
      `);

      totalCollectedAll = await get(`
        SELECT COALESCE(SUM(paid_amount), 0) as total 
        FROM loan_payments 
        WHERE is_paid = 1
      `);

      loansFromFinancial = await get(`
        SELECT COALESCE(SUM(principal_amount), 0) as total 
        FROM loans 
        WHERE fund_source = 'financial'
      `);
      
      loansFromCollections = await get(`
        SELECT COALESCE(SUM(principal_amount), 0) as total 
        FROM loans 
        WHERE fund_source = 'collections' OR fund_source IS NULL
      `);
    } else {
      cashBox = await all(`
        SELECT cb.*, u.name as created_by_name 
        FROM cash_box cb 
        LEFT JOIN users u ON cb.created_by = u.id 
        WHERE cb.created_by = ?
        ORDER BY cb.created_at DESC
      `, [user.id]);

      totalFinancial = await get(`
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM cash_box 
        WHERE type = 'deposit' AND created_by = ?
      `, [user.id]);
      
      totalCollections = await get(`
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM cash_box 
        WHERE type = 'collection' AND created_by = ?
      `, [user.id]);

      totalWithdrawn = await get(`
        SELECT COALESCE(SUM(principal_amount), 0) as total 
        FROM loans 
        WHERE operator_id = ? AND status = 'aprobado'
      `, [user.id]);

      totalCollectedAll = await get(`
        SELECT COALESCE(SUM(lp.paid_amount), 0) as total 
        FROM loan_payments lp 
        JOIN loans l ON lp.loan_id = l.id 
        WHERE l.operator_id = ? AND lp.is_paid = 1
      `, [user.id]);

      loansFromFinancial = await get(`
        SELECT COALESCE(SUM(principal_amount), 0) as total 
        FROM loans 
        WHERE operator_id = ? AND fund_source = 'financial'
      `, [user.id]);
      
      loansFromCollections = await get(`
        SELECT COALESCE(SUM(principal_amount), 0) as total 
        FROM loans 
        WHERE operator_id = ? AND (fund_source = 'collections' OR fund_source IS NULL)
      `, [user.id]);
    }

    return NextResponse.json({
      movements: cashBox,
      totals: {
        financial: totalFinancial?.total || 0,
        collections: totalCollections?.total || 0,
        withdrawn: totalWithdrawn?.total || 0,
        loans_from_financial: loansFromFinancial?.total || 0,
        loans_from_collections: loansFromCollections?.total || 0,
        collected_all: totalCollectedAll?.total || 0,
        available: Number(totalFinancial?.total || 0) - Number(totalWithdrawn?.total || 0),
        caja_completa: (Number(totalFinancial?.total || 0) - Number(totalWithdrawn?.total || 0)) + Number(totalCollectedAll?.total || 0)
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
    const { amount, type, description } = body;

    if (!amount || !type || !['deposit', 'collection', 'withdrawal'].includes(type)) {
      return NextResponse.json({ message: 'Datos inválidos' }, { status: 400 });
    }

    await run(
      'INSERT INTO cash_box (amount, type, description, created_by) VALUES (?, ?, ?, ?)',
      [amount, type, description || null, user.id]
    );

    return NextResponse.json({ message: 'Movimiento registrado' }, { status: 201 });
  } catch (error) {
    console.error('Error creating cash movement:', error);
    return NextResponse.json({ error: 'Error creating movement' }, { status: 500 });
  }
}