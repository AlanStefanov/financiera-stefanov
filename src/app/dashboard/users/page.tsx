'use client';

import { useEffect, useState } from 'react';

interface User {
  id: number;
  username: string;
  name: string;
  lastname: string;
  phone: string;
  role: string;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    lastname: '',
    phone: '',
    password: '',
    role: 'operator'
  });

  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const resetForm = () => {
    setFormData({ username: '', name: '', lastname: '', phone: '', password: '', role: 'operator' });
    setEditingUser(null);
    setShowForm(false);
    setFormMessage(null);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      name: user.name,
      lastname: user.lastname,
      phone: user.phone,
      password: '',
      role: user.role
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting user form:', formData);
    try {
      const token = localStorage.getItem('token');
      console.log('Token:', token ? 'present' : 'missing');
      
      if (editingUser) {
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });
        console.log('Edit response status:', res.status);
        const data = await res.json();
        console.log('Edit response:', data);
        alert(`Edit: ${res.status} - ${data.message || JSON.stringify(data)}`);
        if (res.ok) {
          resetForm();
          fetchUsers();
          setFormMessage({ type: 'success', text: 'Usuario actualizado exitosamente' });
        } else {
          setFormMessage({ type: 'error', text: data.message || 'Error al actualizar usuario' });
        }
      } else {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });
        console.log('Create response status:', res.status);
        const data = await res.json();
        console.log('Create response:', data);
        alert(`Create: ${res.status} - ${data.message || JSON.stringify(data)}`);
        if (res.ok) {
          resetForm();
          fetchUsers();
          setFormMessage({ type: 'success', text: 'Usuario guardado exitosamente' });
        } else {
          setFormMessage({ type: 'error', text: data.message || 'Error al guardar usuario' });
        }
      }
    } catch (error) {
      console.error('Error saving user:', error);
      alert(`Error: ${error}`);
      setFormMessage({ type: 'error', text: 'Error de conexión' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Usuarios</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn btn-primary">
          {showForm ? 'Cancelar' : 'Nuevo Usuario'}
        </button>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Nombre de Usuario</label>
                <input
                  type="text"
                  className="input"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Nombre</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Apellido</label>
                <input
                  type="text"
                  className="input"
                  value={formData.lastname}
                  onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Teléfono</label>
                <input
                  type="tel"
                  className="input"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Contraseña {editingUser ? '(dejar vacío para mantener)' : ''}
                </label>
                <input
                  type="password"
                  className="input"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Rol</label>
                <select
                  className="input"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="operator">Operador de Crédito</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              {editingUser ? 'Actualizar' : 'Guardar'}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <table className="table table-mobile-card">
          <thead>
            <tr>
              <th>ID</th>
              <th>Usuario</th>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Teléfono</th>
              <th>Rol</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center' }}>No hay usuarios</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td data-label="ID">{user.id}</td>
                  <td data-label="Usuario">{user.username}</td>
                  <td data-label="Nombre">{user.name}</td>
                  <td data-label="Apellido">{user.lastname}</td>
                  <td data-label="Teléfono">{user.phone}</td>
                  <td data-label="Rol">
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      background: user.role === 'admin' ? '#dbeafe' : '#f1f5f9',
                      color: user.role === 'admin' ? '#2563eb' : '#64748b',
                    }}>
                      {user.role === 'admin' ? 'Administrador' : 'Operador'}
                    </span>
                  </td>
                  <td data-label="Acciones">
                    <button
                      onClick={() => handleEdit(user)}
                      className="btn btn-primary"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="btn btn-danger"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                    >
                      Eliminar
                    </button>
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
