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
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ totalClients: 0, activeLoans: 0, remainingPayments: 0, totalLoaned: 0, totalCollected: 0, remainingToCollect: 0, pendingLoans: 0 });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User>({ role: 'operator' });
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

        const [clientsRes, loansRes, paymentsRes] = await Promise.all([
          fetch('/api/clients', { headers }),
          fetch('/api/loans', { headers }),
          fetch('/api/loan-payments', { headers }),
        ]);

        const clients = clientsRes.ok ? await clientsRes.json() : [];
        const loans = loansRes.ok ? await loansRes.json() : [];
        const payments = paymentsRes.ok ? await paymentsRes.json() : [];

        const activeAndApprovedLoans = Array.isArray(loans) 
          ? loans.filter((l: any) => l.status === 'active' || l.status === 'aprobado') 
          : [];
        
        const totalLoaned = activeAndApprovedLoans.reduce((sum: number, l: any) => {
          const principal = parseFloat(l.principal_amount) || 0;
          return sum + principal;
        }, 0);
        
        let totalCollected = 0;
        let totalToCollect = 0;
        let remainingPayments = 0;

        for (const loan of activeAndApprovedLoans) {
          const loanId = loan.id;
          const loanTotal = parseFloat(loan.total_amount) || 0;
          
          const loanPayments = Array.isArray(payments) 
            ? payments.filter((p: any) => p.loan_id === loanId) 
            : [];
          
          const paidAmount = loanPayments.reduce((s: number, p: any) => {
            return s + (parseFloat(p.paid_amount) || 0);
          }, 0);
          
          totalCollected += paidAmount;
          totalToCollect += Math.max(0, loanTotal - paidAmount);
          
          const remaining = loanPayments.filter((p: any) => !p.is_paid && (p.paid_amount || 0) === 0).length;
          remainingPayments += remaining;
        }

        const activeLoans = activeAndApprovedLoans.length;
        const pendingLoans = Array.isArray(loans) ? loans.filter((l: any) => l.status === 'orden').length : 0;

        setStats({
          totalClients: Array.isArray(clients) ? clients.length : 0,
          activeLoans,
          remainingPayments,
          totalLoaned,
          totalCollected,
          remainingToCollect: totalToCollect,
          pendingLoans,
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
  };

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

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>Dashboard</h1>

      {user.role === 'admin' && stats.pendingLoans > 0 && (
        <div style={{ 
          background: '#fef3c7', 
          border: '1px solid #f59e0b', 
          borderRadius: 'var(--radius)', 
          padding: '1rem', 
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            <span style={{ color: '#92400e', fontWeight: '600' }}>
              Tienes {stats.pendingLoans} préstamo{stats.pendingLoans > 1 ? 's' : ''} pendiente{stats.pendingLoans > 1 ? 's' : ''} de aprobación
            </span>
          </div>
          <a href="/dashboard/loans" style={{ 
            background: '#d97706', 
            color: 'white', 
            padding: '0.5rem 1rem', 
            borderRadius: 'var(--radius)',
            textDecoration: 'none',
            fontWeight: '500',
            fontSize: '0.875rem'
          }}>
            Ver Préstamos
          </a>
        </div>
      )}
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
        <div className="card">
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Clientes</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalClients}</p>
        </div>
        
        <div className="card">
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Préstamos Activos</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{stats.activeLoans}</p>
        </div>
        
        <div className="card">
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Pagos Restantes</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>{stats.remainingPayments}</p>
        </div>
      </div>

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
              {loanTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.interest_percentage}% interés)
                </option>
              ))}
            </select>
          </div>
          <button onClick={calculateLoan} className="btn btn-primary">
            Calcular
          </button>
        </div>

        {calcResult && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '1rem', 
            background: 'var(--background)', 
            borderRadius: 'var(--radius)',
            border: '1px solid var(--primary)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
              <div>Monto solicitado:</div>
              <div style={{ fontWeight: 'bold' }}>{formatCurrency(parseFloat(calcAmount))}</div>
              <div>Total a pagar:</div>
              <div style={{ fontWeight: 'bold', color: 'var(--danger)' }}>{formatCurrency(calcResult.total)}</div>
              <div>Número de cuotas:</div>
              <div>{calcResult.installments} cuotas</div>
              <div>Valor de cada cuota:</div>
              <div style={{ fontWeight: 'bold', color: 'var(--success)' }}>{formatCurrency(calcResult.payment)}</div>
            </div>
          </div>
        )}
      </div>

      {user.role === 'admin' && (
        <div style={{ marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Resumen Financiero</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div className="card">
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Prestado</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger)' }}>{formatCurrency(stats.totalLoaned)}</p>
            </div>
            
            <div className="card">
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Cobrado</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>{formatCurrency(stats.totalCollected)}</p>
            </div>
            
            <div className="card">
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Falta Cobrar</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--warning)' }}>{formatCurrency(stats.remainingToCollect)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
