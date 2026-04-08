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

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este tipo de préstamo?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/loan-types/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchLoanTypes();
    } catch (error) {
      console.error('Error deleting loan type:', error);
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
                  <td data-label="Modalidad">{lt.modality === 'daily' ? 'Diario' : 'Semanal'}</td>
                  <td data-label="Costo">{lt.interest_percentage}%</td>
                  <td data-label="Estado">
                    <span className={`badge ${lt.is_active ? 'badge-success' : 'badge-secondary'}`}>
                      {lt.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td data-label="Acciones">
                    <button
                      onClick={() => handleEdit(lt)}
                      className="btn btn-secondary"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleToggleActive(lt.id, lt.is_active)}
                      className="btn btn-primary"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                    >
                      {lt.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      onClick={() => handleDelete(lt.id)}
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
