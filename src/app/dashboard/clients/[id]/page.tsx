'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';

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

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '', cuil: '', dni_front: '', dni_back: '' });
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [consultingBcra, setConsultingBcra] = useState(false);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const fetchClient = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/clients/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setClient(data);
        setForm({
          name: data.name || '',
          phone: data.phone || '',
          address: data.address || '',
          cuil: data.cuil || '',
          dni_front: '',
          dni_back: '',
        });
      }
    } catch (error) {
      console.error('Error fetching client:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClient();
  }, [params.id]);

  const compressImage = (base64Data: string, maxSizeKB: number = 512): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
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
      const updateData: any = { name: form.name, phone: form.phone, address: form.address, cuil: form.cuil };
      if (form.dni_front) updateData.dni_front = form.dni_front;
      if (form.dni_back) updateData.dni_back = form.dni_back;

      const res = await fetch(`/api/clients/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        setEditing(false);
        fetchClient();
        setFormMessage({ type: 'success', text: 'Cliente actualizado exitosamente' });
      } else {
        const data = await res.json();
        setFormMessage({ type: 'error', text: data.message || 'Error al actualizar cliente' });
      }
    } catch (error) {
      console.error('Error saving client:', error);
    }
  };

  const handleConsultBcra = async () => {
    if (!client?.cuil) {
      alert('El cliente no tiene CUIL registrado');
      return;
    }

    setConsultingBcra(true);

    try {
      const res = await fetch('/api/bcra-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuil: client.cuil })
      });
      
      const data = await res.json();
      setConsultingBcra(false);
      
      if (res.ok && data.status) {
        await fetch(`/api/clients/${params.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ bcra_status: data.status })
        });
        fetchClient();
        alert(`Estado BCRA: ${data.status}\nTotal deuda: $${data.totalDeuda?.toFixed(2) || 0}\nEntidades: ${data.entidades?.length || 0}`);
      } else {
        const errMsg = data.message || data.error || 'Error al consultar BCRA';
        alert(errMsg + (data.trying ? ' (El servicio está temporalmente no disponible, intente más tarde)' : ''));
      }
    } catch (error) {
      setConsultingBcra(false);
      console.error('BCRA check error:', error);
      alert('Error al consultar BCRA');
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer.')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/clients/${params.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        router.push('/dashboard/clients');
      } else {
        const data = await res.json();
        alert(data.message || 'Error al eliminar cliente');
      }
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  };

  const handleToggleActive = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/clients/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: client?.is_active === 0 ? 1 : 0 }),
      });
      fetchClient();
    } catch (error) {
      console.error('Error toggling client:', error);
    }
  };

  if (loading) return <div>Cargando...</div>;
  if (!client) return <div>Cliente no encontrado</div>;

  return (
    <div>
      <button onClick={() => router.push('/dashboard/clients')} className="btn btn-secondary" style={{ marginBottom: '1rem' }}>
        ← Volver
      </button>

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

      {editing ? (
        <div className="card">
          <h2 style={{ marginBottom: '1rem' }}>Editar Cliente</h2>
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
                  maxLength={11}
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
                {(client.dni_front || form.dni_front) && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <img src={form.dni_front || client.dni_front} alt="DNI frente" style={{ width: '200px', maxWidth: '100%', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
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
                {(client.dni_back || form.dni_back) && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <img src={form.dni_back || client.dni_back} alt="DNI dorso" style={{ width: '200px', maxWidth: '100%', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
                  </div>
                )}
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Guardar Cambios</button>
              <button type="button" onClick={() => setEditing(false)} className="btn btn-secondary" style={{ marginLeft: '0.5rem' }}>Cancelar</button>
            </div>
          </form>
        </div>
      ) : (
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h1 style={{ margin: 0 }}>{client.name}</h1>
                <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>ID: {client.id}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setEditing(true)} title="Editar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', fontSize: '1.5rem' }}>
                  ✏️
                </button>
                <button onClick={handleDelete} title="Eliminar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', fontSize: '1.5rem' }}>
                  🗑️
                </button>
                <button onClick={handleToggleActive} title={client.is_active === 0 ? 'Activar' : 'Desactivar'} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', fontSize: '1.5rem' }}>
                  {client.is_active === 0 ? '✅' : '❌'}
                </button>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Fotos del DNI</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <p style={{ fontWeight: 500, marginBottom: '0.5rem' }}>Frente</p>
                {client.dni_front ? (
                  <img src={client.dni_front} alt="DNI frente" style={{ width: '100%', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
                ) : (
                  <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--background)', borderRadius: 'var(--radius)', color: 'var(--text-secondary)' }}>Sin imagen</div>
                )}
              </div>
              <div>
                <p style={{ fontWeight: 500, marginBottom: '0.5rem' }}>Dorso</p>
                {client.dni_back ? (
                  <img src={client.dni_back} alt="DNI dorso" style={{ width: '100%', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
                ) : (
                  <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--background)', borderRadius: 'var(--radius)', color: 'var(--text-secondary)' }}>Sin imagen</div>
                )}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Estado BCRA</h3>
              {client.cuil && (
                <button
                  onClick={handleConsultBcra}
                  disabled={consultingBcra}
                  className="btn btn-primary"
                >
                  {consultingBcra ? 'Consultando...' : 'Consultar BCRA'}
                </button>
              )}
            </div>
            <div style={{ padding: '1rem', background: 'var(--background)', borderRadius: 'var(--radius)' }}>
              {client.bcra_status ? (
                <>
                  <div style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>{client.bcra_status}</div>
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Última actualización: {new Date(client.bcra_updated_at || client.created_at).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</p>
                </>
              ) : client.cuil ? (
                <p style={{ color: 'var(--text-secondary)' }}>Sin consultar. Presione "Consultar BCRA" para verificar el estado.</p>
              ) : (
                <p style={{ color: 'var(--text-secondary)' }}>No hay CUIL registrado</p>
              )}
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Detalles</h3>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div><strong>Teléfono:</strong> {client.phone}</div>
              <div><strong>Dirección:</strong> {client.address || '-'}</div>
              <div><strong>CUIL:</strong> {client.cuil || '-'}</div>
              <div><strong>Creado por:</strong> {client.creator_name} {client.creator_lastname}</div>
              <div><strong>Fecha de creación:</strong> {new Date(client.created_at).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</div>
              <div><strong>Estado:</strong> {client.is_active === 0 ? '❌ Desactivado' : '✅ Activo'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}