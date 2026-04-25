'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSnackbar } from '@/components/Snackbar';

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
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [loanPayments, setLoanPayments] = useState<LoanPayment[]>([]);
  const [user, setUser] = useState<User>({ role: 'operator' });
  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({ client_id: '', loan_type_id: '', principal_amount: '', fund_source: 'financial' });
  const [partialPayment, setPartialPayment] = useState<{ payment: LoanPayment; amount: string } | null>(null);
  const [expandedLoanId, setExpandedLoanId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean; id: number | null }>({ show: false, id: null });
  const { showSnackbar } = useSnackbar();
  const searchParams = useSearchParams();

  const normalizeModality = (modality: string | undefined, loanTypeName?: string) => {
    const normalized = modality?.toString().toLowerCase().trim();
    if (normalized === 'daily' || normalized === 'diario') return 'daily';
    if (normalized === 'weekly' || normalized === 'semanal') return 'weekly';
    if (normalized === 'monthly' || normalized === 'mensual') return 'monthly';

    const name = loanTypeName?.toString().toLowerCase() || '';
    if (name.includes('diario')) return 'daily';
    if (name.includes('semanal')) return 'weekly';
    if (name.includes('mensual')) return 'monthly';

    return normalized || 'daily';
  };

  const getFirstPaymentMessage = (modality: string, startDate: string, loanTypeName?: string) => {
    const normalized = normalizeModality(modality, loanTypeName);
    const base = new Date(startDate + 'T12:00:00');
    const nextDaily = new Date(base);
    nextDaily.setDate(base.getDate() + 1);
    const nextWeekly = new Date(base);
    nextWeekly.setDate(base.getDate() + 7);
    const nextMonthly = new Date(base);
    nextMonthly.setDate(base.getDate() + 28);

    if (normalized === 'daily') {
      const tomorrowStr = nextDaily.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
      return 'Su primera cuota será el ' + tomorrowStr;
    } else if (normalized === 'weekly') {
      const nextWeekStr = nextWeekly.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
      return 'Su primera cuota será el ' + nextWeekStr;
    } else {
      const nextMonthStr = nextMonthly.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
      return 'Su primera cuota será dentro de 28 días (' + nextMonthStr + ')';
    }
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  useEffect(() => {
    const loanId = searchParams.get('loan_id');
    if (!loanId || loans.length === 0) return;
    const loan = loans.find(l => l.id === parseInt(loanId));
    if (loan) handleViewPayments(loan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loans, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    
    setSubmitting(true);
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
          fund_source: formData.fund_source,
        }),
      });

      if (res.ok) {
        setFormData({ client_id: '', loan_type_id: '', principal_amount: '', fund_source: 'financial' });
        setShowForm(false);
        fetchData();
        showSnackbar('Préstamo creado exitosamente');
      } else {
        const data = await res.json();
        showSnackbar(data.message || 'Error al crear préstamo', 'error');
      }
    } catch (error) {
      console.error('Error creating loan:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewPayments = async (loan: Loan) => {
    if (isMobile) {
      if (expandedLoanId === loan.id) {
        setExpandedLoanId(null);
      } else {
        setExpandedLoanId(loan.id);
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/loans/${loan.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSelectedLoan(data.loan);
          setLoanPayments(data.payments);
          setTimeout(() => {
            document.getElementById('mobile-payments')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      }
    } else {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/loans/${loan.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedLoan(data.loan);
        setLoanPayments(data.payments);
      }
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

  const handleSendOverdueReminder = (payment: LoanPayment, clientName: string, clientPhone: string) => {
    const phone = clientPhone.replace(/\D/g, '');
    const daysOverdue = Math.ceil((new Date().getTime() - new Date(payment.due_date).getTime()) / (1000 * 60 * 60 * 24));
    const message = `Hola ${clientName}, te recordamo$ que tienes una cuota atrasada de $${payment.amount.toLocaleString('es-AR')} que venció el ${new Date(payment.due_date).toLocaleDateString('es-AR')}. \n\nLlevas ${daysOverdue} día${daysOverdue > 1 ? 's' : ''} de atraso. Por favor comunicate con nosotros para regularizar tu situación.\n\nTu operador de créditos te espera para ayudarte.`;
    window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, '_blank');
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
        const operatorDisplay = loan.operator_name || 'el operador de créditos';
        const phone = loan.client_phone.replace(/\D/g, '');
        const loanModality = normalizeModality(loan.modality, loan.loan_type_name);
        const installments = loanModality === 'daily' ? 20 : loanModality === 'weekly' ? 4 : Number(loan.duration_months);
        const installmentAmount = Math.round(loan.total_amount / installments);
        const modalityText = loanModality === 'daily' ? 'Pago Diario' : loanModality === 'weekly' ? 'Pago Semanal' : 'Pago Mensual';
        const endDate = loan.end_date ? new Date(loan.end_date).toLocaleDateString('es-AR') : 'N/A';
        const message = `¡Hola ${loan.client_name}! Tu préstamo ha sido aprobado.\n\nMonto: $${loan.principal_amount.toLocaleString()}\nTotal: $${loan.total_amount.toLocaleString()}\nTipo: ${modalityText}\nCuotas: ${installments} de $${installmentAmount.toLocaleString()}\nFecha de fin: ${endDate}\n\nTu operador de créditos es: ${operatorDisplay}. Comuníquese con él para gestionar los pagos.\n\nGracias por confiar en Microcréditos Stefanov.`;
        window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, '_blank');
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDeleteLoan = async () => {
    if (!confirmDelete.id) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/loans/${confirmDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchData();
        if (selectedLoan?.id === confirmDelete.id) {
          setSelectedLoan(null);
        }
      }
    } catch (error) {
      console.error('Error deleting loan:', error);
    } finally {
      setConfirmDelete({ show: false, id: null });
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
        showSnackbar('Cuotas regeneradas correctamente');
      }
    } catch (error) {
      console.error('Error regenerating payments:', error);
    }
  };

  if (loading) return <div className="empty-state">Cargando...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title">Préstamos</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? 'Cancelar' : 'Nuevo Préstamo'}
        </button>
      </div>

      {showForm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%' }}>
            <h3>Nuevo Préstamo</h3>
            {submitting ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ 
                  width: '40px', height: '40px', 
                  border: '3px solid var(--border)', 
                  borderTop: '3px solid var(--primary)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 1rem'
                }} />
                <p>Generando orden de préstamo...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Cliente</label>
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
                  <div className="form-group">
                    <label className="form-label">Tipo de Préstamo</label>
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
                  <div className="form-group">
                    <label className="form-label">Monto Principal</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={formData.principal_amount}
                      onChange={(e) => setFormData({ ...formData, principal_amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fuente de Fondos</label>
                    <select className="input" value={formData.fund_source} onChange={(e) => setFormData({ ...formData, fund_source: e.target.value })}>
                      <option value="financial">Capital Financiera</option>
                      <option value="collections">Cobranzas</option>
                    </select>
                  </div>
                  {formData.loan_type_id && formData.principal_amount && (
                    (() => {
                      const selectedType = loanTypes.find(t => t.id === parseInt(formData.loan_type_id));
                      if (!selectedType) return null;
                      
                      const principal = parseFloat(formData.principal_amount) || 0;
                      const total = principal * (1 + (selectedType.interest_percentage || 0) / 100);
                      let numPayments = 1;
                      if (selectedType.modality === 'daily') numPayments = 20;
                      else if (selectedType.modality === 'weekly') numPayments = 4;
                      else if (selectedType.modality === 'monthly') numPayments = Number(selectedType.duration_months);
                      const installmentAmount = total / numPayments;
                      const modalityLabel = selectedType.modality === 'daily' ? '(diarias)' : selectedType.modality === 'weekly' ? '(semanales)' : '(mensuales)';
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
                            <div>{numPayments} {modalityLabel}</div>
                            <div>Valor de cada cuota:</div>
                            <div style={{ fontWeight: 'bold', color: 'var(--success)' }}>${installmentAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                          </div>
                        </div>
                      );
                    })()
                  )}
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
                      {submitting ? 'Generando...' : 'Crear Préstamo'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
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
              <th>Operador</th>
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
                      <div>${(loan.total_amount / (loan.modality === 'daily' ? 20 : loan.modality === 'weekly' ? 4 : Number(loan.duration_months))).toFixed(2)}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {loan.paid_count || 0}/{loan.payment_count || 0}
                      </div>
                    </td>
                    <td data-label="Tipo">{loan.loan_type_name}</td>
                    <td data-label="Operador">{loan.operator_name || '-'}</td>
                    <td data-label="Inicio">
                      {loan.status === 'orden' ? (
                        <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Pendiente aprobación</span>
                      ) : (
                        new Date(loan.start_date).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
                      )}
                    </td>
                    <td data-label="Fin">{loan.end_date ? new Date(loan.end_date).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) : '-'}</td>
                    <td data-label="Estado">
                      <span className={`badge ${
                        loan.status === 'orden' ? 'badge-warning' :
                        loan.status === 'aprobado' ? 'badge-success' : 'badge-secondary'
                      }`}>
                        {loan.status === 'orden' ? 'Orden' : loan.status === 'aprobado' ? 'Aprobado' : 'Finalizado'}
                      </span>
                    </td>
                    <td data-label="Acciones">
                      <div className="table-actions">
                      <button
                        onClick={() => handleViewPayments(loan)}
                        className="icon-action-button"
                        title="Ver cuotas"
                        aria-label="Ver cuotas"
                      >
                        👁️
                      </button>
                      {user.role === 'admin' && (
                        <>
                          {loan.status !== 'finalizado' && (
                            <button
                              onClick={() => handleUpdateStatus(loan.id, loan.status === 'orden' ? 'aprobado' : 'finalizado')}
                              className="icon-action-button primary"
                              title={loan.status === 'orden' ? 'Aprobar' : 'Finalizar'}
                              aria-label={loan.status === 'orden' ? 'Aprobar' : 'Finalizar'}
                            >
                              {loan.status === 'orden' ? '✅' : '🏁'}
                            </button>
                          )}
                          <button
                            onClick={() => handleRegeneratePayments(loan.id)}
                            className="icon-action-button secondary"
                            title="Regenerar cuotas"
                            aria-label="Regenerar cuotas"
                          >
                            ↻
                          </button>
                          <button
                            onClick={() => setConfirmDelete({ show: true, id: loan.id })}
                            className="icon-action-button danger"
                            title="Eliminar"
                            aria-label="Eliminar"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isMobile && expandedLoanId && selectedLoan && (
        <div id="mobile-payments" className="card" style={{ marginTop: '1rem', border: '2px solid var(--primary)', position: 'sticky', top: '0', zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', margin: 0 }}>Cuotas - Préstamo #{selectedLoan.id}</h3>
            <button onClick={() => setExpandedLoanId(null)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }}>✕</button>
          </div>
          <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}><strong>{selectedLoan.client_name}</strong> - ${selectedLoan.principal_amount.toFixed(2)}</p>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ fontSize: '0.75rem' }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Monto</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {loanPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.payment_number}</td>
                    <td>${payment.amount.toFixed(2)}</td>
                    <td>{new Date(payment.due_date).toLocaleDateString('es-AR')}</td>
                    <td>
                      <span className={`badge ${payment.is_paid ? 'badge-success' : 'badge-danger'}`}>
                        {payment.is_paid ? 'Pagado' : 'Pendiente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isMobile && selectedLoan && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '1rem'
          }}
          onClick={() => setSelectedLoan(null)}
        >
          <div 
            className="card" 
            style={{ maxWidth: '600px', width: '100%', maxHeight: '80vh', overflow: 'auto' }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Cuotas del Préstamo #{selectedLoan.id}</h2>
              <button onClick={() => setSelectedLoan(null)} className="btn btn-primary">✕</button>
            </div>
          <div className="card" style={{ fontSize: '0.875rem' }}>
            <p><strong>Cliente:</strong> {selectedLoan.client_name}</p>
            <p><strong>Monto:</strong> ${selectedLoan.principal_amount.toFixed(2)} | <strong>Total:</strong> ${selectedLoan.total_amount.toFixed(2)}</p>
            <p><strong>Tipo:</strong> {selectedLoan.loan_type_name}</p>
            {selectedLoan.status === 'orden' && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fef3c7', borderRadius: 'var(--radius)', color: '#92400e' }}>
                {getFirstPaymentMessage(selectedLoan.modality, selectedLoan.start_date, selectedLoan.loan_type_name)}
              </div>
            )}
          </div>
            <table className="table table-mobile-card">
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
                      <td data-label="#">{payment.payment_number}</td>
                      <td data-label="Monto">
                        <div>${payment.amount.toFixed(2)}</div>
                        {(payment.paid_amount || 0) > 0 && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Pagado: ${(payment.paid_amount || 0).toFixed(2)} | Resta: ${remaining.toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td data-label="Fecha">{new Date(payment.due_date).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</td>
                      <td data-label="Estado">
                      <span className={`badge ${payment.is_paid ? 'badge-success' : 'badge-danger'}`}>
                        {payment.is_paid ? 'Pagado' : 'Pendiente'}
                      </span>
                      </td>
                      <td data-label="Acciones" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {!payment.is_paid && new Date(payment.due_date) < new Date() && user.role !== 'admin' && selectedLoan && (
                          <button
                            onClick={() => handleSendOverdueReminder(payment, selectedLoan.client_name, selectedLoan.client_phone)}
                            className="btn"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: '#fbbf24', color: '#000' }}
                            title="Enviar recordatorio por WhatsApp"
                          >
                            📣
                          </button>
                        )}
                        {!payment.is_paid && (
                          <>
                            <button
                              onClick={() => setPartialPayment({ payment, amount: payment.amount.toString() })}
                              className="btn btn-secondary"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            >
                              Parcial
                            </button>
                            <button
                              onClick={() => handleTogglePayment(payment.id, payment.is_paid)}
                              className="btn btn-primary"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            >
                              Pagar
                            </button>
                          </>
                        )}
                        {payment.is_paid && (
                          <button
                            onClick={() => handleTogglePayment(payment.id, payment.is_paid)}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
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

      {confirmDelete.show && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Confirmar eliminación</h3>
            <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
              ¿Estás seguro de que deseas eliminar este préstamo? Esta acción no se puede deshacer.
            </p>
            <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete({ show: false, id: null })} className="btn btn-secondary">
                Cancelar
              </button>
              <button onClick={handleDeleteLoan} className="btn btn-danger">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
