import React, { useEffect, useMemo, useState } from 'react';

export default function WorkerSchedule() {
  const [allocations, setAllocations] = useState([]);
  const [days, setDays] = useState([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [levelsMap, setLevelsMap] = useState({});
  const [selectedLevels, setSelectedLevels] = useState([]);
  const [slotFilter, setSlotFilter] = useState('both');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [openUsersDropdown, setOpenUsersDropdown] = useState(false);
  const [openLevelsDropdown, setOpenLevelsDropdown] = useState(false);

  useEffect(() => {
    const today = new Date();
    const to = new Date();
    to.setDate(today.getDate() + 6);
    const fromIso = today.toISOString().slice(0, 10);
    const toIso = to.toISOString().slice(0, 10);
    setFromDate(fromIso);
    setToDate(toIso);
    handleSelectDates(fromIso, toIso);
  }, []);

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

  const fetchLevels = async (ids) => {
    const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
    if (uniqueIds.length === 0) return {};

    const map = {};
    await Promise.all(
      uniqueIds.map(async (id) => {
        try {
          const res = await fetch(`/api/levels/${id}`);
          if (res.ok) {
            const level = await res.json();
            map[id] = level.name;
          }
        } catch (err) {
          console.error('Erro ao carregar nível', id, err);
        }
      })
    );
    return map;
  };

  const loadAllocations = async (from, to) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/level-user-days?from=${from}&to=${to}`);
      if (!res.ok) throw new Error('Falha ao carregar alocações');

      const data = await res.json();
      const levelIds = data.map(d => d.levelId);
      const levelMap = await fetchLevels(levelIds);
      setLevelsMap(levelMap);
      setAllocations(data.map(d => ({ ...d, levelName: levelMap[d.levelId] || `Obra ${d.levelId}` })));

      // Seleciona todas por defeito na primeira carga
      if (selectedLevels.length === 0 && levelIds.length > 0) {
        setSelectedLevels(Array.from(new Set(levelIds)));
      }
    } catch (err) {
      setError('Erro ao carregar alocações');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const levelOptions = useMemo(() => {
    return Object.entries(levelsMap)
      .map(([id, name]) => ({ id: Number(id), name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [levelsMap]);

  const userOptions = useMemo(() => {
    const map = new Map();
    allocations.forEach((a) => {
      const id = a.userId || 'sem-id';
      const name = a.name || 'Colaborador';
      map.set(id, name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allocations]);

  const toggleUser = (id) => {
    if (selectedUsers.includes(id)) {
      setSelectedUsers(selectedUsers.filter(u => u !== id));
    } else {
      setSelectedUsers([...selectedUsers, id]);
    }
  };

  const allUsersSelected = userOptions.length > 0 && selectedUsers.length === userOptions.length;

  const handleSelectAllUsers = () => {
    if (allUsersSelected) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(userOptions.map(u => u.id));
    }
  };

  const toggleLevel = (id) => {
    if (selectedLevels.includes(id)) {
      setSelectedLevels(selectedLevels.filter(l => l !== id));
    } else {
      setSelectedLevels([...selectedLevels, id]);
    }
  };

  const allLevelsSelected = levelOptions.length > 0 && selectedLevels.length === levelOptions.length;

  const handleSelectAllLevels = () => {
    if (allLevelsSelected) {
      setSelectedLevels([]);
    } else {
      setSelectedLevels(levelOptions.map(l => l.id));
    }
  };

  const filteredAllocations = useMemo(() => {
    return allocations.filter((alloc) => {
      const inLevel = selectedLevels.length === 0 || selectedLevels.includes(alloc.levelId);
      const inSlot = slotFilter === 'both' || (slotFilter === 'morning' && alloc.period === 'm') || (slotFilter === 'afternoon' && alloc.period === 'a');
      const inDay = days.includes((alloc.day || '').slice(0, 10));
      const inUser = selectedUsers.length === 0 || selectedUsers.includes(alloc.userId) || (selectedUsers.includes('sem-id') && !alloc.userId);
      return inLevel && inSlot && inDay && inUser;
    });
  }, [allocations, selectedLevels, slotFilter, days]);

  const pivotData = useMemo(() => {
    const levels = new Map();
    filteredAllocations.forEach((alloc) => {
      const userId = alloc.userId || 'sem-id';
      const userName = alloc.name || 'Colaborador';
      const levelId = alloc.levelId;
      const levelName = alloc.levelName || `Obra ${levelId}`;
      const day = (alloc.day || '').slice(0, 10);
      const period = alloc.period === 'a' ? 'a' : 'm';

      if (!levels.has(levelId)) {
        levels.set(levelId, { levelName, users: new Map() });
      }
      const levelEntry = levels.get(levelId);

      if (!levelEntry.users.has(userId)) {
        levelEntry.users.set(userId, { userName, slots: {} });
      }
      const userEntry = levelEntry.users.get(userId);

      if (!userEntry.slots[day]) {
        userEntry.slots[day] = { m: false, a: false };
      }
      userEntry.slots[day][period] = true;
    });

    return Array.from(levels.entries())
      .map(([id, value]) => ({ 
        id, 
        ...value, 
        users: Array.from(value.users.entries()).map(([userId, userVal]) => ({ userId, ...userVal })) 
      }))
      .sort((a, b) => a.levelName.localeCompare(b.levelName));
  }, [filteredAllocations]);

  return (
    <div className="ws-bg">
      <div className="ws-container">
        <div className="ws-header">
          <div>
            <h1 className="ws-title">Calendário de colaboradores</h1>
            <p className="ws-sub">Visão matricial por colaborador, obra, data e período.</p>
          </div>
          <div className="ws-actions">
            <button className="ws-btn" onClick={() => handleSelectDates()}>Atualizar</button>
          </div>
        </div>

        <div className="ws-filters">
          <div className="ws-field">
            <label>De</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="ws-field">
            <label>Até</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="ws-field">
            <label>Slot</label>
            <select value={slotFilter} onChange={(e) => setSlotFilter(e.target.value)}>
              <option value="both">Manhã e Tarde</option>
              <option value="morning">Só Manhã</option>
              <option value="afternoon">Só Tarde</option>
            </select>
          </div>
          <div className="ws-field ws-dropdown-field">
            <label>Colaboradores</label>
            <div className="ws-dropdown">
              <button className="ws-dropdown-btn" onClick={() => setOpenUsersDropdown(!openUsersDropdown)}>
                {selectedUsers.length === 0 ? 'Todos' : `${selectedUsers.length} selecionado(s)`}
              </button>
              {openUsersDropdown && (
                <div className="ws-dropdown-menu">
                  <label className="ws-check">
                    <input type="checkbox" checked={allUsersSelected} onChange={handleSelectAllUsers} />
                    <span>Selecionar todos</span>
                  </label>
                  <div className="ws-dropdown-items">
                    {userOptions.length === 0 && <span className="ws-level-empty">Sem colaboradores</span>}
                    {userOptions.map((u) => (
                      <label key={u.id} className="ws-check">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(u.id)}
                          onChange={() => toggleUser(u.id)}
                        />
                        <span>{u.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="ws-field ws-dropdown-field">
            <label>Obras</label>
            <div className="ws-dropdown">
              <button className="ws-dropdown-btn" onClick={() => setOpenLevelsDropdown(!openLevelsDropdown)}>
                {selectedLevels.length === 0 ? 'Todas' : `${selectedLevels.length} selecionada(s)`}
              </button>
              {openLevelsDropdown && (
                <div className="ws-dropdown-menu">
                  <label className="ws-check">
                    <input type="checkbox" checked={allLevelsSelected} onChange={handleSelectAllLevels} />
                    <span>Selecionar todas</span>
                  </label>
                  <div className="ws-dropdown-items">
                    {levelOptions.length === 0 && <span className="ws-level-empty">Sem obras</span>}
                    {levelOptions.map((lvl) => (
                      <label key={lvl.id} className="ws-check">
                        <input
                          type="checkbox"
                          checked={selectedLevels.includes(lvl.id)}
                          onChange={() => toggleLevel(lvl.id)}
                        />
                        <span>{lvl.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {error && <div className="ws-error">{error}</div>}

        <div className="ws-table-wrapper">
          {loading ? (
            <p className="ws-loading">A carregar...</p>
          ) : days.length === 0 ? (
            <p className="ws-empty">Escolha o intervalo para ver alocações.</p>
          ) : pivotData.length === 0 ? (
            <p className="ws-empty">Sem resultados para os filtros aplicados.</p>
          ) : (
            <table className="ws-table">
              <thead>
                <tr>
                  <th className="sticky-col col-level" rowSpan={2}>Obra</th>
                  <th className="sticky-col col-user" rowSpan={2}>Colaborador</th>
                  {days.map((day) => (
                    <th key={day} colSpan={slotFilter === 'both' ? 2 : 1} className="day-header">{day}</th>
                  ))}
                </tr>
                <tr>
                  {days.map((day) => (
                    slotFilter === 'both' ? (
                      <React.Fragment key={day}>
                        <th className="slot-header">Manhã</th>
                        <th className="slot-header">Tarde</th>
                      </React.Fragment>
                    ) : (
                      <th key={`${day}-${slotFilter}`} className="slot-header">{slotFilter === 'morning' ? 'Manhã' : 'Tarde'}</th>
                    )
                  ))}
                </tr>
              </thead>
              <tbody>
                {pivotData.map((level) => (
                  level.users.map((user, idx) => (
                    <tr key={`${level.id}-${user.userId}`}>
                      {idx === 0 && (
                        <td className="sticky-col col-level" rowSpan={level.users.length}>{level.levelName}</td>
                      )}
                      <td className="sticky-col col-user">{user.userName}</td>
                      {days.map((day) => {
                        const slot = user.slots[day] || { m: false, a: false };
                        const renderCell = (period) => (
                          <td key={`${day}-${period}`} className={`cell ${slot[period] ? 'on' : 'off'}`}>
                            {slot[period] ? '✓' : ''}
                          </td>
                        );
                        if (slotFilter === 'both') {
                          return (
                            <React.Fragment key={day}>
                              {renderCell('m')}
                              {renderCell('a')}
                            </React.Fragment>
                          );
                        }
                        return renderCell(slotFilter === 'morning' ? 'm' : 'a');
                      })}
                    </tr>
                  ))
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <style>{`
        .ws-bg {
          min-height: 100vh;
          background: #f8fafc;
          padding: 16px;
        }
        .ws-container {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 16px #0001;
          padding: 20px;
        }
        .ws-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .ws-title {
          margin: 0;
          font-size: 1.6rem;
          color: #111827;
        }
        .ws-sub {
          margin: 4px 0 0 0;
          color: #6b7280;
          font-size: 0.95rem;
        }
        .ws-actions {
          display: flex;
          gap: 8px;
        }
        .ws-filters {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
          margin-bottom: 12px;
          align-items: start;
        }
        .ws-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .ws-field label {
          font-size: 0.9rem;
          color: #475569;
          font-weight: 600;
        }
        .ws-field input, .ws-field select {
          padding: 8px 10px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.95rem;
        }
        .ws-dropdown-field {
          position: relative;
        }
        .ws-dropdown {
          position: relative;
        }
        .ws-dropdown-btn {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.95rem;
          background: #fff;
          cursor: pointer;
          text-align: left;
          transition: border-color 0.2s;
        }
        .ws-dropdown-btn:hover {
          border-color: #cbd5e1;
        }
        .ws-dropdown-menu {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          margin-top: 4px;
          padding: 8px;
          z-index: 100;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          min-width: 200px;
        }
        .ws-dropdown-items {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 6px;
          max-height: 200px;
          overflow-y: auto;
        }
        .ws-levels {
          grid-column: 1 / -1;
        }
        .ws-levels-box {
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px;
          background: #f8fafc;
        }
        .ws-level-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 6px;
          margin-top: 6px;
          max-height: 160px;
          overflow: auto;
        }
        .ws-level-empty {
          color: #94a3b8;
          font-size: 0.9rem;
        }
        .ws-check {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.95rem;
          color: #334155;
        }
        .ws-btn {
          background: #2563eb;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 10px 14px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.1s ease, box-shadow 0.1s ease;
        }
        .ws-btn:hover { box-shadow: 0 6px 20px #2563eb33; transform: translateY(-1px); }
        .ws-error {
          background: #fee2e2;
          color: #b91c1c;
          padding: 10px 12px;
          border-radius: 8px;
          margin-bottom: 10px;
          border: 1px solid #fecaca;
        }
        .ws-table-wrapper {
          overflow: auto;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
        }
        .ws-loading, .ws-empty {
          text-align: center;
          color: #64748b;
          padding: 28px 16px;
          font-size: 1rem;
        }
        .ws-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 900px;
        }
        .ws-table th, .ws-table td {
          border: 1px solid #e2e8f0;
          padding: 8px 10px;
          text-align: center;
          font-size: 0.92rem;
          background: #fff;
        }
        .day-header {
          background: #f1f5f9;
          color: #0f172a;
          font-weight: 700;
        }
        .slot-header {
          background: #f8fafc;
          color: #475569;
        }
        .sticky-col {
          position: sticky;
          left: 0;
          background: #fff;
          z-index: 2;
          padding: 8px 12px;
        }
        .col-level { 
          left: 0; 
          min-width: 200px; 
          text-align: left; 
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .col-user { 
          left: 200px; 
          min-width: 140px; 
          text-align: left;
          z-index: 1;
        }
        .cell.on {
          background: #dcfce7;
          color: #166534;
          font-weight: 700;
        }
        .cell.off {
          background: #fff;
        }
      `}</style>
    </div>
  );
}
