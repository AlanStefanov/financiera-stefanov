'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Settings {
  company_name: string;
  company_phone: string;
  company_address: string;
  company_website: string;
  credit_limit_default: string;
  company_logo: string;
}

type Tab = 'general' | 'tipos' | 'usuarios';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const stored = localStorage.getItem('user');
      if (!stored) return;
      
      const res = await fetch('/api/settings', {
        headers: { Authorization: `Bearer ${JSON.parse(stored).token}` }
      });
      const data = await res.json();
      setSettings(data);
      setFormData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (key: string) => {
    setSaving(true);
    setMessage('');
    
    try {
      const stored = localStorage.getItem('user');
      if (!stored) return;

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${JSON.parse(stored).token}` 
        },
        body: JSON.stringify({ key, value: formData[key] })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('✓ Actualizado');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(`Error: ${data.message}`);
      }
    } catch (err) {
      setMessage('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setFormData(prev => ({ ...prev, company_logo: base64 }));
      setSaving(true);
      
      try {
        const stored = localStorage.getItem('user');
        if (!stored) return;

        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${JSON.parse(stored).token}` 
          },
          body: JSON.stringify({ key: 'company_logo', value: base64 })
        });

        const data = await res.json();
        if (res.ok) {
          setMessage('✓ Logo actualizado');
          setTimeout(() => setMessage(''), 3000);
        } else {
          setMessage(`Error: ${data.message}`);
        }
      } catch (err) {
        setMessage('Error al guardar logo');
      } finally {
        setSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}/>
          <p style={{ color: '#64748b' }}>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>Configuración</h1>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        {(['general', 'tipos', 'usuarios'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.5rem 1rem',
              background: activeTab === tab ? '#2563eb' : 'transparent',
              color: activeTab === tab ? 'white' : '#64748b',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {tab === 'general' ? 'General' : tab === 'tipos' ? 'Tipos Préstamo' : 'Usuarios'}
          </button>
        ))}
      </div>

      {message && (
        <div style={{ padding: '1rem', borderRadius: '8px', marginBottom: '1rem', background: message.startsWith('✓') ? '#dcfce7' : '#fee2e2', color: message.startsWith('✓') ? '#16a34a' : '#dc2626' }}>
          {message}
        </div>
      )}

      {activeTab === 'general' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', margin: '0 0 1rem' }}>Logo de la Empresa</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '120px', height: '60px', background: '#f1f5f9', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {formData.company_logo ? (
                  <img src={formData.company_logo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%' }} />
                ) : (
                  <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Sin logo</span>
                )}
              </div>
              <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                {saving ? 'Subiendo...' : 'Cambiar Logo'}
                <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} disabled={saving} />
              </label>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', margin: '0 0 1rem' }}>Datos de la Empresa</h2>
            {[
              { key: 'company_name', label: 'Nombre' },
              { key: 'company_phone', label: 'Teléfono' },
              { key: 'company_address', label: 'Dirección' },
              { key: 'company_website', label: 'Sitio Web', type: 'url' },
            ].map(field => (
              <div key={field.key} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <label style={{ width: '120px', color: '#64748b', fontSize: '0.875rem' }}>{field.label}</label>
                <input
                  type={field.type || 'text'}
                  value={formData[field.key] || ''}
                  onChange={e => handleChange(field.key, e.target.value)}
                  onBlur={() => handleSave(field.key)}
                  style={{ flex: 1, padding: '0.625rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>
            ))}
          </div>

          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', margin: '0 0 1rem' }}>Crédito</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label style={{ width: '200px', color: '#64748b', fontSize: '0.875rem' }}>Límite por defecto</label>
              <span style={{ padding: '0.625rem', background: '#f1f5f9', borderRadius: '6px 0 0 6px', border: '1px solid #e2e8f0', borderRight: 'none', color: '#64748b' }}>$</span>
              <input
                type="number"
                value={formData.credit_limit_default || ''}
                onChange={e => handleChange('credit_limit_default', e.target.value)}
                onBlur={() => handleSave('credit_limit_default')}
                style={{ flex: 1, padding: '0.625rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '0 6px 6px 0', fontSize: '0.875rem' }}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tipos' && (
        <LoanTypesTab />
      )}

      {activeTab === 'usuarios' && (
        <UsuariosTab />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function LoanTypesTab() {
  const [loanTypes, setLoanTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', duration_months: 2, modality: 'monthly', interest_percentage: 60 });

  useEffect(() => {
    fetchLoanTypes();
  }, []);

  const fetchLoanTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/loan-types', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setLoanTypes(Array.isArray(data) ? data : []);
      } else {
        setLoanTypes([]);
      }
    } catch (err) {
      console.error(err);
      setLoanTypes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (lt: any) => {
    setEditingType(lt);
    setForm({
      name: lt.name,
      duration_months: lt.duration_months,
      modality: lt.modality,
      interest_percentage: lt.interest_percentage,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      if (editingType) {
        await fetch(`/api/loan-types/${editingType.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(form),
        });
      } else {
        await fetch('/api/loan-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(form),
        });
      }
      setShowForm(false);
      setEditingType(null);
      setForm({ name: '', duration_months: 2, modality: 'monthly', interest_percentage: 60 });
      fetchLoanTypes();
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingType(null);
    setForm({ name: '', duration_months: 2, modality: 'monthly', interest_percentage: 60 });
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title">Tipos de Préstamo</h1>
        <button onClick={() => resetForm()} className="btn btn-primary">
          {showForm ? 'Cancelar' : 'Nuevo Tipo'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3>{editingType ? 'Editar Tipo de Préstamo' : 'Nuevo Tipo de Préstamo'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input
                  type="text"
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Préstamo Personal 1 Mes"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Modalidad</label>
                <select
                  className="input"
                  value={form.modality}
                  onChange={(e) => setForm({ ...form, modality: e.target.value })}
                >
                  <option value="daily">Diario (L-V)</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Duración (meses)</label>
                <select
                  className="input"
                  value={form.duration_months}
                  onChange={(e) => setForm({ ...form, duration_months: Number(e.target.value) })}
                >
                  <option value={1}>1 Mes</option>
                  <option value={2}>2 Meses</option>
                  <option value={3}>3 Meses</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Costo Financiero (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  value={form.interest_percentage}
                  onChange={(e) => setForm({ ...form, interest_percentage: Number(e.target.value) })}
                  placeholder="30"
                  required
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editingType ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <table className="table table-mobile-card">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Duración</th>
              <th>Modalidad</th>
              <th>Costo Financiero</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loanTypes.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center' }}>No hay tipos de préstamo. Agregá uno nuevo.</td>
              </tr>
            ) : (
              loanTypes.map(lt => (
                <tr key={lt.id}>
                  <td data-label="Nombre" style={{ fontWeight: 500 }}>{lt.name}</td>
                  <td data-label="Duración">{lt.duration_months} mes(es)</td>
                  <td data-label="Modalidad">{lt.modality === 'daily' ? 'Diario' : lt.modality === 'weekly' ? 'Semanal' : 'Mensual'}</td>
                  <td data-label="Costo">{lt.interest_percentage}%</td>
                  <td data-label="Acciones">
                    <div className="table-actions">
                      <button onClick={() => handleEdit(lt)} className="icon-action-button secondary" title="Editar">✏️</button>
                    </div>
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

function UsuariosTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [form, setForm] = useState({ username: '', name: '', lastname: '', phone: '', email: '', password: '', role: 'operator' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error(err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (u: any) => {
    setEditingUser(u);
    setForm({
      username: u.username,
      name: u.name,
      lastname: u.lastname,
      phone: u.phone || '',
      email: u.email || '',
      password: '',
      role: u.role,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Usuario creado exitosamente');
        resetForm();
        fetchUsers();
      } else {
        setMessage(data.message || 'Error al crear usuario');
      }
    } catch (err) {
      setMessage('Error al crear usuario');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setForm({ username: '', name: '', lastname: '', phone: '', email: '', password: '', role: 'operator' });
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title">Usuarios</h1>
        <button onClick={() => resetForm()} className="btn btn-primary">
          {showForm ? 'Cancelar' : 'Nuevo Usuario'}
        </button>
      </div>

      {message && (
        <div style={{ padding: '1rem', borderRadius: '8px', marginBottom: '1rem', background: message.includes('exitosamente') ? '#dcfce7' : '#fee2e2', color: message.includes('exitosamente') ? '#16a34a' : '#dc2626' }}>
          {message}
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Usuario</label>
                <input
                  type="text"
                  className="input"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="usuario123"
                  required
                  disabled={!!editingUser}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input
                  type="text"
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Juan"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Apellido</label>
                <input
                  type="text"
                  className="input"
                  value={form.lastname}
                  onChange={(e) => setForm({ ...form, lastname: e.target.value })}
                  placeholder="Pérez"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input
                  type="text"
                  className="input"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="3512345678"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="juan@ejemplo.com"
                />
              </div>
              {!editingUser && (
                <div className="form-group">
                  <label className="form-label">Contraseña</label>
                  <input
                    type="password"
                    className="input"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="******"
                    required={!editingUser}
                  />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Rol</label>
                <select
                  className="input"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="operator">Operador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editingUser ? 'Actualizar' : 'Crear Usuario'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <table className="table table-mobile-card">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Rol</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center' }}>No hay usuarios. Creá uno nuevo.</td>
              </tr>
            ) : (
              users.map(u => (
                <tr key={u.id}>
                  <td data-label="Usuario" style={{ fontWeight: 500 }}>@{u.username}</td>
                  <td data-label="Nombre">{u.name} {u.lastname}</td>
                  <td data-label="Teléfono">{u.phone}</td>
                  <td data-label="Rol">
                    <span className={`badge ${u.role === 'admin' ? 'badge-primary' : 'badge-secondary'}`}>
                      {u.role === 'admin' ? 'Admin' : 'Operador'}
                    </span>
                  </td>
                  <td data-label="Acciones">
                    <div className="table-actions">
                      <button onClick={() => handleEdit(u)} className="icon-action-button secondary" title="Editar">✏️</button>
                    </div>
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