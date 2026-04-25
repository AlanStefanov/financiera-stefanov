'use client';

import { useEffect, useState, useRef } from 'react';
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
  const [calculatorLoading, setCalculatorLoading] = useState(true);
  const [form, setForm] = useState({ name: '', phone: '', address: '', cuil: '', email: '', dni_front: '', dni_back: '' });
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const [calculator, setCalculator] = useState<{ amount: number; loanTypeId: number | null }>({ amount: 100000, loanTypeId: null });
  const [calculatorResult, setCalculatorResult] = useState<{ total: number; fee: number; totalInterest: number } | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchLoanTypes();
  }, []);

  useEffect(() => {
    if (!calculatorLoading && calculator.amount > 0 && calculator.loanTypeId) {
      calculateFee();
    }
  }, [calculator, loanTypes, calculatorLoading]);

  useEffect(() => {
    if (!calculatorLoading && !calculator.loanTypeId && loanTypes.length > 0) {
      setCalculator(prev => ({ ...prev, loanTypeId: loanTypes[0].id }));
    }
  }, [calculatorLoading, loanTypes]);

  const fetchLoanTypes = async () => {
    try {
      const res = await fetch('/api/loan-types');
      if (res.ok) {
        const data = await res.json();
        setLoanTypes(Array.isArray(data) ? data : []);
        setCalculatorLoading(false);
      }
    } catch (error) {
      console.error('Error fetching loan types:', error);
      setCalculatorLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const compressImage = (base64Data: string, maxSizeKB: number = 512): Promise<string> => {
    return new Promise((resolve) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        const maxDimension = 1200;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          } else {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        let quality = 0.8;
        let result = canvas.toDataURL('image/jpeg', quality);
        
        while (result.length > maxSizeKB * 1024 && quality > 0.3) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }
        
        resolve(result);
      };
      img.src = base64Data;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: 'dni_front' | 'dni_back') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        const compressed = await compressImage(reader.result as string);
        setForm(prev => ({ ...prev, [field]: compressed }));
      };
      reader.readAsDataURL(file);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/clients/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          address: form.address,
          cuil: form.cuil,
          dni_front: form.dni_front,
          dni_back: form.dni_back
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('✓ Registro exitoso. Te contactaremos pronto.');
        setForm({ name: '', phone: '', address: '', cuil: '', email: '', dni_front: '', dni_back: '' });
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

  if (loading || calculatorLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="header">
        <div className="container header-content">
          <Link href="/clients" className="header-logo">
            <img 
              src="/logo.png" 
              alt="Microcréditos Stefanov"
              style={{ height: '56px', borderRadius: '6px' }}
            />
          </Link>
          <nav className="header-nav" style={{ display: 'flex', gap: '1rem' }}>
          </nav>
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
                onClick={() => { setShowForm(true); setShowCalculator(false); document.getElementById('registro')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="btn"
                style={{ background: '#fff', color: '#2563eb', padding: '0.75rem 2rem', fontSize: '1.125rem', fontWeight: '600' }}
              >
                Registrate
              </button>
              <button 
                onClick={() => { setShowCalculator(true); setShowForm(false); document.getElementById('calculadora')?.scrollIntoView({ behavior: 'smooth' }); }}
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
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Hasta $500.000</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Monto adaptable a tus necesidades, podrás acceder a mayores montos según sea tu puntuación como cliente.</p>
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
              Como continuar el proceso!
            </h2>
            <p style={{ lineHeight: 1.8, color: 'var(--text-secondary)', textAlign: 'center' }}>
              Microcréditos Stefanov se dedicada a colaborar con emprendedores y trabajadores independientes. 
              Entendemos que cada persona tiene dreams y necesita apoyo financiero para alcanzarlos. Por eso oferecemos 
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
                  Registrate
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
                    <div className="form-group">
                      <label className="form-label">DNI (Frente)</label>
                      <input
                        ref={frontInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'dni_front')}
                        style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', width: '100%' }}
                      />
                      {form.dni_front && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <NextImage src={form.dni_front} alt="DNI frente" width={150} height={100} style={{ objectFit: 'cover', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} unoptimized />
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="form-label">DNI (Dorso)</label>
                      <input
                        ref={backInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'dni_back')}
                        style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', width: '100%' }}
                      />
                      {form.dni_back && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <NextImage src={form.dni_back} alt="DNI dorso" width={150} height={100} style={{ objectFit: 'cover', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} unoptimized />
                        </div>
                      )}
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
                      max="500000"
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
                      value={calculator.loanTypeId ?? ''}
                      onChange={(e) => setCalculator({ ...calculator, loanTypeId: e.target.value ? parseInt(e.target.value) : null })}
                    >
                      <option value="">Elegí el tipo de préstamo</option>
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
          <p style={{ marginBottom: '0.5rem' }}>© 2026 Microcréditos Stefanov. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}