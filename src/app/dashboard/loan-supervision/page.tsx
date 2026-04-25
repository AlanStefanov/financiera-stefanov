'use client';

import { useEffect, useState } from 'react';

interface Loan {
  id: number;
  client_name: string;
  operator_name: string;
  principal_amount: number;
  total_amount: number;
  status: string;
  fund_source: string;
  start_date: string;
  created_at: string;
}

export default function LoanSupervisionPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'financial' | 'collections'>('all');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedSource, setSelectedSource] = useState<string>('financial');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/loans', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLoans(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (loanId: number, currentSource: string) => {
    setEditingId(loanId);
    setSelectedSource(currentSource || 'financial');
  };

  const handleUpdateSource = async (loanId: number, newSource: string) => {
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/loans/${loanId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fund_source: newSource }),
      });
      
      if (res.ok) {
        setMessage('✓ Fuente actualizada');
        setEditingId(null);
        fetchLoans();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Error al actualizar');
      }
    } catch (error) {
      setMessage('Error al actualizar');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
  };

  const filteredLoans = filter === 'all' ? loans : loans.filter(l => l.fund_source === filter);

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title">Supervisión de Préstamos</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setFilter('all')} className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}>Todos</button>
          <button onClick={() => setFilter('financial')} className={`btn ${filter === 'financial' ? 'btn-primary' : 'btn-secondary'}`}>Financial</button>
          <button onClick={() => setFilter('collections')} className={`btn ${filter === 'collections' ? 'btn-primary' : 'btn-secondary'}`}>Cobranzas</button>
        </div>
      </div>

      {message && (
        <div style={{ padding: '1rem', borderRadius: '8px', marginBottom: '1rem', background: message.startsWith('✓') ? '#dcfce7' : '#fee2e2', color: message.startsWith('✓') ? '#16a34a' : '#dc2626' }}>
          {message}
        </div>
      )}

      <div className="card">
        <table className="table table-mobile-card">
          <thead>
            <tr>
              <th>ID</th>
              <th>Cliente</th>
              <th>Monto</th>
              <th>Estado</th>
              <th>Fuente</th>
              <th>Fecha</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filteredLoans.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center' }}>No hay préstamos</td>
              </tr>
            ) : (
              filteredLoans.map(loan => (
                <tr key={loan.id}>
                  <td data-label="ID">{loan.id}</td>
                  <td data-label="Cliente">{loan.client_name}</td>
                  <td data-label="Monto">{formatCurrency(loan.principal_amount)}</td>
                  <td data-label="Estado">
                    <span className={`badge ${loan.status === 'aprobado' ? 'badge-success' : loan.status === 'finalizado' ? 'badge-primary' : 'badge-warning'}`}>
                      {loan.status === 'orden' ? 'Orden' : loan.status === 'aprobado' ? 'Aprobado' : 'Finalizado'}
                    </span>
                  </td>
                  <td data-label="Fuente">
                    {editingId === loan.id ? (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select 
                          className="input" 
                          style={{ padding: '0.25rem', fontSize: '0.75rem' }}
                          value={selectedSource}
                          onChange={(e) => setSelectedSource(e.target.value)}
                        >
                          <option value="financial">Financial</option>
                          <option value="collections">Cobranzas</option>
                        </select>
                        <button onClick={() => handleUpdateSource(loan.id, selectedSource)} className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Guardar</button>
                        <button onClick={() => setEditingId(null)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>X</button>
                      </div>
                    ) : (
                      <span 
                        onClick={() => handleEdit(loan.id, loan.fund_source)} 
                        style={{ cursor: 'pointer' }}
                        className={`badge ${loan.fund_source === 'financial' ? 'badge-primary' : loan.fund_source === 'collections' ? 'badge-success' : 'badge-secondary'}`}
                      >
                        {loan.fund_source === 'financial' ? 'Financial' : loan.fund_source === 'collections' ? 'Cobranzas' : 'Sin definir'}
                      </span>
                    )}
                  </td>
                  <td data-label="Fecha">{new Date(loan.created_at).toLocaleDateString('es-AR')}</td>
                  <td data-label="Acción">
                    <button onClick={() => handleEdit(loan.id, loan.fund_source)} className="icon-action-button secondary" title="Editar fuente">✏️</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}