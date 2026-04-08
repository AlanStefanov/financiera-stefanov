'use client';

import { useEffect, useState } from 'react';

interface Loan {
  id: number;
  client_id: number;
  client_name: string;
  client_phone: string;
  principal_amount: number;
  total_amount: number;
  start_date: string;
  end_date: string;
  status: string;
  operator_name: string;
  loan_type_name: string;
  modality: string;
  duration_months: number;
  interest_percentage: number;
  payment_count?: number;
  paid_count?: number;
}

interface LoanPayment {
  id: number;
  loan_id: number;
  payment_number: number;
  amount: number;
  due_date: string;
  is_paid: number;
  paid_date?: string;
  paid_amount?: number;
}

interface Client {
  id: number;
  name: string;
}

interface LoanType {
  id: number;
  name: string;
  modality: string;
  duration_months: number;
  interest_percentage: number;
  is_active?: number;
}

interface User {
  role: string;
}

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loanTypes, setLoanTypes] = useState<LoanType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [loanPayments, setLoanPayments] = useState<LoanPayment[]>([]);
  const [user, setUser] = useState<User>({ role: 'operator' });
  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({ client_id: '', loan_type_id: '', principal_amount: '', start_date: today });
  const [partialPayment, setPartialPayment] = useState<{ payment: LoanPayment; amount: string } | null>(null);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [loansRes, clientsRes, typesRes] = await Promise.all([
        fetch('/api/loans', { headers }),
        fetch('/api/clients', { headers }),
        fetch('/api/loan-types', { headers }),
      ]);

      if (loansRes.ok) setLoans(await loansRes.json());
      if (clientsRes.ok) setClients(await clientsRes.json());
      if (typesRes.ok) {
        const types = await typesRes.json();
        setLoanTypes(Array.isArray(types) ? types.filter((t: LoanType) => t.is_active) : []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          client_id: parseInt(formData.client_id),
          loan_type_id: parseInt(formData.loan_type_id),
          principal_amount: parseFloat(formData.principal_amount),
          start_date: formData.start_date,
        }),
      });

      if (res.ok) {
        setFormData({ client_id: '', loan_type_id: '', principal_amount: '', start_date: '' });
        setShowForm(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error creating loan:', error);
    }
  };

  const handleViewPayments = async (loan: Loan) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/loans/${loan.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedLoan(data.loan);
        setLoanPayments(data.payments);
      }
    } catch (error) {
      console.error('Error fetching loan payments:', error);
    }
  };

  const handleTogglePayment = async (paymentId: number, currentStatus: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/loan-payments/${paymentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_paid: currentStatus === 0 ? 1 : 0 }),
      });
      if (res.ok) {
        const data = await res.json();
        setLoanPayments(data.payments);
        fetchData();
      }
    } catch (error) {
      console.error('Error toggling payment:', error);
    }
  };

  const handlePartialPayment = async () => {
    if (!partialPayment) return;
    const amount = parseFloat(partialPayment.amount);
    if (isNaN(amount) || amount <= 0) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/loan-payments/${partialPayment.payment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_paid: 0, partial_amount: amount }),
      });
      if (res.ok) {
        const data = await res.json();
        setLoanPayments(data.payments);
        setPartialPayment(null);
        fetchData();
      }
    } catch (error) {
      console.error('Error processing partial payment:', error);
    }
  };

  const handleUpdateStatus = async (loanId: number, newStatus: string) => {
    const loan = loans.find(l => l.id === loanId);
    
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/loans/${loanId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchData();
      if (selectedLoan?.id === loanId) {
        handleViewPayments({ ...selectedLoan, status: newStatus } as Loan);
      }
      
      if (newStatus === 'aprobado' && loan) {
        const phone = loan.client_phone.replace(/\D/g, '');
        const installments = loan.modality === 'daily' ? 20 : 4;
        const installmentAmount = Math.round(loan.total_amount / installments);
        const modalityText = loan.modality === 'daily' ? 'Pago Diario' : 'Pago Semanal';
        const endDate = loan.end_date ? new Date(loan.end_date).toLocaleDateString('es-AR') : 'N/A';
        const operatorName = loan.operator_name || 'el operador';
        const message = `¡Hola ${loan.client_name}! Tu préstamo ha sido aprobado.\n\nMonto: $${loan.principal_amount.toLocaleString()}\nTotal: $${loan.total_amount.toLocaleString()}\nTipo: ${modalityText}\nCuotas: ${installments} de $${installmentAmount.toLocaleString()}\nFecha de fin: ${endDate}\n\nSu operador de créditos es: ${operatorName}. Comuníquese con él para gestionar los pagos.\n\nGracias por confiar en Microcréditos Stefanov.`;
        window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, '_blank');
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDeleteLoan = async (loanId: number) => {
    if (!confirm('¿Estás seguro de eliminar este préstamo? Esta acción no se puede deshacer.')) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/loans/${loanId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchData();
        if (selectedLoan?.id === loanId) {
          setSelectedLoan(null);
        }
      }
    } catch (error) {
      console.error('Error deleting loan:', error);
    }
  };

  const handleRegeneratePayments = async (loanId: number) => {
    if (!confirm('¿Regenerar cuotas? Esto eliminará las cuotas actuales y creará nuevas con las fechas correctas según el tipo de préstamo.')) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/loans/${loanId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ regenerate_payments: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setLoanPayments(data.payments);
        fetchData();
        if (selectedLoan?.id === loanId) {
          handleViewPayments({ ...selectedLoan, id: loanId } as Loan);
        }
        alert('Cuotas regeneradas correctamente');
      }
    } catch (error) {
      console.error('Error regenerating payments:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'orden': return { bg: '#fef3c7', color: '#d97706' };
      case 'aprobado': return { bg: '#dbeafe', color: '#2563eb' };
      case 'finalizado': return { bg: '#dcfce7', color: '#16a34a' };
      default: return { bg: '#f1f5f9', color: '#64748b' };
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Préstamos</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? 'Cancelar' : 'Nuevo Préstamo'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Cliente</label>
                <select
                  className="input"
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  required
                >
                  <option value="">Seleccionar cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Tipo de Préstamo</label>
                <select
                  className="input"
                  value={formData.loan_type_id}
                  onChange={(e) => setFormData({ ...formData, loan_type_id: e.target.value })}
                  required
                >
                  <option value="">Seleccionar tipo</option>
                  {loanTypes.map((lt) => (
                    <option key={lt.id} value={lt.id}>
                      {lt.name} - {lt.interest_percentage}% interés
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Monto Principal</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={formData.principal_amount}
                  onChange={(e) => setFormData({ ...formData, principal_amount: e.target.value })}
                  required
                />
              </div>
              {formData.loan_type_id && formData.principal_amount && (
                (() => {
                  const selectedType = loanTypes.find(t => t.id === parseInt(formData.loan_type_id));
                  if (!selectedType) return null;
                  const principal = parseFloat(formData.principal_amount) || 0;
                  const total = principal * (1 + (selectedType.interest_percentage || 0) / 100);
                  const numPayments = selectedType.modality === 'daily' ? 20 : 4;
                  const installmentAmount = total / numPayments;
                  return (
                    <div style={{ 
                      marginTop: '1rem', 
                      padding: '1rem', 
                      background: 'var(--background)', 
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--primary)'
                    }}>
                      <h4 style={{ margin: '0 0 0.5rem', color: 'var(--primary)' }}>Resumen del Préstamo</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                        <div>Monto solicitado:</div>
                        <div style={{ fontWeight: 'bold' }}>${principal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                        <div>Interés ({selectedType.interest_percentage}%):</div>
                        <div>${(total - principal).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                        <div>Total a pagar:</div>
                        <div style={{ fontWeight: 'bold', color: 'var(--danger)' }}>${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                        <div> Número de cuotas:</div>
                        <div>{numPayments} {selectedType.modality === 'daily' ? '(diarias)' : '(semanales)'}</div>
                        <div>Valor de cada cuota:</div>
                        <div style={{ fontWeight: 'bold', color: 'var(--success)' }}>${installmentAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                      </div>
                    </div>
                  );
                })()
              )}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Fecha de Inicio</label>
                <input
                  type="date"
                  className="input"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Crear Orden de Préstamo
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <table className="table table-mobile-card">
          <thead>
            <tr>
              <th>ID</th>
              <th>Cliente</th>
              <th>Monto</th>
              <th>Total</th>
              <th>Cuota</th>
              <th>Tipo</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loans.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center' }}>No hay préstamos</td>
              </tr>
            ) : (
              loans.map((loan) => {
                const statusStyle = getStatusColor(loan.status);
                return (
                  <tr key={loan.id}>
                    <td data-label="ID">{loan.id}</td>
                    <td data-label="Cliente">
                      <div style={{ fontWeight: 500 }}>{loan.client_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{loan.client_phone}</div>
                    </td>
                    <td data-label="Monto">${loan.principal_amount.toFixed(2)}</td>
                    <td data-label="Total">${loan.total_amount.toFixed(2)}</td>
                    <td data-label="Cuota">
                      <div>${(loan.total_amount / (loan.modality === 'daily' ? 20 : 4)).toFixed(2)}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {loan.paid_count || 0}/{loan.payment_count || 0}
                      </div>
                    </td>
                    <td data-label="Tipo">{loan.loan_type_name}</td>
                    <td data-label="Inicio">{new Date(loan.start_date).toLocaleDateString()}</td>
                    <td data-label="Fin">{loan.end_date ? new Date(loan.end_date).toLocaleDateString() : '-'}</td>
                    <td data-label="Estado">
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        background: statusStyle.bg,
                        color: statusStyle.color,
                      }}>
                        {loan.status === 'orden' ? 'Orden' : loan.status === 'aprobado' ? 'Aprobado' : 'Finalizado'}
                      </span>
                    </td>
                    <td data-label="Acciones">
                      <button
                        onClick={() => handleViewPayments(loan)}
                        className="btn btn-primary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                      >
                        Ver Cuotas
                      </button>
                      {user.role === 'admin' && (
                        <>
                          {loan.status !== 'finalizado' && (
                            <button
                              onClick={() => handleUpdateStatus(loan.id, loan.status === 'orden' ? 'aprobado' : 'finalizado')}
                              className="btn btn-primary"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                            >
                              {loan.status === 'orden' ? 'Aprobar' : 'Finalizar'}
                            </button>
                          )}
                          <button
                            onClick={() => handleRegeneratePayments(loan.id)}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                            title="Regenerar cuotas"
                          >
                            ↻
                          </button>
                          <button
                            onClick={() => handleDeleteLoan(loan.id)}
                            className="btn btn-danger"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedLoan && (
        <div style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>Cuotas del Préstamo #{selectedLoan.id}</h2>
            <button onClick={() => setSelectedLoan(null)} className="btn btn-primary">Cerrar</button>
          </div>
          <div className="card">
            <p><strong>Cliente:</strong> {selectedLoan.client_name}</p>
            <p><strong>Monto:</strong> ${selectedLoan.principal_amount.toFixed(2)} | <strong>Total:</strong> ${selectedLoan.total_amount.toFixed(2)}</p>
            <p><strong>Tipo:</strong> {selectedLoan.loan_type_name}</p>
          </div>
          <div className="card" style={{ marginTop: '1rem' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Monto</th>
                  <th>Fecha Venc.</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loanPayments.map((payment) => {
                  const remaining = payment.amount - (payment.paid_amount || 0);
                  return (
                    <tr key={payment.id}>
                      <td>{payment.payment_number}</td>
                      <td>
                        <div>${payment.amount.toFixed(2)}</div>
                        {(payment.paid_amount || 0) > 0 && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Pagado: ${(payment.paid_amount || 0).toFixed(2)} | Resta: ${remaining.toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td>{new Date(payment.due_date).toLocaleDateString()}</td>
                      <td>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          background: payment.is_paid ? '#dcfce7' : '#fee2e2',
                          color: payment.is_paid ? '#16a34a' : '#dc2626',
                        }}>
                          {payment.is_paid ? 'Pagado' : 'Pendiente'}
                        </span>
                      </td>
                      <td style={{ display: 'flex', gap: '0.5rem' }}>
                        {!payment.is_paid && (
                          <>
                            <button
                              onClick={() => setPartialPayment({ payment, amount: payment.amount.toString() })}
                              className="btn btn-secondary"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                            >
                              Pago Parcial
                            </button>
                            <button
                              onClick={() => handleTogglePayment(payment.id, payment.is_paid)}
                              className="btn btn-primary"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                            >
                              Marcar Pagado
                            </button>
                          </>
                        )}
                        {payment.is_paid && (
                          <button
                            onClick={() => handleTogglePayment(payment.id, payment.is_paid)}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                          >
                            Desmarcar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {partialPayment && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem'
        }} onClick={() => setPartialPayment(null)}>
          <div className="card" style={{ maxWidth: '400px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1rem' }}>Pago Parcial - Cuota #{partialPayment.payment.payment_number}</h3>
            <p style={{ marginBottom: '1rem' }}>
              <strong>Monto de cuota:</strong> ${partialPayment.payment.amount.toFixed(2)}
            </p>
            <div className="form-group">
              <label className="form-label">Monto a pagar</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={partialPayment.amount}
                onChange={(e) => setPartialPayment({ ...partialPayment, amount: e.target.value })}
                autoFocus
              />
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              <button onClick={handlePartialPayment} className="btn btn-primary" style={{ flex: 1 }}>
                Registrar Pago
              </button>
              <button onClick={() => setPartialPayment(null)} className="btn btn-secondary" style={{ flex: 1 }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
