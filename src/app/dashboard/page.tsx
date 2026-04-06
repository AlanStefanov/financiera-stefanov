'use client';

import { useEffect, useState } from 'react';

interface Stats {
  totalClients: number;
  activeLoans: number;
  totalPayments: number;
  totalLoaned: number;
  totalCollected: number;
  remainingToCollect: number;
}

interface User {
  role: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ totalClients: 0, activeLoans: 0, totalPayments: 0, totalLoaned: 0, totalCollected: 0, remainingToCollect: 0 });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User>({ role: 'operator' });

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

        const activeLoans = activeAndApprovedLoans.filter((l: any) => l.status === 'active').length;

        setStats({
          totalClients: Array.isArray(clients) ? clients.length : 0,
          activeLoans,
          remainingPayments,
          totalLoaned,
          totalCollected,
          remainingToCollect: totalToCollect,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>Dashboard</h1>
      
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
