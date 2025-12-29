import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function Planeamento() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [obra, setObra] = useState(null);
  const [users, setUsers] = useState([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [days, setDays] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchObra();
    fetchUsers();

    // Pre-carrega uma semana por omissão para mostrar o report existente
    const today = new Date();
    const to = new Date();
    to.setDate(today.getDate() + 6);
    const fromIso = today.toISOString().slice(0, 10);
    const toIso = to.toISOString().slice(0, 10);
    setFromDate(fromIso);
    setToDate(toIso);
    // Run async without awaiting inside useEffect
    handleSelectDates(fromIso, toIso);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchObra = async () => {
    try {
      const res = await fetch(`/api/levels/${id}`);
      if (res.ok) {
        const data = await res.json();
        setObra(data);
      }
    } catch (err) {
      console.error('Erro ao carregar obra', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`/api/level-users/level/${id}`);
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((u) => ({
          id: u.userId,
          name: u.name || u.email,
          email: u.email,
          car: u.Car
        }));
        setUsers(mapped);
      }
    } catch (err) {
      console.error('Erro ao carregar utilizadores', err);
    }
  };

  const buildDays = (from, to) => {
    const start = new Date(from);
    const end = new Date(to);
    const arr = [];
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      const iso = dt.toISOString().slice(0, 10);
      arr.push(iso);
    }
    return arr;
  };

  const loadSchedule = async (from, to) => {
    try {
      const res = await fetch(`/api/level-user-days/level/${id}?from=${from}&to=${to}`);
      if (res.ok) {
        const data = await res.json();
        const next = new Set();
        data.forEach((r) => {
          const day = (r.day || '').slice(0, 10);
          const period = r.period || 'm';
          if (day) next.add(`${r.userId}::${day}::${period}`);
        });
        setSelected(next);
      }
    } catch (err) {
      console.error('Erro ao carregar planeamento', err);
    }
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
    const arr = buildDays(fromVal, toVal);
    setDays(arr);
    await loadSchedule(fromVal, toVal);
  };

  const toggleCell = (userId, day, period) => {
    const key = `${userId}::${day}::${period}`;
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };

  const handleApply = async () => {
    if (!fromDate || !toDate) {
      setError('Selecione o intervalo antes de aplicar');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const entries = Array.from(selected).map((k) => {
        const [userId, day, period] = k.split('::');
        return { userId: parseInt(userId, 10), day, period };
      });
      const res = await fetch(`/api/level-user-days/level/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromDate, to: toDate, entries })
      });
      if (!res.ok) {
        const msg = (await res.json()).error || 'Erro ao aplicar';
        throw new Error(msg);
      }
      await loadSchedule(fromDate, toDate);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const title = useMemo(() => obra?.name || 'Obra', [obra]);
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  return (
    <div className="pl-bg">
      <div className="pl-container">
        <button className="pl-back" onClick={() => navigate('/obras')}>← Obras</button>
        <h1 className="pl-title">Planeamento Diário</h1>
        <p className="pl-subtitle">{title}</p>

        <div className="pl-filters">
          <div className="pl-field">
            <label>De</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="pl-field">
            <label>Até</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <button className="pl-btn" onClick={() => handleSelectDates()}>Selecionar datas</button>
        </div>
        {error && <div className="pl-error">{error}</div>}

        <div className="pl-table-wrap">
          {users.length === 0 ? (
            <p className="pl-empty">Nenhum utilizador associado a esta obra.</p>
          ) : days.length === 0 ? (
            <p className="pl-empty">Escolha o intervalo para ver o planeamento.</p>
          ) : (
            <table className="pl-table">
              <thead>
                <tr>
                  <th>Utilizador</th>
                  {days.map((d) => {
                    const dow = new Date(d).getDay();
                    const isWeekend = dow === 0 || dow === 6;
                    return (
                      <th key={d} className={isWeekend ? 'pl-weekend' : ''}>{d}</th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="pl-user-cell">
                      <div className="pl-user-name">{u.name}</div>
                      <div className="pl-user-meta">{u.email}</div>
                    </td>
                    {days.map((d) => {
                      const keyMorning = `${u.id}::${d}::m`;
                      const keyAfternoon = `${u.id}::${d}::a`;
                      const morningActive = selected.has(keyMorning);
                      const afternoonActive = selected.has(keyAfternoon);
                      const isPast = d < todayIso;
                      const dow = new Date(d).getDay();
                      const isWeekend = dow === 0 || dow === 6;
                      const classes = ['pl-cell'];
                      if (isPast) classes.push('past');
                      if (isWeekend) classes.push('weekend');
                      return (
                        <td key={`${u.id}::${d}`} className={classes.join(' ')}>
                          <div className="pl-cell-periods">
                            <div 
                              className={`pl-period ${morningActive ? 'active' : ''} ${isPast ? 'disabled' : ''}`}
                              onClick={() => !isPast && toggleCell(u.id, d, 'm')}
                              title="Manhã"
                            >
                              {morningActive ? '✔' : ''}
                            </div>
                            <div 
                              className={`pl-period ${afternoonActive ? 'active' : ''} ${isPast ? 'disabled' : ''}`}
                              onClick={() => !isPast && toggleCell(u.id, d, 'a')}
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
              </tbody>
            </table>
          )}
        </div>

        <div className="pl-apply-bar">
          <button className="pl-btn primary" onClick={handleApply} disabled={loading}>
            {loading ? 'A aplicar…' : 'Aplicar'}
          </button>
        </div>
      </div>

      <style>{`
        .pl-bg { min-height: 100vh; background: #f8fafc; padding: 20px; }
        .pl-container { background: #fff; border-radius: 12px; box-shadow: 0 2px 16px #0001; padding: 28px; }
        .pl-back { background: #e2e8f0; border: none; border-radius: 6px; padding: 8px 14px; cursor: pointer; margin-bottom: 12px; }
        .pl-title { margin: 0; font-size: 1.9rem; color: #1e293b; }
        .pl-subtitle { margin: 4px 0 16px; color: #64748b; }
        .pl-filters { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 12px; }
        .pl-field { display: flex; flex-direction: column; gap: 6px; }
        .pl-field input { padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 8px; }
        .pl-btn { background: #e2e8f0; border: none; border-radius: 8px; padding: 10px 14px; font-weight: 600; cursor: pointer; }
        .pl-btn.primary { background: linear-gradient(90deg, #6366f1 0%, #2563eb 100%); color: #fff; }
        .pl-error { background: #fee2e2; color: #b91c1c; padding: 10px 12px; border-radius: 8px; margin-bottom: 10px; }
        .pl-table-wrap { width: 100%; overflow-x: auto; }
        .pl-table { width: 100%; border-collapse: collapse; }
        .pl-table th, .pl-table td { border: 1px solid #e2e8f0; padding: 8px; text-align: center; }
        .pl-table th:first-child, .pl-table td:first-child { position: sticky; left: 0; background: #f8fafc; z-index: 1; }
        .pl-weekend { background: #f1f5f9; }
        .pl-user-cell { text-align: left; min-width: 180px; }
        .pl-user-name { font-weight: 600; color: #1e293b; }
        .pl-user-meta { color: #94a3b8; font-size: 0.9rem; }
        .pl-cell { min-width: 80px; padding: 4px !important; }
        .pl-cell.weekend { background: #f8fafc; }
        .pl-cell.past { background: #f1f5f9; }
        .pl-cell-periods { display: flex; gap: 4px; justify-content: center; align-items: center; }
        .pl-period { 
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
        .pl-period:hover:not(.disabled) { background: #f1f5f9; }
        .pl-period.active { background: #dcfce7; color: #166534; border-color: #86efac; }
        .pl-period.disabled { cursor: not-allowed; opacity: 0.5; }
        .pl-apply-bar { margin-top: 16px; display: flex; justify-content: flex-end; }
        .pl-empty { color: #94a3b8; padding: 12px 0; }
      `}</style>
    </div>
  );
}
