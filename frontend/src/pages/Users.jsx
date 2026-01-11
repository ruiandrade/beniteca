import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Users() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    status: 'O'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Apenas admin pode acessar
  useEffect(() => {
    if (user?.role !== 'A') {
      setError('Acesso negado. Apenas administradores podem gerir utilizadores.');
      return;
    }
    loadUsers();
  }, [token, user]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao carregar utilizadores');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(`Erro ao carregar utilizadores: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validação básica
    if (!formData.email || !formData.name || !formData.password) {
      setError('Todos os campos são obrigatórios');
      return;
    }

    try {
      const res = await fetch('/api/auth/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao criar utilizador');
      }

      setSuccess('Utilizador criado com sucesso!');
      setFormData({ email: '', name: '', password: '', status: 'O' });
      setShowForm(false);
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleActive = async (u) => {
    if (u.id === user?.id && u.active) {
      setError('Não pode desativar a sua própria conta.');
      return;
    }
    const nextActive = !u.active;
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ active: nextActive })
      });
      if (!res.ok) throw new Error('Erro ao atualizar utilizador');
      setSuccess(nextActive ? 'Utilizador reativado com sucesso!' : 'Utilizador desativado com sucesso!');
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  if (user?.role !== 'A') {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <h1>🔒 Acesso Negado</h1>
        <p>Apenas administradores podem aceder a esta página.</p>
      </div>
    );
  }

  return (
    <div className="users-page">
      <style>{`
        .users-page {
          padding: 32px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .users-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .users-header h1 {
          font-size: 2rem;
          font-weight: 700;
          margin: 0;
        }

        .btn-create {
          background: #4f46e5;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-create:hover {
          background: #4338ca;
        }

        .alert {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-weight: 500;
        }

        .alert-error {
          background: #fee2e2;
          color: #991b1b;
        }

        .alert-success {
          background: #dcfce7;
          color: #166534;
        }

        .form-container {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 32px;
        }

        .form-title {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .form-group label {
          font-weight: 500;
          font-size: 0.875rem;
        }

        .form-group input,
        .form-group select {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 1rem;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .btn-primary, .btn-secondary {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #4f46e5;
          color: white;
        }

        .btn-primary:hover {
          background: #4338ca;
        }

        .btn-secondary {
          background: #e5e7eb;
          color: #374151;
        }

        .btn-secondary:hover {
          background: #d1d5db;
        }

        .users-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .users-table thead {
          background: #f9fafb;
          border-bottom: 2px solid #e5e7eb;
        }

        .users-table th {
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .users-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #e5e7eb;
        }

        .users-table tbody tr:hover {
          background: #f9fafb;
        }

        .role-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .role-admin {
          background: #dbeafe;
          color: #1e40af;
        }

        .role-other {
          background: #fef3c7;
          color: #92400e;
        }

        .role-client {
          background: #e9f8ec; /* soft green for client */
          color: #166534;
        }

        .btn-delete {
          background: #ef4444;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-delete:hover {
          background: #dc2626;
        }

        .empty-state {
          text-align: center;
          padding: 48px 32px;
          color: #6b7280;
        }

        .empty-state p {
          margin: 0;
        }

        .loading-text {
          text-align: center;
          padding: 32px;
          color: #6b7280;
        }
      `}</style>

      <div className="users-header">
        <div>
          <h1>👥 Gerir Utilizadores</h1>
          <p style={{ margin: '8px 0 0 0', color: '#6b7280' }}>Total: {users.length} utilizadores</p>
        </div>
        <button className="btn-create" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancelar' : '➕ Novo Utilizador'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="form-container">
          <div className="form-title">Criar Novo Utilizador</div>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Nome *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select name="status" value={formData.status} onChange={handleInputChange}>
                  <option value="O">Others (Utilizador Normal)</option>
                  <option value="C">Client (Cliente)</option>
                  <option value="A">Admin (Administrador)</option>
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">Criar Utilizador</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading-text">A carregar...</div>
      ) : (
        <>
          {/* Utilizadores Ativos */}
          <div className="users-header" style={{marginTop: '8px'}}>
            <h2 style={{margin: 0}}>Utilizadores Ativos</h2>
            <p style={{margin: 0, color: '#6b7280'}}>Total ativos: {users.filter(u => u.active).length}</p>
          </div>
          {users.filter(u => u.active).length === 0 ? (
            <div className="empty-state"><p>Nenhum utilizador ativo</p></div>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Nome</th>
                  <th>Role</th>
                  <th>Ativo</th>
                  <th>Criado</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.filter(u => u.active).map(u => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>{u.name}</td>
                    <td>
                      <span className={`role-badge role-${u.status === 'A' ? 'admin' : u.status === 'C' ? 'client' : 'other'}`}>
                        {u.status === 'A' ? 'Admin' : u.status === 'C' ? 'Cliente' : 'Utilizador'}
                      </span>
                    </td>
                    <td>Sim</td>
                    <td>{new Date(u.createdAt).toLocaleDateString('pt-PT')}</td>
                    <td>
                      <button
                        className="btn-delete"
                        onClick={() => handleToggleActive(u)}
                        title="Desativar utilizador"
                        disabled={u.id === user?.id}
                      >
                        Desativar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Utilizadores Inativos */}
          <div className="users-header" style={{marginTop: '24px'}}>
            <h2 style={{margin: 0}}>Utilizadores Inativos</h2>
            <p style={{margin: 0, color: '#6b7280'}}>Total inativos: {users.filter(u => !u.active).length}</p>
          </div>
          {users.filter(u => !u.active).length === 0 ? (
            <div className="empty-state"><p>Nenhum utilizador inativo</p></div>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Nome</th>
                  <th>Role</th>
                  <th>Ativo</th>
                  <th>Criado</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.filter(u => !u.active).map(u => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>{u.name}</td>
                    <td>
                      <span className={`role-badge role-${u.status === 'A' ? 'admin' : u.status === 'C' ? 'client' : 'other'}`}>
                        {u.status === 'A' ? 'Admin' : u.status === 'C' ? 'Cliente' : 'Utilizador'}
                      </span>
                    </td>
                    <td>Não</td>
                    <td>{new Date(u.createdAt).toLocaleDateString('pt-PT')}</td>
                    <td>
                      <button
                        className="btn-secondary"
                        onClick={() => handleToggleActive(u)}
                        title="Reativar utilizador"
                      >
                        Reativar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
