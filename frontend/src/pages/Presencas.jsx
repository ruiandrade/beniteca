import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function Presencas() {
  const { user, token } = useAuth();
  const [works, setWorks] = useState([]);
  const [selectedWork, setSelectedWork] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
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
            overtimeMap[record.userId] = record.overtimeHours;
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

      // After processing all presencas, create afternoon record for overtime if needed
      for (const userId of users.map(u => u.id)) {
        const afternoonKey = `${userId}-a`;
        const overtimeValue = overtimeHours[userId] || 0;
        
        // If overtime > 0 but no afternoon record exists, create one (afternoon exists but was never marked)
        if (overtimeValue > 0 && !presencas[afternoonKey]?.recordId && presencas[`${userId}-m`]?.recordId) {
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
        }
      }

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

  return (
    <div className="presencas-bg">
      <div className="presencas-container">
        <h1 className="presencas-title">📋 Presenças</h1>

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
        
        .presencas-title {
          font-size: 2rem;
          font-weight: 700;
          color: #01a383;
          margin-bottom: 24px;
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
        }
      `}</style>
    </div>
  );
}
