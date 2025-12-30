import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Equipa() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [work, setWork] = useState(null);
  const [users, setUsers] = useState([]);
  const [levelUsers, setLevelUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWork();
    fetchUsers();
    fetchLevelUsers();
  }, [id]);

  const fetchWork = async () => {
    try {
      const res = await fetch(`/api/levels/${id}`);
      if (res.ok) {
        const data = await res.json();
        setWork(data);
      }
    } catch (err) {
      console.error('Erro ao carregar obra:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Erro ao carregar utilizadores:', err);
    }
  };

  const fetchLevelUsers = async () => {
    try {
      const res = await fetch(`/api/level-users/level/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLevelUsers(data);
      }
    } catch (err) {
      console.error('Erro ao carregar associações:', err);
    }
  };

  const handleAddLevelUser = async (e) => {
    e.preventDefault();
    if (!selectedUserId) return;
    try {
      const res = await fetch('/api/level-users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ levelId: id, userId: selectedUserId })
      });
      if (res.ok) {
        await fetchLevelUsers();
        setSelectedUserId('');
      } else {
        alert('Erro ao associar utilizador');
      }
    } catch (err) {
      alert('Erro ao associar utilizador: ' + err.message);
    }
  };

  const handleRemoveLevelUser = async (assocId) => {
    if (!confirm('Remover associação?')) return;
    try {
      const res = await fetch(`/api/level-users/${assocId}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchLevelUsers();
      } else {
        alert('Erro ao remover associação');
      }
    } catch (err) {
      alert('Erro ao remover associação: ' + err.message);
    }
  };

  return (
    <div className="ml-bg">
      <div className="ml-container" style={{maxWidth: '1100px', margin: '0 auto'}}>
        <button onClick={() => navigate('/obras')} className="ml-back-btn">← Obras</button>
        <h1 className="ml-title">Equipa da Obra</h1>
        {work && <p className="ml-subtitle">{work.name}</p>}

        <div className="ml-section-header">
          <h2>Associar Utilizadores</h2>
        </div>
        <form onSubmit={handleAddLevelUser} className="ml-form">
          <div className="ml-field">
            <label>Selecionar Utilizador</label>
            <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
              <option value="">-- Escolha um utilizador --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email} {u.Car ? `(${u.Car})` : ''}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="ml-btn" disabled={loading || !selectedUserId}>
            Associar
          </button>
        </form>

        <div className="ml-section-header" style={{marginTop: '24px'}}>
          <h2>Equipa Associada</h2>
        </div>
        <div className="ml-list">
          {levelUsers.length === 0 ? (
            <p className="ml-empty">Nenhum utilizador associado.</p>
          ) : (
            levelUsers.map((lu) => (
              <div key={lu.id} className="ml-doc-card">
                <div className="ml-doc-info">
                  <h3>{lu.name || lu.email}</h3>
                  <p className="ml-doc-type">Email: {lu.email}</p>
                  {lu.Car && <p className="ml-doc-type">Carro: {lu.Car}</p>}
                </div>
                <div className="ml-item-actions">
                  <button onClick={() => handleRemoveLevelUser(lu.id)} className="ml-btn-delete" title="Remover">🗑️</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        .ml-bg { min-height: 100vh; background: #f8fafc; padding: 20px; }
        .ml-container { background: #fff; border-radius: 12px; box-shadow: 0 2px 16px #0001; padding: 32px; }
        .ml-back-btn { background: #e2e8f0; border: none; border-radius: 6px; padding: 8px 16px; cursor: pointer; font-size: 0.95rem; margin-bottom: 16px; }
        .ml-title { font-size: 2rem; font-weight: 700; color: #1e293b; margin: 0 0 8px; }
        .ml-subtitle { color: #64748b; margin: 0 0 16px; }
        .ml-section-header { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
        .ml-form { background: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0; }
        .ml-field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
        .ml-btn { background: linear-gradient(90deg, #6366f1 0%, #2563eb 100%); color: #fff; border: none; border-radius: 8px; padding: 10px 16px; font-weight: 600; cursor: pointer; }
        .ml-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-top: 12px; }
        .ml-doc-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); padding: 16px; }
        .ml-doc-info h3 { margin: 0 0 4px; }
        .ml-doc-type { color: #94a3b8; margin: 2px 0; }
        .ml-item-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
        .ml-btn-delete { background: #fee2e2; color: #dc2626; border: none; border-radius: 6px; padding: 8px 10px; cursor: pointer; }
        .ml-empty { color: #64748b; }
      `}</style>
    </div>
  );
}
