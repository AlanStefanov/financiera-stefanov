'use client';

import { useEffect, useState } from 'react';
import styles from './reports.module.css';

export default function ReportsPage() {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'operators' | 'collections' | 'overdue'>('operators');
  const [sendEmailModal, setSendEmailModal] = useState<{ show: boolean; operatorId?: number; operatorName?: string; operatorEmail?: string }>({ show: false });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);

  // Estado de ordenamiento para Cobros
  const [collectionsSort, setCollectionsSort] = useState<{ field: string; direction: 'asc' | 'desc' }>({ field: '', direction: 'asc' });
  // Estado de ordenamiento para Atrasados
  const [overdueSort, setOverdueSort] = useState<{ field: string; direction: 'asc' | 'desc' }>({ field: '', direction: 'asc' });

  // Función para alternar ordenamiento
  const handleSort = (table: 'collections' | 'overdue', field: string) => {
    if (table === 'collections') {
      setCollectionsSort((prev) => {
        if (prev.field === field) {
          return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
        } else {
          return { field, direction: 'asc' };
        }
      });
    } else {
      setOverdueSort((prev) => {
        if (prev.field === field) {
          return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
        } else {
          return { field, direction: 'asc' };
        }
      });
    }
  };

  // Función para obtener emoji
  const getSortEmoji = (table: 'collections' | 'overdue', field: string) => {
    const sort = table === 'collections' ? collectionsSort : overdueSort;
    if (sort.field !== field) return '';
    return sort.direction === 'asc' ? '▲' : '▼';
  };

  // Ordenar datos de Cobros
  const getSortedCollections = () => {
    if (!collectionsSort.field) return (collections as any[]);
    const sorted = [...(collections as any[])].sort((a, b) => {
      let aValue = a[collectionsSort.field];
      let bValue = b[collectionsSort.field];
      // Fechas
      if (collectionsSort.field === 'due_date') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      // Estado
      if (collectionsSort.field === 'is_paid') {
        aValue = aValue ? 1 : 0;
        bValue = bValue ? 1 : 0;
      }
      if (aValue < bValue) return collectionsSort.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return collectionsSort.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  // Ordenar datos de Atrasados
  const getSortedOverdue = () => {
    if (!overdueSort.field) return (overduePayments as any[]);
    const sorted = [...(overduePayments as any[])].sort((a, b) => {
      let aValue = a[overdueSort.field];
      let bValue = b[overdueSort.field];
      // Fechas
      if (overdueSort.field === 'due_date') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      if (aValue < bValue) return overdueSort.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return overdueSort.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
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

  const getOperatorOverdueCount = () => {
    if (!sendEmailModal.operatorId && !sendEmailModal.operatorName) return 0;
    return overduePayments.filter((p: any) => (
      (sendEmailModal.operatorId && p.operator_id === sendEmailModal.operatorId) ||
      (!sendEmailModal.operatorId && sendEmailModal.operatorName && p.operator_name === sendEmailModal.operatorName)
    )).length;
  };

  const sendEmailToOperator = async () => {
    if (!sendEmailModal.operatorId || !sendEmailModal.operatorEmail) return;
    setSendingEmail(true);
    try {
      const token = localStorage.getItem('token');
      const count = getOperatorOverdueCount();
      
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

  if (loading) return <div className="empty-state">Cargando...</div>;
  if (!reportData) return <div>Error al cargar reportes</div>;

  const { operatorEarnings, collections, overduePayments, summary } = reportData;

  return (
    <div className={styles['reports-root']}>
      <h1 className="page-title">Reportes</h1>
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

      <div className={styles['reports-card']}>
        <div className={styles['reports-summary-grid']}>
          <div className={styles['reports-summary-item']}>
            <h3>Total Préstamos</h3>
            <p>{summary.totalLoans}</p>
          </div>
          <div className={styles['reports-summary-item']}>
            <h3>Total Capital</h3>
            <p>{formatCurrency(summary.totalPrincipal)}</p>
          </div>
          <div className={styles['reports-summary-item']}>
            <h3>Total Intereses</h3>
            <p className={styles['success']}>{formatCurrency(summary.totalInterest)}</p>
          </div>
          <div className={styles['reports-summary-item']}>
            <h3>Pagos a Operadores</h3>
            <p className={styles['primary']}>{formatCurrency(summary.totalToPayOperators)}</p>
          </div>
          <div className={styles['reports-summary-item']}>
            <h3>Pagos Atrasados</h3>
            <p className={styles['danger']}>{summary.overdueCount}</p>
          </div>
        </div>
      </div>

      <div className={styles['reports-tabs']}>
        <button
          onClick={() => setActiveTab('operators')}
          className={activeTab === 'operators' ? `${styles['reports-tab-btn']} ${styles['active']}` : styles['reports-tab-btn']}
        >
          Ganancias Operadores
        </button>
        <button
          onClick={() => setActiveTab('collections')}
          className={activeTab === 'collections' ? `${styles['reports-tab-btn']} ${styles['active']}` : styles['reports-tab-btn']}
        >
          Cobros
        </button>
        <button
          onClick={() => setActiveTab('overdue')}
          className={activeTab === 'overdue' ? `${styles['reports-tab-btn']} ${styles['active']}` : styles['reports-tab-btn']}
        >
          Atrasados
        </button>
      </div>

      {activeTab === 'operators' && (
        <div className={styles['reports-card']}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.2rem', color: 'var(--text)' }}>Ganancias por Operador</h2>
          <table className={styles['reports-table']}>
            <thead>
              <tr>
                <th>Operador</th>
                <th style={{ textAlign: 'right' }}>Préstamos</th>
                <th style={{ textAlign: 'right' }}>Capital</th>
                <th style={{ textAlign: 'right' }}>Interés Total</th>
                <th style={{ textAlign: 'right' }}>Ganancia Potencial</th>
                <th style={{ textAlign: 'right' }}>Ganancia Real</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(operatorEarnings as any[]).map((op) => (
                <tr key={op.operator_id}>
                  <td>{op.operator_name} {op.operator_lastname}</td>
                  <td style={{ textAlign: 'right' }}>{op.total_loans || 0}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(op.total_principal)}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(op.total_interest)}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(op.potential_earnings)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(op.actual_earnings)}</td>
                  <td style={{ textAlign: 'center' }}>
                    {op.operator_email ? (
                      <button
                        onClick={() => setSendEmailModal({ show: true, operatorId: op.operator_id, operatorName: `${op.operator_name} ${op.operator_lastname}`, operatorEmail: op.operator_email })}
                        style={{
                          background: '#2563eb',
                          color: 'white',
                          border: 'none',
                          padding: '0.5rem 0.9rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.95rem',
                          fontWeight: 600,
                          boxShadow: '0 2px 8px 0 rgba(37,99,235,0.08)'
                        }}
                      >
                        ✉️ Enviar Email
                      </button>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.95rem' }}>Sin email</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'collections' && (
        <div className={styles['reports-card']}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.2rem', color: 'var(--text)' }}>Historial de Cobros</h2>
          <table className={styles['reports-table']}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th data-sortable onClick={() => handleSort('collections', 'operator_name')}>
                  Operador {getSortEmoji('collections', 'operator_name')}
                </th>
                <th style={{ textAlign: 'right' }}>Monto</th>
                <th style={{ textAlign: 'right' }}>Pagado</th>
                <th data-sortable onClick={() => handleSort('collections', 'due_date')}>
                  Vencimiento {getSortEmoji('collections', 'due_date')}
                </th>
                <th data-sortable onClick={() => handleSort('collections', 'is_paid')}>
                  Estado {getSortEmoji('collections', 'is_paid')}
                </th>
              </tr>
            </thead>
            <tbody>
              {getSortedCollections().slice(0, 50).map((c) => (
                <tr key={c.id}>
                  <td>{c.client_name}</td>
                  <td>{c.operator_name}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(c.amount)}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(c.paid_amount)}</td>
                  <td>{new Date(c.due_date).toLocaleDateString('es-AR')}</td>
                  <td>
                    <span className={c.is_paid ? `${styles['reports-status']} ${styles['paid']}` : styles['reports-status']}>
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
        <div className={styles['reports-card']}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.2rem', color: 'var(--danger)' }}>Pagos Atrasados</h2>
          {(overduePayments as any[]).length === 0 ? (
            <p>No hay pagos atrasados</p>
          ) : (
            <table className={styles['reports-table']}>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Teléfono</th>
                  <th data-sortable onClick={() => handleSort('overdue', 'operator_name')}>
                    Operador {getSortEmoji('overdue', 'operator_name')}
                  </th>
                  <th style={{ textAlign: 'right' }}>Monto</th>
                  <th data-sortable onClick={() => handleSort('overdue', 'due_date')}>
                    Vencido {getSortEmoji('overdue', 'due_date')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {getSortedOverdue().map((p) => (
                  <tr key={p.id}>
                    <td>{p.client_name}</td>
                    <td>{p.client_phone}</td>
                    <td>{p.operator_name}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(p.amount)}</td>
                    <td style={{ color: '#dc2626', fontWeight: 600 }}>{new Date(p.due_date).toLocaleDateString('es-AR')}</td>
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
          <div className={styles['reports-modal']}>
            <h3 className={styles['reports-modal-header']}>Enviar Email a Operador</h3>
            <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px' }}>
              <p className={styles['reports-modal-label']} style={{ margin: 0 }}><strong>Para:</strong> <span className={styles['reports-modal-value']}>{sendEmailModal.operatorName}</span></p>
              <p className={styles['reports-modal-label']} style={{ margin: '0.5rem 0 0' }}><strong>Email:</strong> <span className={styles['reports-modal-value']}>{sendEmailModal.operatorEmail}</span></p>
            </div>
            <div className={styles['reports-modal-preview']} style={{ whiteSpace: 'pre-line' }}>
              <strong>Vista previa del mensaje:</strong><br/><br/>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/email-image.png" alt="Stefanov" style={{ maxWidth: '100%', height: 'auto', marginBottom: '1rem' }} /><br/>
              <strong><em>Buenas</em></strong>,<br/><br/>
              Tiene {getOperatorOverdueCount()} pago(s) atrasado(s), favor validar con sus clientes.<br/><br/>
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
                className={styles['reports-tab-btn']}
                disabled={sendingEmail}
              >
                Cancelar
              </button>
              <button
                onClick={sendEmailToOperator} 
                className={styles['reports-tab-btn'] + ' ' + styles['active']}
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