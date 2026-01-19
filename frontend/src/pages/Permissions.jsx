import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const OBJECT_TYPES = ['LEVELS', 'MATERIALS', 'NOTES', 'PHOTOS', 'DOCUMENTS'];
const PERMISSION_LEVELS = [
  { value: 'R', label: 'Leitura', color: '#f59e0b' },
  { value: 'W', label: 'Escrita', color: '#10b981' }
];

export default function Permissions() {
  const { token, user } = useAuth();
  const [obras, setObras] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedObra, setSelectedObra] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedObra, setExpandedObra] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTermUsers, setSearchTermUsers] = useState('');
  const [showUsersDropdown, setShowUsersDropdown] = useState(false);

  // Apenas admin pode acessar
  useEffect(() => {
    if (user?.role !== 'A') {
      setError('Acesso negado. Apenas administradores podem gerir permissões.');
      return;
    }
    loadData();
  }, [token, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar todas as obras
      const obrasRes = await fetch('/api/levels?parentId=', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!obrasRes.ok) throw new Error('Erro ao carregar obras');
      const obrasData = await obrasRes.json();
      setObras(obrasData.filter(o => o.status !== 'completed'));
    } catch (err) {
      setError(`Erro ao carregar dados: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async (levelId) => {
    try {
      // Carregar permissões da obra
      const res = await fetch(`/api/permissions/level/${levelId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao carregar permissões');
      const data = await res.json();
      console.log('Permissões carregadas:', data);
      
      // Estruturar permissões por userId
      const permMap = {};
      data.forEach(p => {
        if (!permMap[p.userId]) permMap[p.userId] = {};
        permMap[p.userId][p.objectType] = p.permissionLevel;
      });
      console.log('permMap estruturado:', permMap);
      
      // Carregar apenas os users associados a esta obra
      const usersRes = await fetch(`/api/permissions/level/${levelId}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!usersRes.ok) throw new Error('Erro ao carregar utilizadores da obra');
      const usersData = await usersRes.json();
      setUsers(usersData);
      
      setPermissions(permMap);
      setSelectedObra(levelId);
      setExpandedObra(levelId);
      setSelectedUsers([]); // Limpar seleção de users
    } catch (err) {
      setError(`Erro ao carregar permissões: ${err.message}`);
    }
  };

  const handlePermissionChange = async (userId, objectType, newPermission) => {
    try {
      setError('');
      setSuccess('');

      // Atribuir permissão
      const res = await fetch('/api/permissions/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          levelId: selectedObra,
          objectType,
          permission: newPermission
        })
      });
      if (!res.ok) throw new Error('Erro ao atribuir permissão');

      // Atualizar estado local
      setPermissions(prev => {
        const newPerms = { ...prev };
        if (!newPerms[userId]) newPerms[userId] = {};
        newPerms[userId][objectType] = newPermission;
        return newPerms;
      });

      setSuccess(`Permissão atualizada!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllFilteredUsers = () => {
    const filtered = users.filter(u =>
      u.email.toLowerCase().includes(searchTermUsers.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(searchTermUsers.toLowerCase()))
    );
    setSelectedUsers(filtered.map(u => u.id));
  };

  const clearUserSelection = () => {
    setSelectedUsers([]);
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
    <div className="permissions-page">
      <style>{`
        .permissions-page {
          padding: 32px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .permissions-header {
          margin-bottom: 32px;
        }

        .permissions-header h1 {
          font-size: 2rem;
          font-weight: 700;
          margin: 0 0 8px 0;
        }

        .permissions-header p {
          color: #6b7280;
          margin: 0;
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

        .search-container {
          margin-bottom: 24px;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px;
          font-size: 1rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          transition: all 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .search-input::placeholder {
          color: #9ca3af;
        }

        .users-filter-container {
          margin-bottom: 24px;
          position: relative;
        }

        .users-filter-button {
          width: 100%;
          padding: 12px 16px;
          font-size: 1rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          transition: all 0.2s;
        }

        .users-filter-button:hover {
          border-color: #3b82f6;
        }

        .users-filter-button.active {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .users-filter-icon {
          font-size: 1.2rem;
          transition: transform 0.2s;
        }

        .users-filter-icon.open {
          transform: rotate(180deg);
        }

        .users-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #d1d5db;
          border-top: none;
          border-radius: 0 0 8px 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          z-index: 10;
          max-height: 400px;
          overflow-y: auto;
        }

        .users-dropdown-search {
          padding: 12px 16px;
          border-bottom: 1px solid #e5e7eb;
          position: sticky;
          top: 0;
          background: white;
          z-index: 11;
        }

        .users-dropdown-search input {
          width: 100%;
          padding: 8px 12px;
          font-size: 0.9rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          box-sizing: border-box;
        }

        .users-dropdown-search input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .users-dropdown-actions {
          padding: 8px 16px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          gap: 8px;
          background: #f9fafb;
        }

        .users-dropdown-actions button {
          flex: 1;
          padding: 6px 12px;
          font-size: 0.8rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .users-dropdown-actions button:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
        }

        .users-dropdown-list {
          padding: 8px 0;
        }

        .users-dropdown-item {
          padding: 8px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .users-dropdown-item:hover {
          background: #f3f4f6;
        }

        .users-dropdown-item input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #3b82f6;
        }

        .users-dropdown-item label {
          flex: 1;
          cursor: pointer;
          font-size: 0.9rem;
          color: #1f2937;
        }

        .users-selected-count {
          font-size: 0.85rem;
          color: #6b7280;
          margin-left: auto;
        }

        .obras-list {
          display: grid;
          gap: 16px;
        }

        .obra-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .obra-header {
          padding: 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: opacity 0.2s;
        }

        .obra-header:hover {
          opacity: 0.9;
        }

        .obra-title {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0;
        }

        .obra-toggle {
          font-size: 1.5rem;
          transition: transform 0.2s;
        }

        .obra-toggle.open {
          transform: rotate(180deg);
        }

        .obra-content {
          padding: 24px;
          display: none;
        }

        .obra-content.open {
          display: block;
        }

        .permissions-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 16px;
        }

        .permissions-table thead {
          background: #f9fafb;
          border-bottom: 2px solid #e5e7eb;
        }

        .permissions-table th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .permissions-table td {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
        }

        .permissions-table tbody tr:hover {
          background: #f9fafb;
        }

        .user-name {
          font-weight: 500;
        }

        .user-role {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .permission-btn {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin: 2px;
        }

        .permission-btn.active {
          color: white;
        }

        .permission-btn.inactive {
          background: #e5e7eb;
          color: #9ca3af;
        }

        .empty-state {
          text-align: center;
          padding: 48px 32px;
          color: #6b7280;
        }

        .loading-text {
          text-align: center;
          padding: 32px;
          color: #6b7280;
        }

        .permission-cell {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }

        .legend {
          background: #f9fafb;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.875rem;
        }

        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 2px;
        }
      `}</style>

      <div className="permissions-header">
        <h1>🔐 Gestão de Permissões</h1>
        <p>Atribua permissões de acesso aos utilizadores por obra</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="users-filter-container">
        <button
          className={`users-filter-button ${showUsersDropdown ? 'active' : ''}`}
          onClick={() => setShowUsersDropdown(!showUsersDropdown)}
        >
          <span>
            👥 Filtrar Trabalhadores
            {selectedUsers.length > 0 && (
              <span className="users-selected-count">
                {' '} ({selectedUsers.length} selecionado{selectedUsers.length !== 1 ? 's' : ''})
              </span>
            )}
          </span>
          <span className={`users-filter-icon ${showUsersDropdown ? 'open' : ''}`}>▼</span>
        </button>

        {showUsersDropdown && (
          <div className="users-dropdown">
            <div className="users-dropdown-search">
              <input
                type="text"
                placeholder="🔍 Procurar trabalhador..."
                value={searchTermUsers}
                onChange={(e) => setSearchTermUsers(e.target.value)}
                autoFocus
              />
            </div>

            <div className="users-dropdown-actions">
              <button onClick={selectAllFilteredUsers}>Selecionar Todos</button>
              <button onClick={clearUserSelection}>Limpar</button>
            </div>

            <div className="users-dropdown-list">
              {users.filter(u =>
                u.email.toLowerCase().includes(searchTermUsers.toLowerCase()) ||
                (u.name && u.name.toLowerCase().includes(searchTermUsers.toLowerCase()))
              ).length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af' }}>
                  Nenhum trabalhador encontrado
                </div>
              ) : (
                users.filter(u =>
                  u.email.toLowerCase().includes(searchTermUsers.toLowerCase()) ||
                  (u.name && u.name.toLowerCase().includes(searchTermUsers.toLowerCase()))
                ).map(u => (
                  <div key={u.id} className="users-dropdown-item">
                    <input
                      type="checkbox"
                      id={`user-${u.id}`}
                      checked={selectedUsers.includes(u.id)}
                      onChange={() => toggleUserSelection(u.id)}
                    />
                    <label htmlFor={`user-${u.id}`}>
                      {u.name || u.email}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="legend">
        {PERMISSION_LEVELS.map(level => (
          <div key={level.value} className="legend-item">
            <div className="legend-color" style={{ backgroundColor: level.color }}></div>
            <span>{level.label}</span>
          </div>
        ))}
      </div>

      <div className="search-container">
        <input
          type="text"
          placeholder="🔍 Procurar obra..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {loading ? (
        <div className="loading-text">A carregar...</div>
      ) : obras.length === 0 ? (
        <div className="empty-state">
          <p>Nenhuma obra encontrada</p>
        </div>
      ) : (
        <div className="obras-list">
          {obras.filter(obra => 
            obra.name.toLowerCase().includes(searchTerm.toLowerCase())
          ).length === 0 ? (
            <div className="empty-state">
              <p>Nenhuma obra encontrada com "{searchTerm}"</p>
            </div>
          ) : (
            obras.filter(obra => 
              obra.name.toLowerCase().includes(searchTerm.toLowerCase())
            ).map(obra => (
            <div key={obra.id} className="obra-card">
              <div
                className="obra-header"
                onClick={() => {
                  if (expandedObra === obra.id) {
                    setExpandedObra(null);
                  } else {
                    loadPermissions(obra.id);
                  }
                }}
              >
                <h2 className="obra-title">{obra.name}</h2>
                <span className={`obra-toggle ${expandedObra === obra.id ? 'open' : ''}`}>
                  ▼
                </span>
              </div>

              {expandedObra === obra.id && (
                <div className="obra-content open">
                  {users.length === 0 ? (
                    <p style={{ color: '#6b7280' }}>Nenhum utilizador disponível</p>
                  ) : (
                    <table className="permissions-table">
                      <thead>
                        <tr>
                          <th>Utilizador</th>
                          {OBJECT_TYPES.map(objType => (
                            <th key={objType}>{objType}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedUsers.length > 0 ? users.filter(u => selectedUsers.includes(u.id)) : users).map(u => (
                          <tr key={u.id}>
                            <td>
                              <div className="user-name">{u.name}</div>
                              <div className="user-role">{u.email}</div>
                            </td>
                            {OBJECT_TYPES.map(objType => (
                              <td key={`${u.id}-${objType}`}>
                                <div className="permission-cell">
                                  {PERMISSION_LEVELS.map(level => (
                                    <button
                                      key={level.value}
                                      className={`permission-btn ${
                                        (permissions[u.id]?.[objType] || 'N') === level.value
                                          ? 'active'
                                          : 'inactive'
                                      }`}
                                      style={{
                                        backgroundColor:
                                          (permissions[u.id]?.[objType] || 'N') === level.value
                                            ? level.color
                                            : '#e5e7eb',
                                        color:
                                          (permissions[u.id]?.[objType] || 'N') === level.value
                                            ? 'white'
                                            : '#9ca3af'
                                      }}
                                      onClick={() => handlePermissionChange(u.id, objType, level.value)}
                                      title={level.label}
                                    >
                                      {level.value}
                                    </button>
                                  ))}
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
