import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

export default function PlaneamentoGlobal() {
  const { token } = useAuth();
  const [days, setDays] = useState([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [obras, setObras] = useState([]);
  const [selectedObraId, setSelectedObraId] = useState('all');
  const [obraUsers, setObraUsers] = useState({}); // { obraId: [users] }
  const [allUsers, setAllUsers] = useState([]);
  const [selectedNewUser, setSelectedNewUser] = useState({}); // { obraId: userId }
  const [addingUser, setAddingUser] = useState({}); // { obraId: boolean }
  const [selected, setSelected] = useState(new Set()); // userId::obraId::day::period
  const [expandedObras, setExpandedObras] = useState(new Set());

  const [modal, setModal] = useState({ type: null, title: '', message: '', onConfirm: null, data: null });

  // Map para identificar conflitos locais (mesmo user em múltiplas obras no mesmo dia/período)
  const conflictCounts = useMemo(() => {
    const temp = {};
    selected.forEach((key) => {
      const [userId, obraId, day, period] = key.split('::');
      const base = `${userId}::${day}::${period}`;
      if (!temp[base]) temp[base] = new Set();
      temp[base].add(obraId);
    });
    const counts = {};
    Object.entries(temp).forEach(([base, set]) => {
      counts[base] = set.size;
    });
    return counts;
  }, [selected]);

  useEffect(() => {
    loadObras();
    loadAllUsers();
    const today = new Date();
    const to = new Date();
    to.setDate(today.getDate() + 6);
    const fromIso = today.toISOString().slice(0, 10);
    const toIso = to.toISOString().slice(0, 10);
    setFromDate(fromIso);
    setToDate(toIso);
    handleSelectDates(fromIso, toIso);
  }, [token]);

  const loadObras = async () => {
    try {
      const res = await fetch('/api/permissions/my-works', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const activeObras = data.filter(o => o.status !== 'completed');
        setObras(activeObras);
        
        // Load users for each obra
        const usersMap = {};
        await Promise.all(activeObras.map(async (obra) => {
          try {
            const userRes = await fetch(`/api/level-users/level/${obra.id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (userRes.ok) {
              const userData = await userRes.json();
              usersMap[obra.id] = userData.map(u => ({
                id: u.userId,
                assocId: u.id,
                name: u.name || u.email,
                email: u.email
              }));
            }
          } catch (err) {
            console.error(`Erro ao carregar users da obra ${obra.id}:`, err);
          }
        }));
        setObraUsers(usersMap);
        
        // Expand all obras by default
        setExpandedObras(new Set(activeObras.map(o => o.id)));
      }
    } catch (err) {
      console.error('Erro ao carregar obras:', err);
    }
  };

  const buildDays = (from, to) => {
    const start = new Date(from);
    const end = new Date(to);
    const arr = [];
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      arr.push(dt.toISOString().slice(0, 10));
    }
    return arr;
  };

  const handleSelectDates = async (fromOverride, toOverride) => {
    setError('');
    const fromVal = fromOverride || fromDate;
    const toVal = toOverride || toDate;
    if (!fromVal || !toVal) {
      setError('Indique as duas datas');
      return;
    }
    const from = new Date(fromVal);
    const to = new Date(toVal);
    if (Number.isNaN(from) || Number.isNaN(to) || from > to) {
      setError('Intervalo de datas inválido');
      return;
    }
    setDays(buildDays(fromVal, toVal));
    await loadAllocations(fromVal, toVal);
  };

  const loadAllocations = async (from, to) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/level-user-days?from=${from}&to=${to}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao carregar alocações');
      const data = await res.json();
      
      // Convert to Set format: userId::obraId::day::period
      const nextSelected = new Set();
      data.forEach(alloc => {
        const day = (alloc.day || alloc.theDate || '').slice(0, 10);
        const period = alloc.period || alloc.slot?.charAt(0) || 'm';
        if (day && alloc.userId && alloc.levelId) {
          nextSelected.add(`${alloc.userId}::${alloc.levelId}::${day}::${period}`);
        }
      });
      setSelected(nextSelected);
    } catch (err) {
      setError('Erro ao carregar alocações');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      const res = await fetch('/api/users/managers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data);
      }
    } catch (err) {
      console.error('Erro ao carregar utilizadores:', err);
    }
  };

  const refreshObraUsers = async (obraId) => {
    try {
      const userRes = await fetch(`/api/level-users/level/${obraId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        setObraUsers((prev) => ({
          ...prev,
          [obraId]: userData.map(u => ({
            id: u.userId,
            assocId: u.id,
            name: u.name || u.email,
            email: u.email
          }))
        }));
      }
    } catch (err) {
      console.error('Erro ao atualizar utilizadores da obra:', err);
    }
  };

  const toggleCell = (userId, obraId, day, period) => {
    const key = `${userId}::${obraId}::${day}::${period}`;
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };

  const toggleObraExpanded = (obraId) => {
    const next = new Set(expandedObras);
    if (next.has(obraId)) next.delete(obraId);
    else next.add(obraId);
    setExpandedObras(next);
  };

  const selectAllWeekdays = (userId, obraId) => {
    const next = new Set(selected);
    const weekdays = days.filter(day => {
      const dow = new Date(day).getDay();
      const isWeekend = dow === 0 || dow === 6;
      const isPast = day < todayIso;
      return !isWeekend && !isPast;
    });
    
    // Check if all weekdays are already selected
    const allSelected = weekdays.every(day => 
      next.has(`${userId}::${obraId}::${day}::m`) && 
      next.has(`${userId}::${obraId}::${day}::a`)
    );
    
    if (allSelected) {
      // Deselect all
      weekdays.forEach(day => {
        next.delete(`${userId}::${obraId}::${day}::m`);
        next.delete(`${userId}::${obraId}::${day}::a`);
      });
    } else {
      // Select all
      weekdays.forEach(day => {
        next.add(`${userId}::${obraId}::${day}::m`);
        next.add(`${userId}::${obraId}::${day}::a`);
      });
    }
    
    setSelected(next);
  };

  const selectAllObraWeekdays = (obraId) => {
    const users = obraUsers[obraId] || [];
    const next = new Set(selected);
    const weekdays = days.filter(day => {
      const dow = new Date(day).getDay();
      const isWeekend = dow === 0 || dow === 6;
      const isPast = day < todayIso;
      return !isWeekend && !isPast;
    });
    
    // Check if all users and weekdays are already selected
    const allSelected = users.every(user =>
      weekdays.every(day => 
        next.has(`${user.id}::${obraId}::${day}::m`) && 
        next.has(`${user.id}::${obraId}::${day}::a`)
      )
    );
    
    if (allSelected) {
      // Deselect all
      users.forEach(user => {
        weekdays.forEach(day => {
          next.delete(`${user.id}::${obraId}::${day}::m`);
          next.delete(`${user.id}::${obraId}::${day}::a`);
        });
      });
    } else {
      // Select all
      users.forEach(user => {
        weekdays.forEach(day => {
          next.add(`${user.id}::${obraId}::${day}::m`);
          next.add(`${user.id}::${obraId}::${day}::a`);
        });
      });
    }
    
    setSelected(next);
  };

  const handleAddUserToObra = async (obraId) => {
    const userId = selectedNewUser[obraId];
    if (!userId) return;
    setAddingUser((prev) => ({ ...prev, [obraId]: true }));
    try {
      const res = await fetch('/api/level-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ levelId: obraId, userId })
      });
      if (!res.ok) {
        throw new Error('Erro ao adicionar utilizador à obra');
      }
      await refreshObraUsers(obraId);
      setSelectedNewUser((prev) => ({ ...prev, [obraId]: '' }));
      setModal({
        type: 'success',
        title: 'Colaborador Adicionado',
        message: 'O utilizador foi adicionado à obra com sucesso.',
        onConfirm: null,
        data: null
      });
    } catch (err) {
      setModal({
        type: 'error',
        title: 'Erro',
        message: err.message,
        onConfirm: null,
        data: null
      });
    } finally {
      setAddingUser((prev) => ({ ...prev, [obraId]: false }));
    }
  };

  const handleRemoveUserFromObra = async (obraId, assocId, userId) => {
    if (!assocId) return;
    
    const performRemove = async () => {
      try {
        const res = await fetch(`/api/level-users/${assocId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Erro ao remover utilizador da obra');

        // Atualiza lista de utilizadores da obra
        setObraUsers((prev) => ({
          ...prev,
          [obraId]: (prev[obraId] || []).filter(u => u.assocId !== assocId)
        }));

        // Remove seleções existentes desse utilizador nessa obra
        setSelected((prev) => {
          const next = new Set(prev);
          [...prev].forEach((key) => {
            const [uId, oId] = key.split('::');
            if (parseInt(uId, 10) === userId && parseInt(oId, 10) === obraId) {
              next.delete(key);
            }
          });
          return next;
        });

        setModal({
          type: 'success',
          title: 'Utilizador Removido',
          message: 'O utilizador foi removido da obra com sucesso.',
          onConfirm: null,
          data: null
        });
      } catch (err) {
        setModal({
          type: 'error',
          title: 'Erro',
          message: err.message,
          onConfirm: null,
          data: null
        });
      }
    };

    setModal({
      type: 'confirm',
      title: 'Remover Utilizador',
      message: 'Tem a certeza que deseja remover este utilizador da obra? As alocações serão também removidas.',
      onConfirm: performRemove,
      data: null
    });
  };

  const handleApply = async () => {
    if (!fromDate || !toDate) {
      setError('Selecione o intervalo antes de aplicar');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Group by obra
      const byObra = {};
      Array.from(selected).forEach((key) => {
        const [userId, obraId, day, period] = key.split('::');
        if (!byObra[obraId]) byObra[obraId] = [];
        byObra[obraId].push({ 
          userId: parseInt(userId, 10), 
          day, 
          period 
        });
      });

      // Save for each obra
      const results = await Promise.all(Object.entries(byObra).map(async ([obraId, entries]) => {
        const res = await fetch(`/api/level-user-days/level/${obraId}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ from: fromDate, to: toDate, entries })
        });
        if (!res.ok) {
          throw new Error(`Erro ao salvar obra ${obraId}`);
        }
        return await res.json();
      }));

      await loadAllocations(fromDate, toDate);
      
      // Check for conflicts
      const totalConflicts = results.reduce((sum, r) => sum + (r.conflicts || 0), 0);
      if (totalConflicts > 0) {
        setModal({
          type: 'alert',
          title: 'Planeamento Aplicado',
          message: `Planeamento aplicado com ${totalConflicts} conflito(s)!\n\nAlguns utilizadores já estavam alocados a outras obras nos mesmos períodos e foram ignorados.`,
          onConfirm: null,
          data: null
        });
      } else {
        setModal({
          type: 'success',
          title: 'Sucesso',
          message: 'Planeamento aplicado com sucesso!',
          onConfirm: null,
          data: null
        });
      }
    } catch (err) {
      setError(err.message);
      setModal({
        type: 'error',
        title: 'Erro',
        message: err.message,
        onConfirm: null,
        data: null
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredObras = selectedObraId === 'all' 
    ? obras 
    : obras.filter(o => o.id === parseInt(selectedObraId));

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  return (
    <div className="pg-page">
      <div className="pg-container">
        <div className="pg-header">
          <div>
            <h1 className="pg-title">📅 Planeamento Global</h1>
            <p className="pg-subtitle">Gerir planeamento de múltiplas obras</p>
          </div>
        </div>

        <div className="pg-controls">
          <div className="pg-control-group">
            <label>Filtrar Obra:</label>
            <select 
              value={selectedObraId} 
              onChange={(e) => setSelectedObraId(e.target.value)}
              className="pg-select"
            >
              <option value="all">Todas as Obras</option>
              {obras.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          <div className="pg-control-group">
            <label>De:</label>
            <input 
              type="date" 
              value={fromDate} 
              onChange={(e) => setFromDate(e.target.value)}
              className="pg-date-input"
            />
          </div>

          <div className="pg-control-group">
            <label>Até:</label>
            <input 
              type="date" 
              value={toDate} 
              onChange={(e) => setToDate(e.target.value)}
              className="pg-date-input"
            />
          </div>

          <button 
            onClick={() => handleSelectDates()} 
            className="pg-btn"
          >
            Selecionar Datas
          </button>

          <button 
            onClick={() => window.print()} 
            className="pg-btn"
            title="Imprimir o planeamento"
          >
            🖨️ Imprimir
          </button>

          <button 
            onClick={handleApply} 
            className="pg-btn-primary"
            disabled={loading}
          >
            {loading ? 'A aplicar...' : 'Aplicar Alterações'}
          </button>
        </div>

        {error && <div className="pg-error">{error}</div>}

        {days.length === 0 ? (
          <p className="pg-empty">Escolha o intervalo para ver o planeamento.</p>
        ) : (
          <div className="pg-table-wrap">
            <table className="pg-table">
              <thead>
                <tr>
                  <th className="pg-th-user">Obra / Utilizador</th>
                  <th className="pg-th-action">Ação</th>
                  {days.map((d) => {
                    const dow = new Date(d).getDay();
                    const isWeekend = dow === 0 || dow === 6;
                    return (
                      <th key={d} className={isWeekend ? 'pg-weekend' : ''}>
                        {d}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredObras.map((obra) => {
                  const isExpanded = expandedObras.has(obra.id);
                  const users = obraUsers[obra.id] || [];
                  
                  return (
                    <React.Fragment key={obra.id}>
                      <tr className="pg-obra-row">
                        <td 
                          className="pg-obra-cell"
                          onClick={() => toggleObraExpanded(obra.id)}
                        >
                          <span className="pg-expand-icon">
                            {isExpanded ? '▼' : '▶'}
                          </span>
                          <div>
                            <div className="pg-obra-name">{obra.name}</div>
                            {obra.description && (
                              <div className="pg-obra-desc">{obra.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="pg-action-cell">
                          <button
                            className="pg-select-all-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              selectAllObraWeekdays(obra.id);
                            }}
                            title="Selecionar todos os dias úteis para todos os utilizadores desta obra"
                          >
                            ✓ Todos
                          </button>
                        </td>
                        {days.map((d) => (
                          <td key={d} className="pg-obra-day-cell">
                            {/* Empty for obra row */}
                          </td>
                        ))}
                      </tr>
                      
                      {isExpanded && users.map((user) => (
                        <tr key={`${obra.id}-${user.id}`} className="pg-user-row">
                          <td className="pg-user-cell">
                            <div className="pg-user-name">{user.name}</div>
                            <div className="pg-user-email">{user.email}</div>
                          </td>
                          <td className="pg-action-cell">
                            <div className="pg-user-actions">
                              <button
                                className="pg-select-all-btn pg-select-all-btn-small"
                                onClick={() => selectAllWeekdays(user.id, obra.id)}
                                title="Selecionar todos os dias úteis para este utilizador"
                              >
                                ✓
                              </button>
                              <button
                                className="pg-remove-user-btn"
                                onClick={() => handleRemoveUserFromObra(obra.id, user.assocId, user.id)}
                                title="Remover utilizador desta obra"
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                          {days.map((d) => {
                            const keyMorning = `${user.id}::${obra.id}::${d}::m`;
                            const keyAfternoon = `${user.id}::${obra.id}::${d}::a`;
                            const morningActive = selected.has(keyMorning);
                            const afternoonActive = selected.has(keyAfternoon);
                            const morningConflict = morningActive && (conflictCounts[`${user.id}::${d}::m`] || 0) > 1;
                            const afternoonConflict = afternoonActive && (conflictCounts[`${user.id}::${d}::a`] || 0) > 1;
                            const isPast = d < todayIso;
                            const dow = new Date(d).getDay();
                            const isWeekend = dow === 0 || dow === 6;
                            
                            return (
                              <td 
                                key={d} 
                                className={`pg-cell ${isPast ? 'past' : ''} ${isWeekend ? 'weekend' : ''}`}
                              >
                                <div className="pg-cell-periods">
                                  <div 
                                    className={`pg-period ${morningActive ? 'active' : ''} ${morningConflict ? 'conflict' : ''} ${isPast ? 'disabled' : ''}`}
                                    onClick={() => !isPast && toggleCell(user.id, obra.id, d, 'm')}
                                    title="Manhã"
                                  >
                                    {morningActive ? '✔' : ''}
                                  </div>
                                  <div 
                                    className={`pg-period ${afternoonActive ? 'active' : ''} ${afternoonConflict ? 'conflict' : ''} ${isPast ? 'disabled' : ''}`}
                                    onClick={() => !isPast && toggleCell(user.id, obra.id, d, 'a')}
                                    title="Tarde"
                                  >
                                    {afternoonActive ? '✔' : ''}
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}

                      {isExpanded && (
                        <tr className="pg-user-row pg-add-user-row">
                          <td className="pg-user-cell">
                            <div className="pg-user-name">Adicionar colaborador</div>
                            <div className="pg-add-user-actions">
                              <select
                                className="pg-select pg-add-user-select"
                                value={selectedNewUser[obra.id] || ''}
                                onChange={(e) => setSelectedNewUser((prev) => ({ ...prev, [obra.id]: e.target.value }))}
                              >
                                <option value="">-- Selecionar --</option>
                                {allUsers
                                  .filter(u => !(obraUsers[obra.id] || []).some(ou => ou.id === u.id))
                                  .map((u) => (
                                    <option key={u.id} value={u.id}>{u.name || u.email}</option>
                                  ))}
                              </select>
                              <button
                                className="pg-select-all-btn pg-select-all-btn-small"
                                onClick={() => handleAddUserToObra(obra.id)}
                                disabled={addingUser[obra.id] || !(selectedNewUser[obra.id])}
                              >
                                {addingUser[obra.id] ? '...' : '+'}
                              </button>
                            </div>
                          </td>
                          <td className="pg-action-cell"></td>
                          {days.map((d) => (
                            <td key={d} className="pg-obra-day-cell pg-add-user-placeholder"></td>
                          ))}
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal Dialog */}
        {modal.type && (
          <div className="pg-modal-overlay" onClick={() => setModal({ ...modal, type: null })}>
            <div className="pg-modal-content" onClick={(e) => e.stopPropagation()}>
              <h2 className="pg-modal-title">{modal.title}</h2>
              <p className="pg-modal-message">{modal.message}</p>
              <div className="pg-modal-actions">
                {(modal.type === 'confirm' || modal.type === 'alert') && (
                  <button 
                    className="pg-modal-btn pg-modal-btn-cancel"
                    onClick={() => setModal({ ...modal, type: null })}
                  >
                    {modal.type === 'confirm' ? 'Cancelar' : 'Fechar'}
                  </button>
                )}
                {(modal.type === 'confirm' || modal.type === 'success' || modal.type === 'error') && (
                  <button 
                    className={`pg-modal-btn ${modal.type === 'confirm' ? 'pg-modal-btn-danger' : 'pg-modal-btn-confirm'}`}
                    onClick={() => {
                      if (modal.onConfirm) modal.onConfirm();
                      setModal({ ...modal, type: null });
                    }}
                  >
                    {modal.type === 'confirm' ? 'Eliminar' : 'OK'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .pg-page {
          min-height: 100vh;
          background: #f8fafc;
          padding: 20px;
        }
        .pg-container {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 16px #0001;
          padding: 28px;
        }
        .pg-header {
          margin-bottom: 20px;
        }
        .pg-title {
          margin: 0;
          font-size: 2rem;
          color: #1e293b;
          font-weight: 800;
        }
        .pg-subtitle {
          margin: 4px 0 0 0;
          color: #64748b;
          font-size: 1rem;
        }
        .pg-controls {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
          align-items: flex-end;
        }
        .pg-control-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .pg-control-group label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #475569;
        }
        .pg-select, .pg-date-input {
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.95rem;
        }
        .pg-select {
          min-width: 200px;
        }
        .pg-btn {
          background: #e2e8f0;
          border: none;
          border-radius: 8px;
          padding: 10px 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .pg-btn:hover {
          background: #cbd5e1;
        }
        .pg-btn-primary {
          background: linear-gradient(90deg, #6366f1 0%, #2563eb 100%);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .pg-btn-primary:hover:not(:disabled) {
          opacity: 0.9;
        }
        .pg-btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .pg-error {
          background: #fee2e2;
          color: #b91c1c;
          padding: 10px 12px;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .pg-empty {
          color: #94a3b8;
          padding: 40px 20px;
          text-align: center;
        }
        .pg-table-wrap {
          width: 100%;
          overflow-x: auto;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .pg-table {
          width: 100%;
          border-collapse: collapse;
        }
        .pg-table th, .pg-table td {
          border: 1px solid #e2e8f0;
          padding: 8px;
          text-align: center;
        }
        .pg-table th:first-child, .pg-table td:first-child {
          position: sticky;
          left: 0;
          background: #f8fafc;
          z-index: 10;
          width: 210px;
          max-width: 210px;
          min-width: 210px;
        }
        .pg-table th:nth-child(2), .pg-table td:nth-child(2) {
          position: sticky;
          left: 210px;
          background: #f8fafc;
          z-index: 10;
          width: 140px;
          max-width: 140px;
          min-width: 140px;
        }
        .pg-th-user {
          text-align: left;
          font-weight: 700;
          color: #1e293b;
          min-width: 250px;
        }
        .pg-th-action {
          text-align: center;
          font-weight: 700;
          color: #1e293b;
          min-width: 90px;
          max-width: 90px;
        }
        .pg-action-cell {
          text-align: center;
          padding: 6px !important;
          background: #f8fafc !important;
        }
        .pg-select-all-btn {
          background: #dbeafe;
          color: #1e40af;
          border: 1px solid #93c5fd;
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .pg-select-all-btn:hover {
          background: #bfdbfe;
          border-color: #60a5fa;
        }
        .pg-user-actions {
          display: flex;
          gap: 6px;
          align-items: center;
          justify-content: center;
        }
        .pg-remove-user-btn {
          background: #fee2e2;
          color: #b91c1c;
          border: 1px solid #fecdd3;
          border-radius: 6px;
          padding: 6px 10px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s, transform 0.2s;
        }
        .pg-remove-user-btn:hover {
          background: #fecaca;
          transform: translateY(-1px);
        }
        .pg-add-user-row {
          background: #f8fafc;
        }
        .pg-add-user-actions {
          display: flex;
          gap: 8px;
          align-items: center;
          justify-content: center;
        }
        .pg-add-user-select {
          min-width: 140px;
          max-width: 180px;
          font-size: 0.9rem;
        }
        .pg-action-cell {
          width: 140px;
          flex-shrink: 0;
        }
        .pg-add-user-row .pg-user-cell {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .pg-add-user-row .pg-add-user-actions {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .pg-add-user-placeholder {
          background: #f8fafc;
        }
        .pg-select-all-btn-small {
          padding: 4px 8px;
          font-size: 0.9rem;
        }
        .pg-weekend {
          background: #f1f5f9;
        }
        .pg-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .pg-modal-content {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          padding: 32px;
          max-width: 500px;
          width: 90%;
          animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .pg-modal-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 12px 0;
        }
        .pg-modal-message {
          color: #64748b;
          line-height: 1.6;
          margin: 0 0 24px 0;
          font-size: 1rem;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .pg-modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
        .pg-modal-btn {
          padding: 10px 20px;
          border-radius: 6px;
          border: none;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.95rem;
        }
        .pg-modal-btn-cancel {
          background: #e2e8f0;
          color: #475569;
        }
        .pg-modal-btn-cancel:hover {
          background: #cbd5e1;
        }
        .pg-modal-btn-confirm {
          background: #01a383;
          color: white;
        }
        .pg-modal-btn-confirm:hover {
          background: #018a6f;
        }
        .pg-modal-btn-danger {
          background: #dc2626;
          color: white;
        }
        .pg-modal-btn-danger:hover {
          background: #b91c1c;
        }
        .pg-obra-row {
          background: #f8fafc;
          font-weight: 700;
        }
        .pg-obra-cell {
          text-align: left;
          cursor: pointer;
          user-select: none;
          padding: 8px 10px !important;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .pg-obra-cell:hover {
          background: #f1f5f9;
        }
        .pg-expand-icon {
          color: #64748b;
          font-size: 0.8rem;
        }
        .pg-obra-name {
          font-size: 0.95rem;
          color: #1e293b;
          font-weight: 700;
        }
        .pg-obra-desc {
          font-size: 0.8rem;
          color: #64748b;
          font-weight: 400;
          margin-top: 1px;
        }
        .pg-obra-day-cell {
          background: #f8fafc;
        }
        .pg-user-row {
          background: #fff;
        }
        .pg-user-cell {
          text-align: left;
          padding-left: 20px !important;
          padding-right: 8px !important;
          background: #fff !important;
        }
        .pg-user-name {
          font-weight: 600;
          color: #1e293b;
          font-size: 0.9rem;
        }
        .pg-user-email {
          color: #94a3b8;
          font-size: 0.8rem;
          margin-top: 1px;
        }
        .pg-cell {
          min-width: 80px;
          padding: 4px !important;
        }
        .pg-cell.weekend {
          background: #f8fafc;
        }
        .pg-cell.past {
          background: #f1f5f9;
        }
        .pg-cell-periods {
          display: flex;
          gap: 4px;
          justify-content: center;
          align-items: center;
        }
        .pg-period {
          flex: 1;
          min-height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
          font-weight: 600;
        }
        .pg-period:hover:not(.disabled) {
          background: #f1f5f9;
        }
        .pg-period.active {
          background: #dcfce7;
          color: #166534;
          border-color: #86efac;
        }
        .pg-period.conflict {
          background: #fef9c3;
          color: #92400e;
          border-color: #fcd34d;
        }
        .pg-period.disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          .pg-controls {
            display: none !important;
          }
          .pg-error {
            display: none !important;
          }
          .pg-table-wrap {
            overflow: visible !important;
            margin: 0 !important;
          }
          .pg-table {
            font-size: 0.85rem;
            border-collapse: collapse;
          }
          .pg-cell, .pg-user-cell, .pg-obra-cell, .pg-obra-day-cell, .pg-action-cell, .pg-add-user-placeholder {
            border: 1px solid #ccc;
            padding: 8px 4px !important;
          }
          .pg-period {
            min-height: 24px;
            font-size: 0.9rem;
          }
          .pg-period.active {
            background: #dcfce7;
            color: #166534;
            border-color: #86efac;
          }
          .pg-period.conflict {
            background: #fef9c3;
            color: #92400e;
            border-color: #fcd34d;
          }
          .pg-user-name, .pg-obra-name {
            font-weight: 700;
            margin: 0;
          }
          .pg-user-email, .pg-obra-desc {
            font-weight: normal;
            margin: 0;
            font-size: 0.8rem;
          }
          .pg-select-all-btn, .pg-remove-user-btn, .pg-add-user-actions, .pg-user-actions {
            display: none !important;
          }
          .pg-weekend {
            background: #f5f5f5;
          }
          .pg-obra-row {
            background: #e8f4f8;
            font-weight: 700;
          }
          .pg-user-row {
            background: white;
          }
          .pg-add-user-row {
            display: none !important;
          }
          table {
            page-break-inside: avoid;
          }
          tr {
            page-break-inside: avoid;
          }
        }
        @media (max-width: 768px) {
          .pg-controls {
            flex-direction: column;
            align-items: stretch;
          }
          .pg-select {
            min-width: auto;
          }
        }
      `}</style>
    </div>
  );
}
