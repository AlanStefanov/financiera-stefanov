'use client';

import { useEffect, useState } from 'react';

interface Stats {
  totalClients: number;
  activeLoans: number;
  remainingPayments: number;
  totalLoaned: number;
  totalCollected: number;
  remainingToCollect: number;
  pendingLoans: number;
  overduePayments: number;
}

interface LoanType {
  id: number;
  name: string;
  modality: string;
  duration_months: number;
  interest_percentage: number;
}

interface User {
  role: string;
  id?: number;
}

interface OverduePayment {
  id: number;
  loan_id: number;
  payment_number: number;
  amount: number;
  due_date: string;
  client_name: string;
  client_phone: string;
  operator_id: number;
  operator_name: string;
}

interface OverdueLoanGroup {
  loanId: number;
  clientName: string;
  clientPhone: string;
  payments: OverduePayment[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ totalClients: 0, activeLoans: 0, remainingPayments: 0, totalLoaned: 0, totalCollected: 0, remainingToCollect: 0, pendingLoans: 0, overduePayments: 0 });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User>({ role: 'operator' });
  const [overduePayments, setOverduePayments] = useState<OverduePayment[]>([]);
  const [showOverdueModal, setShowOverdueModal] = useState(false);
  const [loanTypes, setLoanTypes] = useState<LoanType[]>([]);
  const [calcAmount, setCalcAmount] = useState('');
  const [calcType, setCalcType] = useState('');
  const [calcResult, setCalcResult] = useState<{ total: number; payment: number; installments: number } | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        const [clientsRes, loansRes, paymentsRes, overdueRes] = await Promise.all([
          fetch('/api/clients', { headers }),
          fetch('/api/loans', { headers }),
          fetch('/api/loan-payments', { headers }),
          fetch('/api/overdue-payments', { headers }),
        ]);

        const clients = clientsRes.ok ? await clientsRes.json() : [];
        const loans = loansRes.ok ? await loansRes.json() : [];
        const payments = paymentsRes.ok ? await paymentsRes.json() : [];
        const overdue = overdueRes.ok ? await overdueRes.json() : [];

        const activeAndApprovedLoans = Array.isArray(loans) 
          ? loans.filter((l: any) => l.status === 'aprobado') 
          : [];
        
        const activeLoansCount = activeAndApprovedLoans.length;
        
        const overduePaymentsCount = Array.isArray(overdue) ? overdue.length : 0;
        setOverduePayments(Array.isArray(overdue) ? overdue : []);
        
        const totalLoanedSum = activeAndApprovedLoans.reduce((sum: number, l: any) => {
          const principal = parseFloat(l.principal_amount) || 0;
          return sum + principal;
        }, 0);
        
        let totalCollectedSum = 0;
        let totalToCollectSum = 0;
        let remainingPaymentsCount = 0;

        for (const loan of activeAndApprovedLoans) {
          const loanId = loan.id;
          const loanTotal = parseFloat(loan.total_amount) || 0;
          
          const loanPayments = Array.isArray(payments) 
            ? payments.filter((p: any) => p.loan_id === loanId) 
            : [];
          
          const paidAmount = loanPayments.reduce((s: number, p: any) => {
            return s + (parseFloat(p.paid_amount) || 0);
          }, 0);
          
          totalCollectedSum += paidAmount;
          totalToCollectSum += Math.max(0, loanTotal - paidAmount);
          
          const remaining = loanPayments.filter((p: any) => !p.is_paid && (p.paid_amount || 0) === 0).length;
          remainingPaymentsCount += remaining;
        }

        const pendingLoansCount = Array.isArray(loans) ? loans.filter((l: any) => l.status === 'orden').length : 0;

        setStats({
          totalClients: Array.isArray(clients) ? clients.length : 0,
          activeLoans: activeLoansCount,
          remainingPayments: remainingPaymentsCount,
          totalLoaned: totalLoanedSum,
          totalCollected: totalCollectedSum,
          remainingToCollect: totalToCollectSum,
          pendingLoans: pendingLoansCount,
          overduePayments: overduePaymentsCount,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    const fetchLoanTypes = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/loan-types', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const types = await res.json();
          setLoanTypes(Array.isArray(types) ? types.filter((t: LoanType) => t.interest_percentage) : []);
        }
      } catch (error) {
        console.error('Error fetching loan types:', error);
      }
    };
    fetchLoanTypes();
  }, []);

  const calculateLoan = () => {
    const amount = parseFloat(calcAmount);
    const typeId = parseInt(calcType);
    if (!amount || !typeId || !loanTypes.length) return;

    const selectedType = loanTypes.find(t => t.id === typeId);
    if (!selectedType) return;

    const total = amount * (1 + selectedType.interest_percentage / 100);
    let installments = 1;
    if (selectedType.modality === 'daily') installments = 20;
    else if (selectedType.modality === 'weekly') installments = 4;
    else if (selectedType.modality === 'monthly') installments = Number(selectedType.duration_months);
    const payment = total / installments;

    setCalcResult({
      total,
      payment,
      installments
    });
  };

  if (loading) return <div className="empty-state">Cargando...</div>;

  const overdueByLoan: OverdueLoanGroup[] = Object.values(
    overduePayments.reduce((acc, payment) => {
      if (!acc[payment.loan_id]) {
        acc[payment.loan_id] = {
          loanId: payment.loan_id,
          clientName: payment.client_name,
          clientPhone: payment.client_phone,
          payments: [],
        };
      }
      acc[payment.loan_id].payments.push(payment);
      return acc;
    }, {} as Record<number, OverdueLoanGroup>)
  );

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>

      {user.role === 'admin' && stats.pendingLoans > 0 && (
        <div className="card" style={{ background: '#fef3c7', border: '1px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            <span style={{ color: '#92400e', fontWeight: '600' }}>
              Tienes {stats.pendingLoans} préstamo{stats.pendingLoans > 1 ? 's' : ''} pendiente{stats.pendingLoans > 1 ? 's' : ''} de aprobación
            </span>
          </div>
          <a href="/dashboard/loans" className="btn btn-secondary" style={{ background: '#d97706', color: 'white', border: 'none' }}>
            Ver Préstamos
          </a>
        </div>
      )}

      {/* Fila 1: Actividad operativa */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="card">
          <h3 className="form-label">Total Clientes</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalClients}</p>
        </div>
        <div className="card">
          <h3 className="form-label">Préstamos Activos</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{stats.activeLoans}</p>
        </div>
        <div className="card">
          <h3 className="form-label">Pagos Restantes</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>{stats.remainingPayments}</p>
        </div>
        {user.role !== 'admin' && stats.overduePayments > 0 && (
          <div className="card" style={{ border: '2px solid var(--danger)', background: '#fef2f2' }}>
            <h3 className="form-label" style={{ color: 'var(--danger)' }}>⚠️ Pagos Atrasados</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger)' }}>{stats.overduePayments}</p>
            <button
              onClick={() => setShowOverdueModal(true)}
              className="btn btn-secondary"
              style={{ color: 'var(--danger)', background: 'transparent', border: 'none', fontSize: '0.85rem', textDecoration: 'underline', marginTop: '0.5rem' }}
            >
              Ver detalles →
            </button>
          </div>
        )}
      </div>

      {showOverdueModal && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '1rem'
          }}
          onClick={() => setShowOverdueModal(false)}
        >
          <div
            className="card"
            style={{ maxWidth: '1100px', width: '100%', maxHeight: '85vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--danger)' }}>Pagos Atrasados ({stats.overduePayments})</h2>
              <button onClick={() => setShowOverdueModal(false)} className="btn btn-primary">✕</button>
            </div>

            {overdueByLoan.length === 0 ? (
              <p>No hay pagos atrasados para mostrar.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                {overdueByLoan.map((group) => (
                  <div key={group.loanId} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem' }}>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <div style={{ fontWeight: 700 }}>Préstamo #{group.loanId}</div>
                      <div><strong>Cliente:</strong> {group.clientName}</div>
                      <div><strong>Tel:</strong> {group.clientPhone}</div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <th style={{ textAlign: 'left', padding: '0.35rem 0' }}>Cuota</th>
                          <th style={{ textAlign: 'right', padding: '0.35rem 0' }}>Monto</th>
                          <th style={{ textAlign: 'right', padding: '0.35rem 0' }}>Venc.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.payments.map((p) => (
                          <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.35rem 0' }}>#{p.payment_number}</td>
                            <td style={{ textAlign: 'right', padding: '0.35rem 0', color: 'var(--danger)', fontWeight: 600 }}>
                              {formatCurrency(p.amount)}
                            </td>
                            <td style={{ textAlign: 'right', padding: '0.35rem 0' }}>
                              {new Date(p.due_date).toLocaleDateString('es-AR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Calculadora de Préstamos</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Monto</label>
            <input
              type="number"
              className="input"
              value={calcAmount}
              onChange={(e) => setCalcAmount(e.target.value)}
              placeholder="Monto a prestar"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Tipo de Préstamo</label>
            <select
              className="input"
              value={calcType}
              onChange={(e) => setCalcType(e.target.value)}
            >
              <option value="">Seleccionar tipo</option>
              {loanTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name} ({lt.modality}, {lt.interest_percentage}% interés)
                </option>
              ))}
            </select>
          </div>
          <div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={calculateLoan} disabled={!calcAmount || !calcType}>
              Calcular
            </button>
          </div>
        </div>
        {calcResult && (
          <div style={{ marginTop: '1.5rem' }}>
            <h4 style={{ marginBottom: '0.5rem' }}>Resultado</h4>
            <div>Total a pagar: <strong>{formatCurrency(calcResult.total)}</strong></div>
            <div>Cuotas: <strong>{calcResult.installments}</strong></div>
            <div>Monto por cuota: <strong>{formatCurrency(calcResult.payment)}</strong></div>
          </div>
        )}
      </div>

      {/* Fila 2: Resumen financiero */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
        <div className="card">
          <h3 className="form-label">Dinero Prestado</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{formatCurrency(stats.totalLoaned)}</p>
        </div>
        <div className="card">
          <h3 className="form-label">Total Cobrado</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>{formatCurrency(stats.totalCollected)}</p>
        </div>
        <div className="card">
          <h3 className="form-label">Por Cobrar</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>{formatCurrency(stats.remainingToCollect)}</p>
        </div>
      </div>

      {user.role !== 'admin' && (
        <EarningsCard userId={user.id} />
      )}
    </div>
  );
}

function EarningsCard({ userId }: { userId?: number }) {
  const [earnings, setEarnings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEarnings = async () => {
      if (!userId) return;
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/earnings', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setEarnings(data);
        }
      } catch (error) {
        console.error('Error fetching earnings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEarnings();
  }, [userId]);

  if (loading) return <div className="empty-state">Cargando...</div>;
  if (!earnings?.summary) return null;

  const { summary } = earnings;

  return (
    <div className="card" style={{ marginTop: '1.5rem', border: '2px solid var(--primary)' }}>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--primary)' }}>💰 Tus Ganancias</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Préstamos Realizados</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{summary.total_loans}</p>
        </div>
        <div>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Prestado</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(summary.total_principal)}</p>
        </div>
        <div>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Ganancia Potencial (50%)</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>{formatCurrency(summary.potential_earnings)}</p>
        </div>
        <div>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Ganancia Real (préstamos finalizados)</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{formatCurrency(summary.actual_earnings)}</p>
        </div>
      </div>
    </div>
  );
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
};
