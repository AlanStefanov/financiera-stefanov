'use client';

import { useEffect, useState, useRef } from 'react';
import NextImage from 'next/image';
import { useSnackbar } from '@/components/Snackbar';

interface Client {
  id: number;
  name: string;
  phone: string;
  address?: string;
  dni_front?: string;
  dni_back?: string;
  cuil?: string;
  bcra_status?: string;
  bcra_updated_at?: string;
  created_by?: number;
  creator_name?: string;
  creator_lastname?: string;
  is_active?: number;
  created_at: string;
}

interface User {
  role: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [user, setUser] = useState<User>({ role: 'operator' });
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', dni_front: '', dni_back: '', cuil: '' });
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [consultingBcra, setConsultingBcra] = useState<number | null>(null);
  const [consultingMassive, setConsultingMassive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean; id: number | null }>({ show: false, id: null });
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const { showSnackbar } = useSnackbar();

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/clients', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setClients(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    fetchClients();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      if (editingClient) {
        const updateData: Partial<Client> = { name: form.name, phone: form.phone, address: form.address, cuil: form.cuil };
        if (form.dni_front) updateData.dni_front = form.dni_front;
        if (form.dni_back) updateData.dni_back = form.dni_back;
        
        const res = await fetch(`/api/clients/${editingClient.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updateData),
        });

        if (res.ok) {
          setForm({ name: '', phone: '', address: '', dni_front: '', dni_back: '', cuil: '' });
          setEditingClient(null);
          setShowForm(false);
          fetchClients();
          showSnackbar('Cliente actualizado exitosamente');
        } else {
          const data = await res.json();
          showSnackbar(data.message || 'Error al actualizar cliente', 'error');
        }
      } else {
        const res = await fetch('/api/clients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        });

        if (res.ok) {
          setForm({ name: '', phone: '', address: '', dni_front: '', dni_back: '', cuil: '' });
          setShowForm(false);
          fetchClients();
          showSnackbar('Cliente guardado exitosamente');
        } else {
          const data = await res.json();
          showSnackbar(data.message || 'Error al guardar cliente', 'error');
        }
      }
    } catch (error) {
      console.error('Error saving client:', error);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setForm({
      name: client.name,
      phone: client.phone,
      address: client.address || '',
      dni_front: '',
      dni_back: '',
      cuil: client.cuil || ''
    });
    setShowForm(true);
  };

  const handleToggleActive = async (id: number, currentStatus: number) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: currentStatus === 0 ? 1 : 0 }),
      });
      fetchClients();
    } catch (error) {
      console.error('Error toggling client:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete.id) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/clients/${confirmDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchClients();
      } else {
        const data = await res.json();
        showSnackbar(data.message || 'Error al eliminar cliente', 'error');
      }
    } catch (error) {
      console.error('Error deleting client:', error);
    } finally {
      setConfirmDelete({ show: false, id: null });
    }
  };

  const handleConsultBcra = async (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    if (!client || !client.cuil) {
      showSnackbar('El cliente no tiene CUIL registrado', 'error');
      return;
    }

    setConsultingBcra(clientId);

    try {
      const res = await fetch('/api/bcra-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuil: client.cuil })
      });
      
      const data = await res.json();
      setConsultingBcra(null);
      
      if (res.ok && data.status) {
        await fetch(`/api/clients/${clientId}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ bcra_status: data.status })
        });
        fetchClients();
        alert(`Estado BCRA: ${data.status}\nTotal deuda: $${data.totalDeuda?.toFixed(2) || 0}\nEntidades: ${data.entidades?.length || 0}`);
      } else {
        const errMsg = data.message || data.error || 'Error al consultar BCRA';
        alert(errMsg + (data.trying ? ' (El servicio está temporalmente no disponible, intente más tarde)' : ''));
      }
    } catch (error) {
      setConsultingBcra(null);
      console.error('BCRA check error:', error);
      alert('Error al consultar BCRA');
    }
  };

  const handleConsultMassive = async () => {
    if (!confirm('¿Consultar BCRA para todos los clientes con CUIL?')) return;
    
    setConsultingMassive(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/bcra-validate-cron', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setConsultingMassive(false);
      fetchClients();
      alert(`Validación BCRA completada:\n- Coincidencias: ${data.matches}\n- Errores: ${data.mismatches}`);
    } catch (error) {
      setConsultingMassive(false);
      console.error('Error en consulta masiva:', error);
      alert('Error al consultar BCRA');
    }
  };

  const resetForm = () => {
    setForm({ name: '', phone: '', address: '', dni_front: '', dni_back: '', cuil: '' });
    setEditingClient(null);
    setShowForm(false);
    setFormMessage(null);
  };
  

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title">Clientes</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {user.role === 'admin' && (
            <button 
              onClick={handleConsultMassive} 
              disabled={consultingMassive}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              {consultingMassive ? '⏳ Consultando...' : '📊 Consultar BCRA'}
            </button>
          )}
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn btn-primary">
            {showForm ? 'Cancelar' : 'Nuevo Cliente'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          {formMessage && (
            <div style={{ 
              padding: '0.75rem 1rem', 
              marginBottom: '1rem', 
              borderRadius: 'var(--radius)',
              background: formMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
              color: 'white'
            }}>
              {formMessage.text}
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
                <label className="form-label">CUIL (solo números)</label>
                <input
                  type="text"
                  className="input"
                  value={form.cuil}
                  onChange={(e) => setForm({ ...form, cuil: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                  placeholder="Sin espacios, solo números"
                  maxLength={11}
                />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Dirección</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="input"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <a
                    href={`https://www.google.com/maps/search/${encodeURIComponent(form.address + ', Buenos Aires, Argentina')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    Buscar
                  </a>
                </div>
                {form.address && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      id="addressValidated"
                      checked={!!form.address}
                      onChange={() => {}}
                      style={{ width: 'auto' }}
                    />
                    <label htmlFor="addressValidated" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      Confirmo que la dirección es válida
                    </label>
                  </div>
                )}
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
              <button type="submit" className="btn btn-primary">
                {editingClient ? 'Actualizar Cliente' : 'Guardar Cliente'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <table className="table table-mobile-card">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>DNI</th>
              <th>CUIL</th>
              <th>Estado BCRA</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center' }}>No hay clientes</td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id}>
                  <td data-label="ID">{client.id}</td>
                  <td data-label="Nombre">
                    <button
                      onClick={() => window.location.href = `/dashboard/clients/${client.id}`}
                      style={{
                        background: 'none', border: 'none', color: 'inherit', cursor: 'pointer',
                        textAlign: 'left', fontWeight: 500, padding: 0, font: 'inherit'
                      }}
                    >
                      {client.name}
                    </button>
                    {client.address && <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{client.address}</div>}
                  </td>
                  <td data-label="Teléfono">{client.phone}</td>
                  <td data-label="DNI">
                    <button 
                      onClick={() => setSelectedClient(client)}
                      style={{ 
                        background: client.dni_front ? 'var(--success)' : 'var(--border)', 
                        color: client.dni_front ? 'white' : 'var(--text-secondary)',
                        border: 'none',
                        padding: '0.25rem 0.75rem',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        fontSize: '0.8125rem'
                      }}
                    >
                      {client.dni_front ? 'Ver DNI' : 'Sin DNI'}
                    </button>
                  </td>
                  <td data-label="CUIL">{client.cuil || '-'}</td>
                  <td data-label="Estado BCRA">
                    {client.bcra_status && !['api_fail', 'no_data', 'Sin deuda', 'error'].includes(client.bcra_status) ? (
                      <span style={{
                        padding: '0.2rem 0.4rem',
                        borderRadius: '3px',
                        fontSize: '0.65rem',
                        background: client.bcra_status === 'Normal' ? '#dcfce7' : client.bcra_status === 'Seguimiento especial' ? '#fef9c3' : '#fee2e2',
                        color: client.bcra_status === 'Normal' ? '#16a34a' : client.bcra_status === 'Seguimiento especial' ? '#ca8a04' : '#dc2626',
                      }}>
                        {client.bcra_status}
                      </span>
                    ) : client.cuil ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                        {client.bcra_status && (
                          <span style={{ fontSize: '0.55rem', color: 'var(--text-secondary)' }}>{client.bcra_status}</span>
                        )}
                        <button
                          onClick={() => handleConsultBcra(client.id)}
                          disabled={consultingBcra === client.id}
                          style={{
                            background: consultingBcra === client.id ? 'var(--text-secondary)' : 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            padding: '0.2rem 0.4rem',
                            borderRadius: 'var(--radius)',
                            cursor: consultingBcra === client.id ? 'wait' : 'pointer',
                            fontSize: '0.65rem'
                          }}
                        >
                          {consultingBcra === client.id ? 'Consultando...' : 'Consultar'}
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Sin CUIL</span>
                    )}
                  </td>
                  <td data-label="Acciones">
                    <div className="table-actions">
                      <button onClick={() => handleEdit(client)} className="icon-action-button" title="Editar" aria-label="Editar">
                        ✏️
                      </button>
                      {user.role === 'admin' && (
                        <>
                          <button onClick={() => setConfirmDelete({ show: true, id: client.id })} className="icon-action-button danger" title="Eliminar" aria-label="Eliminar">
                            🗑️
                          </button>
                          <button onClick={() => handleToggleActive(client.id, client.is_active || 1)} className="icon-action-button secondary" title={client.is_active === 0 ? 'Activar' : 'Desactivar'} aria-label={client.is_active === 0 ? 'Activar' : 'Desactivar'}>
                            {client.is_active === 0 ? '✅' : '❌'}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedClient && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem'
        }} onClick={() => setSelectedClient(null)}>
          <div className="card" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>DNI de {selectedClient.name}</h3>
              <button onClick={() => setSelectedClient(null)} className="btn btn-secondary" style={{ padding: '0.5rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <p style={{ fontWeight: 500, marginBottom: '0.5rem' }}>Frente</p>
                {selectedClient.dni_front ? (
                  <NextImage src={selectedClient.dni_front} alt="DNI frente" width={300} height={200} style={{ width: '100%', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} unoptimized />
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--background)', borderRadius: 'var(--radius)', color: 'var(--text-secondary)' }}>Sin imagen</div>
                )}
              </div>
              <div>
                <p style={{ fontWeight: 500, marginBottom: '0.5rem' }}>Dorso</p>
                {selectedClient.dni_back ? (
                  <NextImage src={selectedClient.dni_back} alt="DNI dorso" width={300} height={200} style={{ width: '100%', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} unoptimized />
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--background)', borderRadius: 'var(--radius)', color: 'var(--text-secondary)' }}>Sin imagen</div>
                )}
              </div>
            </div>
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--background)', borderRadius: 'var(--radius)' }}>
              <p><strong>Cliente:</strong> {selectedClient.name}</p>
              <p><strong>Teléfono:</strong> {selectedClient.phone}</p>
              <p><strong>Creado por:</strong> {selectedClient.creator_name} {selectedClient.creator_lastname}</p>
              <p><strong>Fecha:</strong> {new Date(selectedClient.created_at).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</p>
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
          <div style={{
            background: 'white', borderRadius: '0.5rem', padding: '1.5rem',
            maxWidth: '400px', width: '100%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>Confirmar eliminación</h3>
            <p style={{ margin: '0 0 1.5rem', color: '#666' }}>
              ¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete({ show: false, id: null })} className="btn btn-secondary">
                Cancelar
              </button>
              <button onClick={handleDelete} className="btn btn-danger">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
