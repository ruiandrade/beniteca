import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function Presencas() {
  const { user, token } = useAuth();
  const [works, setWorks] = useState([]);
  const [selectedWork, setSelectedWork] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [presenceView, setPresenceView] = useState("mark");
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportRows, setReportRows] = useState([]);
  const [reportMatrix, setReportMatrix] = useState(null);
  const [users, setUsers] = useState([]);
  const [presencas, setPresencas] = useState({});
  const [overtimeHours, setOvertimeHours] = useState({});
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ type: null, title: '', message: '', onConfirm: null });
  const [isMobile, setIsMobile] = useState(false);

  const SLOTS = ["m", "a"]; // Morning, Afternoon

  useEffect(() => {
    fetchWorks();
  }, [user]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const fetchWorks = async () => {
    try {
      const res = await fetch("/api/levels?parentId=null");
      if (res.ok) {
        const data = await res.json();
        // Mostrar apenas obras ativas (status = 'active')
        let filteredWorks = data.filter(obra => obra.status === 'active');
        
        // Filtrar baseado no role do user
        if (user?.role === 'A') {
          // Admin vê tudo
        } else if (user?.role === 'C' || user?.role === 'O') {
          // Cliente e Outros veem apenas obras onde são site_director ou construction_manager
          filteredWorks = filteredWorks.filter(obra => 
            obra.siteDirectorId === user?.id || obra.constructionManagerId === user?.id
          );
        } else {
          // Sem role válido, sem obras
          filteredWorks = [];
        }
        
        // Sort obras alphabetically by name for the dropdown
        filteredWorks.sort((a, b) => {
          const aName = (a.name || '').toString().trim();
          const bName = (b.name || '').toString().trim();
          return aName.localeCompare(bName, 'pt', { sensitivity: 'base' });
        });
        setWorks(filteredWorks);
      }
    } catch (err) {
      console.error("Erro ao carregar obras:", err);
    }
  };

  const fetchPresencas = async () => {
    if (!selectedWork || !selectedDate) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/level-user-days/level/${selectedWork}?from=${selectedDate}&to=${selectedDate}`
      );
      if (res.ok) {
        const data = await res.json();
        
        // Extract unique users
        const uniqueUsers = [...new Set(data.map(d => d.userId))];
        
        // Fetch user details
        const userDetails = await Promise.all(
          uniqueUsers.map(async (userId) => {
            const userRes = await fetch(`/api/users/${userId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (userRes.ok) return await userRes.json();
            const userData = data.find(d => d.userId === userId);
            return { id: userId, name: userData?.name || `User ${userId}` };
          })
        );
        
        setUsers(userDetails);
        
        // Build presencas map: { "userId-period": { appeared, observations, recordId } }
        const presencasMap = {};
        const overtimeMap = {};
        data.forEach(record => {
          const key = `${record.userId}-${record.period}`;
          presencasMap[key] = {
            appeared: record.appeared || null,
            observations: record.observations || "",
            recordId: record.id
          };
          // Store overtime hours per user (not per period)
          if (record.overtimeHours !== null && record.overtimeHours !== undefined) {
            // Prefer afternoon overtime values; otherwise set if not already set
            if (record.period === 'a' || overtimeMap[record.userId] === undefined) {
              overtimeMap[record.userId] = record.overtimeHours;
            }
          }
        });
        setPresencas(presencasMap);
        setOvertimeHours(overtimeMap);
      }
    } catch (err) {
      console.error("Erro ao carregar presenças:", err);
      setModal({
        type: 'error',
        title: 'Erro',
        message: 'Erro ao carregar presenças',
        onConfirm: null
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAppeared = (userId, slot, value) => {
    const key = `${userId}-${slot}`;
    setPresencas(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        appeared: value
      }
    }));
  };

  const handleObservationChange = (userId, slot, text) => {
    const key = `${userId}-${slot}`;
    setPresencas(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        observations: text
      }
    }));
  };

  const handleOvertimeChange = (userId, hours) => {
    setOvertimeHours(prev => ({
      ...prev,
      [userId]: hours
    }));
  };

  const handleSavePresencas = async () => {
    setLoading(true);
    try {
      for (const [key, data] of Object.entries(presencas)) {
        const userId = key.split('-')[0];
        const period = key.split('-')[1];
        
        // Determine if overtime should go to this period
        let periodOvertimeHours = 0;
        if (period === 'm') {
          // Check if afternoon exists; if not, put overtime on morning
          const afternoonKey = `${userId}-a`;
          if (!presencas[afternoonKey]?.recordId && (overtimeHours[userId] || 0) > 0) {
            periodOvertimeHours = overtimeHours[userId];
          }
        } else if (period === 'a') {
          // If afternoon exists, put overtime here
          periodOvertimeHours = overtimeHours[userId] || 0;
        }
        
        const payload = {
          appeared: data.appeared,
          observations: data.observations || "",
          overtimeHours: periodOvertimeHours
        };

        if (data.recordId && data.appeared) {
          const res = await fetch(`/api/level-user-days/${data.recordId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          if (!res.ok) throw new Error("Erro ao guardar presença");
        }

        // Create new record when none exists but user marked presence
        if (!data.recordId && data.appeared) {
          const res = await fetch('/api/level-user-days', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              levelId: selectedWork,
              userId,
              day: selectedDate,
              period: key.split('-')[1],
              appeared: data.appeared,
              observations: data.observations || "",
              overtimeHours: periodOvertimeHours
            })
          });
          if (!res.ok) throw new Error('Erro ao criar presença');
          const created = await res.json();
          // Update local recordId so subsequent saves update
          setPresencas(prev => ({
            ...prev,
            [key]: {
              ...prev[key],
              recordId: created.id || created.recordId || prev[key]?.recordId
            }
          }));
        }
      }

      // After processing all presencas, create or update afternoon record for overtime if needed
      for (const userId of users.map(u => u.id)) {
        const afternoonKey = `${userId}-a`;
        const overtimeValue = overtimeHours[userId] || 0;

        // If overtime > 0 but no afternoon record exists (or exists but we still want to ensure overtime saved), create/update it
        if (overtimeValue > 0 && !(presencas[afternoonKey]?.recordId)) {
          const res = await fetch('/api/level-user-days', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              levelId: selectedWork,
              userId,
              day: selectedDate,
              period: 'a',
              appeared: null, // No presence marked, just overtime
              observations: "",
              overtimeHours: overtimeValue
            })
          });
          if (!res.ok) throw new Error('Erro ao criar registo de horas extra');
        } else if (overtimeValue > 0 && presencas[afternoonKey]?.recordId) {
          // If afternoon record exists, ensure overtimeHours is updated
          const res = await fetch(`/api/level-user-days/${presencas[afternoonKey].recordId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appeared: presencas[afternoonKey].appeared || null, observations: presencas[afternoonKey].observations || '', overtimeHours: overtimeValue })
          });
          if (!res.ok) throw new Error('Erro ao actualizar registo de horas extra');
        }
      }

      // Refresh presencas to reflect saved overtime values
      await fetchPresencas();

      setModal({
        type: 'success',
        title: 'Sucesso',
        message: 'Presenças guardadas com sucesso!',
        onConfirm: null
      });
    } catch (err) {
      setModal({
        type: 'error',
        title: 'Erro',
        message: err.message,
        onConfirm: null
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPresenceReport = async () => {
    if (!reportFrom || !reportTo) {
      setModal({
        type: 'error',
        title: 'Erro',
        message: 'Selecione o período do relatório.',
        onConfirm: null
      });
      return;
    }

    setReportLoading(true);
    try {
      const res = await fetch(`/api/level-user-days?from=${reportFrom}&to=${reportTo}`);
      if (!res.ok) throw new Error('Erro ao carregar relatório');
      const data = await res.json();

      const confirmed = data.filter(r => r.appeared === 'yes');
      const uniqueLevelIds = [...new Set(confirmed.map(r => r.levelId))];
      const levelMap = {};

      await Promise.all(
        uniqueLevelIds.map(async (levelId) => {
          const levelRes = await fetch(`/api/levels/${levelId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (levelRes.ok) {
            const level = await levelRes.json();
            levelMap[levelId] = level?.name || `Obra ${levelId}`;
          } else {
            levelMap[levelId] = `Obra ${levelId}`;
          }
        })
      );

      const grouped = {};
      confirmed.forEach((record) => {
        const userId = record.userId;
        if (!grouped[userId]) {
          grouped[userId] = {
            userId,
            name: record.name || `User ${userId}`,
            email: record.email || '',
            days: new Set(),
            totalConfirmed: 0,
            overtimeHours: 0,
            works: {}
          };
        }

        const dayKey = typeof record.day === 'string'
          ? record.day.split('T')[0]
          : new Date(record.day).toISOString().slice(0, 10);

        grouped[userId].days.add(dayKey);
        grouped[userId].totalConfirmed += 0.5;
        grouped[userId].overtimeHours += Number(record.overtimeHours || 0);
        grouped[userId].works[record.levelId] = (grouped[userId].works[record.levelId] || 0) + 1;
      });

        // Also include overtime from records where appeared !== 'yes' (e.g., afternoon marked 'no')
        data.forEach((record) => {
          const oh = Number(record.overtimeHours || 0);
          if (oh > 0) {
            const userId = record.userId;
            if (!grouped[userId]) {
              grouped[userId] = {
                userId,
                name: record.name || `User ${userId}`,
                email: record.email || '',
                days: new Set(),
                totalConfirmed: 0,
                overtimeHours: 0,
                works: {}
              };
            }
            grouped[userId].overtimeHours += oh;
          }
        });

      const rows = Object.values(grouped)
        .map((u) => ({
          ...u,
          daysCount: u.days.size,
          worksList: Object.entries(u.works).map(([levelId, count]) => ({
            levelId: parseInt(levelId),
            name: levelMap[levelId] || `Obra ${levelId}`,
            count
          }))
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setReportRows(rows);

      // Build report matrix: rows = days, columns = users with confirmed presences
      const usersOrdered = rows.filter(r => (r.totalConfirmed || 0) > 0).map(r => ({ userId: r.userId, name: r.name }));

      // Helper to format date to YYYY-MM-DD
      const fmt = (d) => {
        const dt = new Date(d);
        return dt.toISOString().slice(0, 10);
      };

      const start = new Date(reportFrom);
      const end = new Date(reportTo);
      const days = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        days.push(fmt(new Date(d)));
      }

      const matrixRows = days.map((dayStr) => {
        const cells = {};
        usersOrdered.forEach(({ userId }) => {
          // morning
          const morningRec = data.find(r => r.userId === userId && (typeof r.day === 'string' ? r.day.split('T')[0] : new Date(r.day).toISOString().slice(0,10)) === dayStr && r.period === 'm' && r.appeared === 'yes');
          const afternoonRec = data.find(r => r.userId === userId && (typeof r.day === 'string' ? r.day.split('T')[0] : new Date(r.day).toISOString().slice(0,10)) === dayStr && r.period === 'a' && r.appeared === 'yes');

          const extractNum = (levelId) => {
            const name = levelMap[levelId] || '';
            const m = name.match(/\b(\d+)\b/);
            return m ? m[1] : 'NA';
          };

          const morningVal = morningRec && morningRec.levelId ? extractNum(morningRec.levelId) : '';
          const afternoonVal = afternoonRec && afternoonRec.levelId ? extractNum(afternoonRec.levelId) : '';

          // Sum overtime for this user/day (both periods)
          const overtimeSum = data.reduce((acc, r) => {
            const rDay = (typeof r.day === 'string' ? r.day.split('T')[0] : new Date(r.day).toISOString().slice(0,10));
            if (r.userId === userId && rDay === dayStr) return acc + Number(r.overtimeHours || 0);
            return acc;
          }, 0);

          // If user has no confirmed presence for this day, leave cell blank
          const hasConfirmed = Boolean(morningRec || afternoonRec);
          if (!hasConfirmed) {
            cells[userId] = null;
          } else {
            cells[userId] = {
              morning: morningVal === '' ? 'NA' : morningVal,
              afternoon: afternoonVal === '' ? 'NA' : afternoonVal,
              overtime: overtimeSum
            };
          }
        });
        return { day: dayStr, cells };
      });

      setReportMatrix({ days, users: usersOrdered, rows: matrixRows });
    } catch (err) {
      setModal({
        type: 'error',
        title: 'Erro',
        message: err.message || 'Erro ao carregar relatório',
        onConfirm: null
      });
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="presencas-bg">
      <div className="presencas-container">
        <div className="presencas-header">
          <h1 className="presencas-title">📋 Presenças</h1>
          <div className="presencas-view-toggle">
            <button
              className={`presencas-view-btn ${presenceView === 'mark' ? 'active' : ''}`}
              onClick={() => setPresenceView('mark')}
              title="Marcar presenças"
            >
              📅 Marcar Presenças
            </button>
            <button
              className={`presencas-view-btn ${presenceView === 'report' ? 'active' : ''}`}
              onClick={() => setPresenceView('report')}
              title="Relatório por trabalhador"
            >
              👷 Report Presenças
            </button>
          </div>
        </div>

        {presenceView === 'mark' ? (
          <>
            {/* Filtros */}
            <div className="presencas-filters">
              <div className="presencas-field">
                <label>Obra</label>
                <select 
                  value={selectedWork} 
                  onChange={(e) => {
                    setSelectedWork(e.target.value);
                    setUsers([]);
                    setPresencas({});
                  }}
                >
                  <option value="">-- Seleccione uma obra --</option>
                  {works.map(work => (
                    <option key={work.id} value={work.id}>{work.name}</option>
                  ))}
                </select>
              </div>

              <div className="presencas-field">
                <label>Data</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              <button 
                onClick={fetchPresencas}
                className="presencas-btn-load"
                disabled={!selectedWork || !selectedDate || loading}
              >
                {loading ? "A carregar..." : "Carregar Presenças"}
              </button>
            </div>

            {/* Grid de Presenças */}
            {users.length > 0 && (
              <div className="presencas-grid-section">
                <h2>Registar Presenças</h2>
                {isMobile ? (
                  <div className="presencas-mobile-list">
                    {users.map(user => (
                      <div key={user.id} className="presencas-card">
                        <div className="presencas-card-header">
                          <div className="presencas-card-name">{user.name}</div>
                          <div className="presencas-card-extra">
                            <span>Horas Extra</span>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="24"
                              value={overtimeHours[user.id] || ''}
                              onChange={(e) => handleOvertimeChange(user.id, parseFloat(e.target.value) || 0)}
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <div className="presencas-card-body">
                          {SLOTS.map(slot => {
                            const key = `${user.id}-${slot}`;
                            const data = presencas[key] || { appeared: null, observations: "", recordId: null };
                            const slotLabel = slot === 'm' ? 'Manhã' : 'Tarde';
                            return (
                              <div key={slot} className="presencas-card-slot">
                                <div className="presencas-card-slot-title">{slot === 'm' ? '🌅' : '🌤️'} {slotLabel}</div>
                                <div className="presencas-card-presence">
                                  <label className={`presencas-chip ${data.appeared === 'yes' ? 'active' : ''}`} onClick={() => handleToggleAppeared(user.id, slot, 'yes')}>
                                    Sim
                                  </label>
                                  <label className={`presencas-chip ${data.appeared === 'no' ? 'active' : ''}`} onClick={() => handleToggleAppeared(user.id, slot, 'no')}>
                                    Não
                                  </label>
                                </div>
                                <textarea
                                  className="presencas-card-notes"
                                  value={data.observations}
                                  onChange={(e) => handleObservationChange(user.id, slot, e.target.value)}
                                  placeholder="Notas (opcional)..."
                                  rows="3"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="presencas-grid">
                    {/* Header com slots */}
                    <div className="presencas-grid-header">
                      <div className="presencas-grid-cell presencas-grid-user">Utilizador</div>
                      {SLOTS.map(slot => (
                        <div key={slot} className="presencas-grid-slot-header">
                          <div className="presencas-grid-slot-title">{slot === "m" ? "🌅 Manhã" : "🌤️ Tarde"}</div>
                          <div className="presencas-grid-slot-sub">
                            <span>Presença</span>
                            <span>Notas</span>
                          </div>
                        </div>
                      ))}
                      <div className="presencas-grid-cell" style={{ fontWeight: 600, background: '#fef3c7' }}>⏰ Horas Extra</div>
                    </div>

                    {/* Linhas com users */}
                    {users.map(user => (
                      <div key={user.id} className="presencas-grid-row">
                        <div className="presencas-grid-cell presencas-grid-user">
                          {user.name}
                        </div>
                        {SLOTS.map(slot => {
                          const key = `${user.id}-${slot}`;
                          const data = presencas[key] || { appeared: null, observations: "", recordId: null };
                          
                          return (
                            <div key={slot} className="presencas-slot-cell">
                              <div className="presencas-appearance">
                                <label className="presencas-radio">
                                  <input
                                    type="radio"
                                    name={`${key}-appearance`}
                                    value="yes"
                                    checked={data.appeared === 'yes'}
                                    onChange={() => handleToggleAppeared(user.id, slot, 'yes')}
                                  />
                                  Sim
                                </label>
                                <label className="presencas-radio">
                                  <input
                                    type="radio"
                                    name={`${key}-appearance`}
                                    value="no"
                                    checked={data.appeared === 'no'}
                                    onChange={() => handleToggleAppeared(user.id, slot, 'no')}
                                  />
                                  Não
                                </label>
                              </div>

                              <div className="presencas-notes-field">
                                <textarea
                                  value={data.observations}
                                  onChange={(e) => handleObservationChange(user.id, slot, e.target.value)}
                                  placeholder="Notas (opcional)..."
                                  rows="3"
                                />
                              </div>
                            </div>
                          );
                        })}
                        <div className="presencas-grid-cell" style={{ background: '#fffbeb', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#92400e' }}>⏰ Horas Extra</label>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="24"
                            value={overtimeHours[user.id] || ''}
                            onChange={(e) => handleOvertimeChange(user.id, parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            style={{
                              width: '100%',
                              padding: '8px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '14px'
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Botão Guardar */}
                <button 
                  onClick={handleSavePresencas}
                  className="presencas-btn-save"
                  disabled={loading}
                >
                  {loading ? "A guardar..." : "Guardar Presenças"}
                </button>
              </div>
            )}

            {users.length === 0 && selectedWork && selectedDate && !loading && (
              <p className="presencas-empty">Nenhuma presença registada para este dia.</p>
            )}
          </>
        ) : (
          <div className="presencas-report">
            <div className="presencas-filters">
              <div className="presencas-field">
                <label>De</label>
                <input
                  type="date"
                  value={reportFrom}
                  onChange={(e) => setReportFrom(e.target.value)}
                />
              </div>
              <div className="presencas-field">
                <label>Até</label>
                <input
                  type="date"
                  value={reportTo}
                  onChange={(e) => setReportTo(e.target.value)}
                />
              </div>
              <button
                onClick={fetchPresenceReport}
                className="presencas-btn-load"
                disabled={!reportFrom || !reportTo || reportLoading}
              >
                {reportLoading ? 'A carregar...' : 'Gerar Report'}
              </button>
            </div>

            {reportRows.length === 0 && reportFrom && reportTo && !reportLoading && (
              <p className="presencas-empty">Sem presenças confirmadas no período.</p>
            )}

            {reportRows.length > 0 && (
              <div className="presencas-report-table">
                <div className="presencas-report-header">
                  <div>Trabalhador</div>
                  <div>Presenças</div>
                  <div>Dias</div>
                  <div>Horas Extra</div>
                  <div>Obras</div>
                </div>
                {reportRows.map((row) => (
                  <div key={row.userId} className="presencas-report-row">
                    <div className="presencas-report-user">
                      <div className="presencas-report-name">{row.name}</div>
                      {row.email && <div className="presencas-report-email">{row.email}</div>}
                    </div>
                    <div className="presencas-report-kpi">{row.totalConfirmed.toFixed(1)}</div>
                    <div className="presencas-report-kpi">{row.daysCount}</div>
                    <div className="presencas-report-kpi">{row.overtimeHours.toFixed(2)}</div>
                    <div className="presencas-report-works">
                      {row.worksList.map((w) => (
                        <span key={w.levelId} className="presencas-report-chip">
                          {w.name}: {w.count}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {reportMatrix && reportMatrix.rows.length > 0 && (
              <div className="presencas-matrix">
                <h3>Matriz de Presenças por Dia</h3>
                <div className="matrix-scroll">
                  <table className="matrix-table">
                    <thead>
                      <tr>
                        <th>Dia</th>
                        {reportMatrix.users.map(u => (
                          <th key={u.userId}>{u.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportMatrix.rows.map(r => (
                        <tr key={r.day}>
                          <td className="matrix-day">{r.day}</td>
                          {reportMatrix.users.map(u => {
                            const c = r.cells[u.userId];
                            if (!c) return <td key={u.userId} className="matrix-cell" />;
                            return (
                              <td key={u.userId} className="matrix-cell">
                                <div className="matrix-cell-grid">
                                  <div className="matrix-col">
                                    <div className="matrix-col-label">M</div>
                                    <div className="matrix-col-value">{c.morning}</div>
                                  </div>
                                  <div className="matrix-col">
                                    <div className="matrix-col-label">A</div>
                                    <div className="matrix-col-value">{c.afternoon}</div>
                                  </div>
                                  <div className="matrix-col">
                                    <div className="matrix-col-label">HE</div>
                                    <div className="matrix-col-value">{c.overtime.toFixed(2)}</div>
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal.type && (
        <div className="presencas-modal-overlay" onClick={() => setModal({ ...modal, type: null })}>
          <div className="presencas-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="presencas-modal-title" style={{
              color: modal.type === 'error' ? '#dc2626' : '#059669'
            }}>
              {modal.type === 'error' ? '❌ ' : '✓ '}
              {modal.title}
            </h2>
            <p className="presencas-modal-message">{modal.message}</p>
            <button 
              className="presencas-modal-btn"
              style={{
                background: modal.type === 'error' ? '#dc2626' : '#059669'
              }}
              onClick={() => setModal({ ...modal, type: null })}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; }
        
        .presencas-bg {
          min-height: 100vh;
          background: #f0fdf9;
          padding: 16px;
        }
        
        .presencas-container {
          max-width: 1400px;
          margin: 0 auto;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 1px 8px rgba(1, 163, 131, 0.08);
          padding: 24px;
          border: 1px solid #d1fae5;
        }

        .presencas-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 24px;
        }
        
        .presencas-title {
          font-size: 2rem;
          font-weight: 700;
          color: #01a383;
          margin: 0;
        }

        .presencas-view-toggle {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .presencas-view-btn {
          padding: 8px 14px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .presencas-view-btn.active {
          background: #01a383;
          color: #fff;
          border-color: #01a383;
        }
        
        .presencas-filters {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
          align-items: flex-end;
        }
        
        .presencas-field {
          flex: 1;
          min-width: 200px;
        }
        
        .presencas-field label {
          display: block;
          font-weight: 600;
          color: #475569;
          margin-bottom: 6px;
          font-size: 0.95rem;
        }

        .presencas-matrix { margin-top: 20px; }
        .matrix-scroll { overflow: auto; }
        .matrix-table { border-collapse: collapse; width: 100%; min-width: 800px; }
        .matrix-table th, .matrix-table td { border: 1px solid #e6f4ef; padding: 8px; text-align: left; vertical-align: top; }
        .matrix-day { width: 120px; font-weight: 700; }
        .matrix-cell { white-space: nowrap; }
        .matrix-metric { font-size: 0.9rem; color: #0f172a; }
        .matrix-cell-grid { display: flex; gap: 12px; }
        .matrix-col { display: flex; flex-direction: column; align-items: flex-start; min-width: 60px; }
        .matrix-col-label { font-weight: 700; color: #475569; font-size: 0.85rem; }
        .matrix-col-value { font-size: 0.95rem; color: #0f172a; }
        
        .presencas-field input,
        .presencas-field select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 1rem;
          background: #fff;
          transition: border 0.2s;
        }
        
        .presencas-field input:focus,
        .presencas-field select:focus {
          outline: none;
          border-color: #01a383;
        }
        
        .presencas-btn-load {
          background: #01a383;
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 10px 20px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .presencas-btn-load:hover:not(:disabled) {
          background: #018568;
        }
        
        .presencas-btn-load:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .presencas-grid-section {
          margin-top: 24px;
        }
        
        .presencas-grid-section h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #01a383;
          margin-bottom: 16px;
        }
        
        .presencas-grid {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow-x: auto;
          margin-bottom: 20px;
          background: #fff;
        }
        
        .presencas-grid-header {
          display: grid;
          grid-template-columns: 200px repeat(2, 1fr);
          gap: 0;
          background: #f8fafc;
          border-bottom: 2px solid #e2e8f0;
          position: sticky;
          top: 0;
        }
        
        .presencas-grid-cell {
          padding: 12px;
          font-size: 0.95rem;
          border-right: 1px solid #e2e8f0;
        }
        
        .presencas-grid-cell:last-child {
          border-right: none;
        }
        
        .presencas-grid-user {
          font-weight: 600;
          color: #1e293b;
          background: #f1f5f9;
        }
        
        .presencas-grid-slot-header {
          padding: 0;
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
        }
        
        .presencas-grid-slot-header:last-child {
          border-right: none;
        }
        
        .presencas-grid-slot-title {
          flex: 1;
          padding: 12px;
          font-weight: 700;
          color: #01a383;
          text-align: center;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .presencas-grid-slot-sub {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          flex: 1;
        }
        
        .presencas-grid-slot-sub span {
          padding: 8px;
          text-align: center;
          font-size: 0.85rem;
          font-weight: 500;
          color: #64748b;
          border-right: 1px solid #e2e8f0;
        }
        
        .presencas-grid-slot-sub span:last-child {
          border-right: none;
        }
        
        .presencas-grid-row {
          display: grid;
          grid-template-columns: 200px repeat(2, 1fr);
          gap: 0;
          border-bottom: 1px solid #e2e8f0;
          align-items: stretch;
        }
        
        .presencas-grid-row:last-child {
          border-bottom: none;
        }
        
        .presencas-grid-row .presencas-grid-user {
          display: flex;
          align-items: center;
          padding: 12px;
          font-weight: 500;
          color: #1e293b;
          border-right: 1px solid #e2e8f0;
        }
        
        .presencas-slot-cell {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          border-right: 1px solid #e2e8f0;
          align-items: stretch;
        }
        
        .presencas-slot-cell:last-child {
          border-right: none;
        }
        
        .presencas-appearance {
          padding: 12px;
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          gap: 6px;
          justify-content: center;
          background: #fff;
        }
        
        .presencas-notes-field {
          padding: 10px;
          background: #f8fafc;
          display: flex;
          align-items: stretch;
        }
        
        .presencas-notes-field textarea {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 8px;
          font-size: 0.9rem;
          font-family: inherit;
          resize: vertical;
          min-height: 72px;
          background: #fff;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        
        .presencas-notes-field textarea:focus {
          outline: none;
          border-color: #01a383;
          box-shadow: 0 0 0 2px rgba(1, 163, 131, 0.1);
        }
        
        .presencas-radio {
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          color: #475569;
        }
        
        .presencas-radio input {
          cursor: pointer;
          accent-color: #01a383;
        }
        
        .presencas-btn-save {
          background: #01a383;
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 12px 24px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s;
          width: 100%;
        }
        
        .presencas-btn-save:hover:not(:disabled) {
          background: #018568;
        }
        
        .presencas-btn-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .presencas-empty {
          text-align: center;
          color: #64748b;
          padding: 32px;
          font-size: 1.1rem;
        }

        .presencas-report-table {
          display: grid;
          gap: 10px;
          margin-top: 12px;
        }

        .presencas-report-header,
        .presencas-report-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr 3fr;
          gap: 12px;
          align-items: center;
          padding: 12px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #fff;
        }

        .presencas-report-header {
          background: #f8fafc;
          font-weight: 700;
          color: #334155;
        }

        .presencas-report-user {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .presencas-report-name {
          font-weight: 700;
          color: #0f172a;
        }

        .presencas-report-email {
          font-size: 0.85rem;
          color: #64748b;
        }

        .presencas-report-kpi {
          font-weight: 700;
          color: #01a383;
        }

        .presencas-report-works {
          display: grid;
          grid-template-columns: 1fr;
          gap: 6px;
          width: 100%;
        }

        .presencas-report-chip {
          padding: 6px 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-left: 4px solid #01a383;
          border-radius: 6px;
          font-size: 0.9rem;
          color: #0f172a;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .presencas-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        
        .presencas-modal-content {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);
          padding: 24px;
          max-width: 400px;
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
        
        .presencas-modal-title {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 12px;
        }
        
        .presencas-modal-message {
          color: #475569;
          margin-bottom: 20px;
          line-height: 1.5;
        }
        
        .presencas-modal-btn {
          width: 100%;
          padding: 10px;
          color: #fff;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        
        .presencas-modal-btn:hover {
          opacity: 0.9;
        }

        /* Mobile layout */
        @media (max-width: 768px) {
          .presencas-container {
            padding: 16px;
          }
          .presencas-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .presencas-title {
            font-size: 1.5rem;
            margin-bottom: 16px;
          }
          .presencas-filters {
            flex-direction: column;
            align-items: stretch;
          }
          .presencas-field {
            min-width: 100%;
          }
          .presencas-btn-load {
            width: 100%;
            text-align: center;
          }
          .presencas-grid {
            display: none;
          }
          .presencas-grid-section h2 {
            font-size: 1.25rem;
          }
          .presencas-mobile-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .presencas-card {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            background: #fff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.04);
            padding: 12px;
          }
          .presencas-card-header {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: center;
            margin-bottom: 10px;
          }
          .presencas-card-name {
            font-weight: 700;
            color: #0f172a;
            font-size: 1rem;
          }
          .presencas-card-extra {
            display: flex;
            gap: 8px;
            align-items: center;
            font-size: 0.9rem;
            color: #475569;
          }
          .presencas-card-extra input {
            width: 72px;
            padding: 6px 8px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: 0.9rem;
          }
          .presencas-card-body {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .presencas-card-slot {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px;
            background: #f8fafc;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .presencas-card-slot-title {
            font-weight: 700;
            color: #01a383;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .presencas-card-presence {
            display: flex;
            gap: 8px;
          }
          .presencas-chip {
            flex: 1;
            border: 1px solid #d1d5db;
            border-radius: 999px;
            padding: 8px 10px;
            text-align: center;
            font-weight: 600;
            color: #475569;
            background: #fff;
            cursor: pointer;
            transition: all 0.15s ease;
            user-select: none;
          }
          .presencas-chip.active {
            background: #dcfce7;
            color: #166534;
            border-color: #86efac;
          }
          .presencas-card-notes {
            width: 100%;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 8px;
            font-size: 0.95rem;
            min-height: 70px;
            resize: vertical;
            background: #fff;
          }
          .presencas-btn-save {
            position: sticky;
            bottom: 12px;
            z-index: 10;
          }

          .presencas-report-header,
          .presencas-report-row {
            grid-template-columns: 1fr;
          }
          .presencas-report-works {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
