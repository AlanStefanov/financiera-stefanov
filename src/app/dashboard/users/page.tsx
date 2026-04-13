'use client';

import { useEffect, useState } from 'react';
import { useSnackbar } from '@/components/Snackbar';

interface User {
  id: number;
  username: string;
  name: string;
  lastname: string;
  phone: string;
  email?: string;
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
    email: '',
    password: '',
    role: 'operator'
  });

  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean; id: number | null }>({ show: false, id: null });
  const { showSnackbar } = useSnackbar();

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
    setFormData({ username: '', name: '', lastname: '', phone: '', email: '', password: '', role: 'operator' });
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
      email: user.email || '',
      password: '',
      role: user.role
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      if (editingUser) {
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (res.ok) {
          resetForm();
          fetchUsers();
          showSnackbar('Usuario actualizado exitosamente');
        } else {
          showSnackbar(data.message || 'Error al actualizar usuario', 'error');
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
        const data = await res.json();
        if (res.ok) {
          resetForm();
          fetchUsers();
          showSnackbar('Usuario guardado exitosamente');
        } else {
          showSnackbar(data.message || 'Error al guardar usuario', 'error');
        }
      }
    } catch (error) {
      console.error('Error saving user:', error);
      showSnackbar('Error de conexión', 'error');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete.id) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/users/${confirmDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setConfirmDelete({ show: false, id: null });
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
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email</label>
                <input
                  type="email"
                  className="input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
              <th>Email</th>
              <th>Rol</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center' }}>No hay usuarios</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td data-label="ID">{user.id}</td>
                  <td data-label="Usuario">{user.username}</td>
                  <td data-label="Nombre">{user.name}</td>
                  <td data-label="Apellido">{user.lastname}</td>
                  <td data-label="Teléfono">{user.phone}</td>
                  <td data-label="Email">{user.email || '-'}</td>
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
                    <div className="table-actions">
                      <button
                        onClick={() => handleEdit(user)}
                        className="icon-action-button"
                        title="Editar"
                        aria-label="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ show: true, id: user.id })}
                        className="icon-action-button danger"
                        title="Eliminar"
                        aria-label="Eliminar"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
              ¿Estás seguro de que deseas eliminar este usuario?
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
