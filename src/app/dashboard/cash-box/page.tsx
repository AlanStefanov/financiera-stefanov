'use client';

import { useEffect, useState } from 'react';

interface CashBoxData {
  movements: any[];
  totals: {
    financial: number;
    collections: number;
    withdrawn: number;
    available: number;
    collected_all?: number;
    caja_completa?: number;
  };
}

interface User {
  role: string;
}

export default function CashBoxPage() {
  const [data, setData] = useState<CashBoxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: '', type: 'deposit', description: '' });
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<User>({ role: 'operator' });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    fetchCashBox();
  }, []);

  const fetchCashBox = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/cash-box', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setData(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/cash-box', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      });
      if (res.ok) {
        setMessage('✓ Movimiento registrado');
        setForm({ amount: '', type: 'deposit', description: '' });
        setShowForm(false);
        fetchCashBox();
      } else {
        setMessage('Error al registrar');
      }
    } catch (error) {
      setMessage('Error al registrar');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value || 0);
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title">Caja</h1>
        {user.role === 'admin' && (
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
            {showForm ? 'Cancelar' : 'Nuevo Movimiento'}
          </button>
        )}
      </div>

      {message && (
        <div style={{ padding: '1rem', borderRadius: '8px', marginBottom: '1rem', background: message.startsWith('✓') ? '#dcfce7' : '#fee2e2', color: message.startsWith('✓') ? '#16a34a' : '#dc2626' }}>
          {message}
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>Capital Financiera</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{formatCurrency(data?.totals.financial || 0)}</p>
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>Total Cobrado</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>{formatCurrency(data?.totals.collected_all || 0)}</p>
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>Préstamos Otorgados</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger)' }}>{formatCurrency(data?.totals.withdrawn || 0)}</p>
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>Disponible</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(data?.totals.available || 0)}</p>
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>Caja Completa</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(data?.totals.caja_completa || 0)}</p>
          </div>
        </div>
      </div>

      {showForm && user.role === 'admin' && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3>Nuevo Movimiento</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="deposit">Depósito (capital nueva)</option>
                  <option value="collection">Cobranza (dinero recuperado)</option>
                  <option value="withdrawal">Préstamo otortoado</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Monto</label>
                <input
                  type="number"
                  className="input"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Descripción</label>
                <input
                  type="text"
                  className="input"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Observación opcional"
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Registrar</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>Movimientos</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Monto</th>
              <th>Descripción</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            {data?.movements.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center' }}>Sin movimientos</td>
              </tr>
            ) : (
              data?.movements.map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.created_at).toLocaleDateString('es-AR')}</td>
                  <td>
                    <span className={`badge ${m.type === 'deposit' ? 'badge-primary' : m.type === 'collection' ? 'badge-success' : 'badge-warning'}`}>
                      {m.type === 'deposit' ? 'Depósito' : m.type === 'collection' ? 'Cobranza' : 'Préstamo'}
                    </span>
                  </td>
                  <td>{formatCurrency(m.amount)}</td>
                  <td>{m.description || '-'}</td>
                  <td>{m.created_by_name || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}