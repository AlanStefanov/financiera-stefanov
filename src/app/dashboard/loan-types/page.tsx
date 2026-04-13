'use client';

import { useEffect, useState } from 'react';

interface LoanType {
  id: number;
  name: string;
  duration_months: number;
  modality: string;
  interest_percentage: number;
  is_active: number;
}

export default function LoanTypesPage() {
  const [loanTypes, setLoanTypes] = useState<LoanType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState<LoanType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    duration_months: 1,
    modality: 'daily',
    interest_percentage: 30
  });
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean; id: number | null }>({ show: false, id: null });

  const fetchLoanTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/loan-types', {
        headers: { Authorization: `Bearer ${token}` },
      });
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

  useEffect(() => {
    fetchLoanTypes();
  }, []);

  const resetForm = () => {
    setFormData({ name: '', duration_months: 1, modality: 'daily', interest_percentage: 30 });
    setEditingType(null);
    setShowForm(false);
  };

  const handleEdit = (lt: LoanType) => {
    setEditingType(lt);
    setFormData({
      name: lt.name,
      duration_months: lt.duration_months,
      modality: lt.modality,
      interest_percentage: lt.interest_percentage
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      if (editingType) {
        const res = await fetch(`/api/loan-types/${editingType.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          resetForm();
          fetchLoanTypes();
        }
      } else {
        const res = await fetch('/api/loan-types', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          resetForm();
          fetchLoanTypes();
        }
      }
    } catch (error) {
      console.error('Error saving loan type:', error);
    }
  };

  const handleToggleActive = async (id: number, currentStatus: number) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/loan-types/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: currentStatus === 0 ? 1 : 0 }),
      });
      fetchLoanTypes();
    } catch (error) {
      console.error('Error toggling loan type:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete.id) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/loan-types/${confirmDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchLoanTypes();
    } catch (error) {
      console.error('Error deleting loan type:', error);
    } finally {
      setConfirmDelete({ show: false, id: null });
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title">Tipos de Préstamo</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn btn-primary">
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
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Préstamo Personal 1 Mes"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Modalidad</label>
                <select
                  className="input"
                  value={formData.modality}
                  onChange={(e) => setFormData({ ...formData, modality: e.target.value })}
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
                  value={formData.duration_months}
                  onChange={(e) => setFormData({ ...formData, duration_months: parseInt(e.target.value) })}
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
                  value={formData.interest_percentage}
                  onChange={(e) => setFormData({ ...formData, interest_percentage: parseFloat(e.target.value) })}
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
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loanTypes.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center' }}>No hay tipos de préstamo. Agregá uno nuevo.</td>
              </tr>
            ) : (
              loanTypes.map((lt) => (
                <tr key={lt.id}>
                  <td data-label="Nombre" style={{ fontWeight: 500 }}>{lt.name}</td>
                  <td data-label="Duración">{lt.duration_months} mes(es)</td>
                  <td data-label="Modalidad">{lt.modality === 'daily' ? 'Diario' : lt.modality === 'weekly' ? 'Semanal' : 'Mensual'}</td>
                  <td data-label="Costo">{lt.interest_percentage}%</td>
                  <td data-label="Estado">
                    <span className={`badge ${lt.is_active ? 'badge-success' : 'badge-secondary'}`}>
                      {lt.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td data-label="Acciones">
                    <div className="table-actions">
                      <button
                        onClick={() => handleEdit(lt)}
                        className="icon-action-button secondary"
                        title="Editar"
                        aria-label="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleToggleActive(lt.id, lt.is_active)}
                        className="icon-action-button primary"
                        title={lt.is_active ? 'Desactivar' : 'Activar'}
                        aria-label={lt.is_active ? 'Desactivar' : 'Activar'}
                      >
                        {lt.is_active ? '❌' : '✅'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ show: true, id: lt.id })}
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
              ¿Estás seguro de que deseas eliminar este tipo de préstamo?
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
