'use client';

import { useEffect, useState } from 'react';

interface User {
  role: string;
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User>({ role: 'operator' });
  const [activeTab, setActiveTab] = useState<'operators' | 'collections' | 'overdue'>('operators');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      if (parsed.role !== 'admin') {
        window.location.href = '/dashboard';
      }
    }
  }, []);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/reports', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok) {
          setReportData(data);
        } else {
          console.error('API error:', data);
        }
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value || 0);
  };

  if (loading) return <div>Cargando...</div>;
  if (!reportData) return <div>Error al cargar reportes</div>;

  const { operatorEarnings, collections, overduePayments, summary } = reportData;

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>Reportes</h1>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Préstamos</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{summary.totalLoans}</p>
          </div>
          <div>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Capital</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(summary.totalPrincipal)}</p>
          </div>
          <div>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Intereses</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>{formatCurrency(summary.totalInterest)}</p>
          </div>
          <div>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Pagos a Operadores</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{formatCurrency(summary.totalToPayOperators)}</p>
          </div>
          <div>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Pagos Atrasados</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger)' }}>{summary.overdueCount}</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={() => setActiveTab('operators')}
          className={`btn ${activeTab === 'operators' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Ganancias Operadores
        </button>
        <button
          onClick={() => setActiveTab('collections')}
          className={`btn ${activeTab === 'collections' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Cobros
        </button>
        <button
          onClick={() => setActiveTab('overdue')}
          className={`btn ${activeTab === 'overdue' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Atrasados
        </button>
      </div>

      {activeTab === 'operators' && (
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Ganancias por Operador</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>Operador</th>
                <th style={{ textAlign: 'right', padding: '0.75rem' }}>Préstamos</th>
                <th style={{ textAlign: 'right', padding: '0.75rem' }}>Capital</th>
                <th style={{ textAlign: 'right', padding: '0.75rem' }}>Interés Total</th>
                <th style={{ textAlign: 'right', padding: '0.75rem' }}>Ganancia Potencial</th>
                <th style={{ textAlign: 'right', padding: '0.75rem' }}>Ganancia Real</th>
              </tr>
            </thead>
            <tbody>
              {(operatorEarnings as any[]).map((op) => (
                <tr key={op.operator_id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem' }}>{op.operator_name} {op.operator_lastname}</td>
                  <td style={{ textAlign: 'right', padding: '0.75rem' }}>{op.total_loans || 0}</td>
                  <td style={{ textAlign: 'right', padding: '0.75rem' }}>{formatCurrency(op.total_principal)}</td>
                  <td style={{ textAlign: 'right', padding: '0.75rem' }}>{formatCurrency(op.total_interest)}</td>
                  <td style={{ textAlign: 'right', padding: '0.75rem', color: 'var(--success)' }}>{formatCurrency(op.potential_earnings)}</td>
                  <td style={{ textAlign: 'right', padding: '0.75rem', fontWeight: 'bold', color: 'var(--primary)' }}>{formatCurrency(op.actual_earnings)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'collections' && (
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Historial de Cobros</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>Cliente</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>Operador</th>
                <th style={{ textAlign: 'right', padding: '0.75rem' }}>Monto</th>
                <th style={{ textAlign: 'right', padding: '0.75rem' }}>Pagado</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>Vencimiento</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {(collections as any[]).slice(0, 50).map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem' }}>{c.client_name}</td>
                  <td style={{ padding: '0.75rem' }}>{c.operator_name}</td>
                  <td style={{ textAlign: 'right', padding: '0.75rem' }}>{formatCurrency(c.amount)}</td>
                  <td style={{ textAlign: 'right', padding: '0.75rem' }}>{formatCurrency(c.paid_amount)}</td>
                  <td style={{ padding: '0.75rem' }}>{new Date(c.due_date).toLocaleDateString('es-AR')}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '3px',
                      fontSize: '0.75rem',
                      background: c.is_paid ? '#dcfce7' : '#fee2e2',
                      color: c.is_paid ? '#16a34a' : '#dc2626',
                    }}>
                      {c.is_paid ? 'Pagado' : 'Pendiente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'overdue' && (
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--danger)' }}>Pagos Atrasados</h2>
          {(overduePayments as any[]).length === 0 ? (
            <p>No hay pagos atrasados</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem' }}>Cliente</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem' }}>Teléfono</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem' }}>Operador</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem' }}>Monto</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem' }}>Vencido</th>
                </tr>
              </thead>
              <tbody>
                {(overduePayments as any[]).map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem' }}>{p.client_name}</td>
                    <td style={{ padding: '0.75rem' }}>{p.client_phone}</td>
                    <td style={{ padding: '0.75rem' }}>{p.operator_name}</td>
                    <td style={{ textAlign: 'right', padding: '0.75rem', fontWeight: 'bold', color: 'var(--danger)' }}>{formatCurrency(p.amount)}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--danger)' }}>{new Date(p.due_date).toLocaleDateString('es-AR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}