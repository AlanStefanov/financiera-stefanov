'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';

interface LoanType {
  id: number;
  name: string;
  duration_months: number;
  modality: string;
  interest_percentage: number;
}

export default function ClientsPortal() {
  const [loanTypes, setLoanTypes] = useState<LoanType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', phone: '', address: '', cuil: '', email: '' });
  const [calculator, setCalculator] = useState({ amount: 500000, loanTypeId: 1 });
  const [calculatorResult, setCalculatorResult] = useState<{ total: number; fee: number; totalInterest: number } | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchLoanTypes();
  }, []);

  const fetchLoanTypes = async () => {
    try {
      const res = await fetch('/api/loan-types');
      if (res.ok) {
        const data = await res.json();
        setLoanTypes(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching loan types:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFee = () => {
    const loanType = loanTypes.find(lt => lt.id === calculator.loanTypeId);
    if (!loanType) return;

    const principal = calculator.amount;
    const rate = loanType.interest_percentage / 100;
    const months = loanType.duration_months;
    const totalInterest = principal * rate * months;
    const total = principal + totalInterest;
    
    let fee: number;
    if (loanType.modality === 'daily') {
      fee = total / (months * 30);
    } else if (loanType.modality === 'weekly') {
      fee = total / (months * 4);
    } else {
      fee = total / months;
    }

    setCalculatorResult({ total, fee, totalInterest });
  };

  useEffect(() => {
    if (calculator.amount > 0 && calculator.loanTypeId) {
      calculateFee();
    }
  }, [calculator, loanTypes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/clients/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('✓ Registro exitoso. Te contactaremos pronto.');
        setForm({ name: '', phone: '', address: '', cuil: '', email: '' });
        setShowForm(false);

        if (form.email) {
          try {
            await fetch('/api/email/client-confirmation', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name, email: form.email })
            });
          } catch (emailErr) {
            console.error('Error sending email:', emailErr);
          }
        }
      } else {
        setMessage(data.message || 'Error al registrar');
      }
    } catch (error) {
      setMessage('Error al registrar');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', padding: '1rem 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/clients" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ position: 'relative', width: 48, height: 48 }}>
              <NextImage src="/logo.png" alt="Stefanov" fill style={{ objectFit: 'contain' }} />
            </div>
            <span style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 'bold' }}>Stefanov</span>
          </Link>
        </div>
      </header>

      <div style={{ flex: 1 }}>
        <section style={{ 
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', 
          padding: '3rem 0 5rem',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.1 }}>
            <div style={{ 
              position: 'absolute', 
              top: '-50%', 
              left: '-10%', 
              width: '60%', 
              height: '200%', 
              background: 'radial-gradient(circle, #fff 0%, transparent 70%)',
              borderRadius: '50%'
            }} />
          </div>
          <div className="container" style={{ position: 'relative', zIndex: 1 }}>
            <h1 style={{ color: '#fff', fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
              Microcréditos Stefanov
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.25rem', marginBottom: '2rem', maxWidth: 600, margin: '0 auto 2rem' }}>
              Tu solución financiera rápida y confiable. Préstamos ágiles para vos.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={() => { setShowForm(true); setShowCalculator(false); }}
                className="btn"
                style={{ background: '#fff', color: '#2563eb', padding: '0.75rem 2rem', fontSize: '1.125rem', fontWeight: '600' }}
              >
                Solicitar Préstamo
              </button>
              <button 
                onClick={() => { setShowCalculator(true); setShowForm(false); }}
                className="btn"
                style={{ background: 'transparent', color: '#fff', border: '2px solid #fff', padding: '0.75rem 2rem', fontSize: '1.125rem' }}
              >
                Calcular Cuota
              </button>
            </div>
          </div>
        </section>

        <section style={{ padding: '3rem 0', background: '#f8fafc' }}>
          <div className="container">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
              <div style={{ textAlign: 'center', padding: '2rem', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚡</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Aprobación Rápida</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Respuesta en poco tiempo</p>
              </div>
              <div style={{ textAlign: 'center', padding: '2rem', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💰</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Hasta $1.000.000</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Monto adaptable a tus necesidades</p>
              </div>
              <div style={{ textAlign: 'center', padding: '2rem', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📊</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Cuotas Flexibles</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Diarias, semanales o mensuales</p>
              </div>
            </div>
          </div>
        </section>

        <section style={{ padding: '3rem 0' }}>
          <div className="container" style={{ maxWidth: 600 }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', textAlign: 'center' }}>
              Sobre Nosotros
            </h2>
            <p style={{ lineHeight: 1.8, color: 'var(--text-secondary)', textAlign: 'center' }}>
              Stefanov es una empresa líder en microcréditos dedicada a ayudar a emprendedores y trabajadores independientes. 
              entendemos que cada persona tiene dreams y necesita apoyo financiero para alcanzarlos. Por eso oferecemos 
              préstamos rápidos, con tasas competitivas y un proceso de aprobación simplifyingado.
            </p>
            <p style={{ lineHeight: 1.8, color: 'var(--text-secondary)', textAlign: 'center', marginTop: '1rem' }}>
              Nuestro equipo de operadores te acompañará en todo el proceso, desde la solicitud hasta el cobro de cuotas, 
              brindándote atención personalizada.
            </p>
          </div>
        </section>

        {showForm && (
          <section style={{ padding: '3rem 0', background: '#f1f5f9' }} id="registro">
            <div className="container" style={{ maxWidth: 600 }}>
              <div className="card">
                <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', textAlign: 'center' }}>
                  Solicitar Préstamo
                </h2>
                
                {message && (
                  <div style={{ 
                    padding: '1rem', 
                    borderRadius: 8, 
                    marginBottom: '1rem', 
                    background: message.startsWith('✓') ? '#dcfce7' : '#fee2e2', 
                    color: message.startsWith('✓') ? '#16a34a' : '#dc2626' 
                  }}>
                    {message}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Nombre y Apellido</label>
                      <input
                        type="text"
                        className="input"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Teléfono</label>
                      <input
                        type="tel"
                        className="input"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email (opcional)</label>
                      <input
                        type="email"
                        className="input"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CUIL (sin espacios)</label>
                      <input
                        type="text"
                        className="input"
                        value={form.cuil}
                        onChange={(e) => setForm({ ...form, cuil: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                        placeholder="20345678901"
                        maxLength={11}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Dirección</label>
                      <input
                        type="text"
                        className="input"
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button 
                      type="submit" 
                      disabled={submitting}
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                    >
                      {submitting ? 'Enviando...' : 'Enviar Solicitud'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </section>
        )}

        {showCalculator && (
          <section style={{ padding: '3rem 0', background: '#f1f5f9' }} id="calculadora">
            <div className="container" style={{ maxWidth: 600 }}>
              <div className="card">
                <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', textAlign: 'center' }}>
                  Calculadora de Cuotas
                </h2>
                
                <div className="form-grid">
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Monto solicitado</label>
                    <input
                      type="range"
                      min="50000"
                      max="1000000"
                      step="50000"
                      value={calculator.amount}
                      onChange={(e) => setCalculator({ ...calculator, amount: parseInt(e.target.value) })}
                      style={{ width: '100%', accentColor: '#2563eb' }}
                    />
                    <div style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: '600', color: '#2563eb', marginTop: '0.5rem' }}>
                      {formatCurrency(calculator.amount)}
                    </div>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Tipo de préstamo</label>
                    <select 
                      className="input"
                      value={calculator.loanTypeId}
                      onChange={(e) => setCalculator({ ...calculator, loanTypeId: parseInt(e.target.value) })}
                    >
                      {loanTypes.map(lt => (
                        <option key={lt.id} value={lt.id}>
                          {lt.name} ({lt.interest_percentage}% interés)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {calculatorResult && (
                  <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f1f5f9', borderRadius: 8 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total a devolver</p>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(calculatorResult.total)}</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Cuota {loanTypes.find(lt => lt.id === calculator.loanTypeId)?.modality === 'daily' ? 'diaria' : loanTypes.find(lt => lt.id === calculator.loanTypeId)?.modality === 'weekly' ? 'semanal' : 'mensual'}</p>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2563eb' }}>{formatCurrency(calculatorResult.fee)}</p>
                      </div>
                    </div>
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '1rem' }}>
                      Interés total: {formatCurrency(calculatorResult.totalInterest)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      <footer style={{ background: '#1e293b', color: '#fff', padding: '2rem 0' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: '0.5rem' }}>© 2024 Microcréditos Stefanov</p>
          <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>Tu partner financiero de confianza</p>
        </div>
      </footer>
    </div>
  );
}