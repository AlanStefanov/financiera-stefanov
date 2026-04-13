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
  const [sendEmailModal, setSendEmailModal] = useState<{ show: boolean; operatorId?: number; operatorName?: string; operatorEmail?: string }>({ show: false });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);

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
          console.error('API error:', data, 'Status:', res.status);
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

  const sendEmailToOperator = async () => {
    if (!sendEmailModal.operatorId || !sendEmailModal.operatorEmail) return;
    setSendingEmail(true);
    try {
      const token = localStorage.getItem('token');
      const operatorOverdue = overduePayments.filter((p: any) => p.operator_id === sendEmailModal.operatorId);
      const count = operatorOverdue.length;
      
      const subject = `Pagos Atrasados - ${count} cliente(s) necesita(n) validación`;
      const body = `
      <div style="font-family: Arial, sans-serif; color: #1a1a1a; line-height: 1.5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <img src="cid:email-image@stefanov" alt="Stefanov" style="max-width: 540px; width: 100%; height: auto; display: block; margin: 0 auto;" />
          </div>
          <p style="margin: 0 0 16px; font-size: 16px;"><strong>Buenas</strong>,</p>
          <p style="margin: 0 0 16px; font-size: 16px;">Tiene <strong>${count}</strong> pago(s) atrasado(s), favor validar con sus clientes.</p>
          <p style="margin: 0 0 24px; font-size: 16px;"><em>Saludos cordiales</em>,</p>
          <p style="margin: 0; font-size: 16px;"><strong>Alan Stefanov</strong></p>
          <p style="margin: 4px 0 0; font-size: 14px; color: #555;">Director General | Microcréditos Stefanov</p>
          <p style="margin: 16px 0 0; font-size: 14px; color: #555;">📞 Teléfono: +54 9 1127395566</p>
          <p style="margin: 4px 0 0; font-size: 14px; color: #555;">📍 Gonnet / La Plata, Buenos Aires</p>
          <p style="margin: 4px 0 0; font-size: 14px; color: #555;">🌐 <a href="https://financiera-stefanov.vercel.app/" style="color: #1a73e8; text-decoration: none;">financiera-stefanov.vercel.app</a></p>
        </div>
      </div>`;

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          to: sendEmailModal.operatorEmail,
          subject,
          body,
          inlineImage: true,
        })
      });

      if (res.ok) {
        setNotification({ message: 'Email enviado exitosamente', type: 'success' });
      } else {
        const data = await res.json();
        setNotification({ message: data.message || 'Error al enviar email', type: 'error' });
      }
    } catch (error) {
      console.error('Error sending email:', error);
      setNotification({ message: 'Error al enviar email', type: 'error' });
    } finally {
      setSendingEmail(false);
      setSendEmailModal({ show: false });
    }
  };

  if (loading) return <div>Cargando...</div>;
  if (!reportData) return <div>Error al cargar reportes</div>;

  const { operatorEarnings, collections, overduePayments, summary } = reportData;

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>Reportes</h1>
      {notification && (
        <div style={{
          marginBottom: '1rem',
          padding: '1rem',
          borderRadius: '0.5rem',
          background: notification.type === 'error' ? '#fee2e2' : '#d1fae5',
          color: notification.type === 'error' ? '#b91c1c' : '#166534',
          border: notification.type === 'error' ? '1px solid #fca5a5' : '1px solid #6ee7b7'
        }}>
          {notification.message}
        </div>
      )}

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
                <th style={{ textAlign: 'center', padding: '0.75rem' }}>Acciones</th>
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
                  <td style={{ textAlign: 'center', padding: '0.75rem' }}>
                    {op.operator_email ? (
                      <button
                        onClick={() => setSendEmailModal({ show: true, operatorId: op.operator_id, operatorName: `${op.operator_name} ${op.operator_lastname}`, operatorEmail: op.operator_email })}
                        style={{
                          background: 'var(--primary)',
                          color: 'white',
                          border: 'none',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}
                      >
                        ✉️ Enviar Email
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Sin email</span>
                    )}
                  </td>
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

      {sendEmailModal.show && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem'
        }}>
          <div style={{
            background: 'white', borderRadius: '0.5rem', padding: '1.5rem',
            maxWidth: '450px', width: '100%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>Enviar Email a Operador</h3>
            <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--background)', borderRadius: 'var(--radius)' }}>
              <p style={{ margin: 0 }}><strong>Para:</strong> {sendEmailModal.operatorName}</p>
              <p style={{ margin: '0.5rem 0 0' }}><strong>Email:</strong> {sendEmailModal.operatorEmail}</p>
            </div>
            <div style={{ padding: '1rem', background: '#fef3cd', borderRadius: 'var(--radius)', marginBottom: '1rem', whiteSpace: 'pre-line' }}>
              <strong>Vista previa del mensaje:</strong><br/><br/>
              <img src="/email-image.png" alt="Stefanov" style={{ maxWidth: '100%', height: 'auto', marginBottom: '1rem' }} /><br/>
              <strong><em>Buenas</em></strong>,<br/><br/>
              Tiene {overduePayments.filter((p: any) => p.operator_name === sendEmailModal.operatorName).length} pago(s) atrasado(s), favor validar con sus clientes.<br/><br/>
              <em>Saludos cordiales</em>,<br/>
              <strong>Alan Stefanov</strong><br/>
              Director General | Microcréditos Stefanov<br/><br/>
              📞 Teléfono: +54 9 1127395566<br/>
              📍 Ubicación: Gonnet / La Plata, Buenos Aires<br/>
              🌐 Web: https://financiera-stefanov.vercel.app/
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setSendEmailModal({ show: false })} 
                className="btn btn-secondary"
                disabled={sendingEmail}
              >
                Cancelar
              </button>
              <button 
                onClick={sendEmailToOperator} 
                className="btn btn-primary"
                disabled={sendingEmail}
              >
                {sendingEmail ? 'Enviando...' : '📧 Enviar Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}