import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import html2pdf from 'html2pdf.js';
import { formatDateToDDMMYYYY } from '../utils/helpers';

export default function Reports() {
  const { token, user } = useAuth();
  const [obras, setObras] = useState([]);
  const [selectedObras, setSelectedObras] = useState(new Set());
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [error, setError] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Check admin access
  useEffect(() => {
    loadObras();
    // Set default date range (Monday to Friday of current week)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // Calculate Monday (start of week)
    const monday = new Date(today);
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days
    monday.setDate(today.getDate() + daysToMonday);
    
    // Calculate Friday (end of work week)
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4); // Monday + 4 days = Friday
    
    setFromDate(monday.toISOString().slice(0, 10));
    setToDate(friday.toISOString().slice(0, 10));
  }, [user, token]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  const loadObras = async () => {
    try {
      const res = await fetch('/api/permissions/my-works', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setObras(data.filter(o => o.status === 'active'));
      }
    } catch (err) {
      console.error('Erro ao carregar obras:', err);
      setError('Erro ao carregar obras');
    }
  };

  const toggleObraSelection = (obraId) => {
    const newSet = new Set(selectedObras);
    if (newSet.has(obraId)) {
      newSet.delete(obraId);
    } else {
      newSet.add(obraId);
    }
    setSelectedObras(newSet);
  };

  const generateReport = async () => {
    if (selectedObras.size === 0) {
      setError('Selecione pelo menos uma obra');
      return;
    }
    if (!fromDate || !toDate) {
      setError('Selecione o intervalo de datas');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const reports = {};
      for (const obraId of selectedObras) {
        const res = await fetch(`/api/reports/${obraId}?fromDate=${fromDate}&toDate=${toDate}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          reports[obraId] = data;
        } else {
          const errorData = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(`Erro ao gerar relatório para obra ${obraId}: ${res.status} - ${errorData.error || 'Desconhecido'}`);
        }
      }
      setReportData(reports);
      setPreviewMode(true);
    } catch (err) {
      console.error('Erro ao gerar relatório:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    if (!reportData) return;

    const element = document.getElementById('report-content');
    const opt = {
      margin: 10,
      filename: `Relatório-Obras-${fromDate}-${toDate}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
      setError('Erro ao gerar PDF');
    }
  };

  // Preview Mode
  if (previewMode && reportData) {
    return (
      <div style={{ padding: '20px', background: '#f8fafc', minHeight: '100vh' }}>
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setPreviewMode(false)}
            style={{
              padding: '10px 20px',
              background: '#e2e8f0',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            ← Voltar
          </button>
          <button
            onClick={exportPDF}
            style={{
              padding: '10px 20px',
              background: '#01a383',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            📥 Descarregar PDF
          </button>
        </div>

        <div id="report-content" style={{ background: '#fff', padding: '40px', borderRadius: '8px' }}>
          {Object.entries(reportData).map(([obraId, data]) => (
            <div key={obraId} style={{ marginBottom: '80px', pageBreakAfter: 'always' }}>
              <ReportPage data={data} fromDate={fromDate} toDate={toDate} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Selection Mode
  return (
    <div style={{ padding: '30px', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '30px', fontSize: '2rem', fontWeight: '800', color: '#1e293b' }}>
          📄 Relatórios de Obras
        </h1>

        {error && (
          <div
            style={{
              marginBottom: '20px',
              padding: '15px',
              background: '#fee2e2',
              color: '#991b1b',
              borderRadius: '8px',
              borderLeft: '4px solid #ef4444'
            }}
          >
            {error}
          </div>
        )}

        <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          {/* Obra Selection - Dropdown */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '15px', color: '#334155' }}>
              Selecione as Obras
            </h2>
            <div ref={dropdownRef} style={{ position: 'relative', maxWidth: '400px' }}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  width: '100%',
                  padding: '12px 15px',
                  background: '#fff',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '1rem',
                  color: '#334155',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
              >
                <span>
                  {selectedObras.size === 0 
                    ? 'Selecionar obras...' 
                    : `${selectedObras.size} obra${selectedObras.size !== 1 ? 's' : ''} selecionada${selectedObras.size !== 1 ? 's' : ''}`}
                </span>
                <span style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                  ▼
                </span>
              </button>

              {dropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#fff',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  marginTop: '5px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 10
                }}>
                  {obras.map((obra) => (
                    <label
                      key={obra.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        padding: '12px 15px',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        background: selectedObras.has(obra.id) ? '#f0fdf4' : 'transparent'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = selectedObras.has(obra.id) ? '#e6f9f0' : '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = selectedObras.has(obra.id) ? '#f0fdf4' : 'transparent'}
                    >
                      <input
                        type="checkbox"
                        checked={selectedObras.has(obra.id)}
                        onChange={() => toggleObraSelection(obra.id)}
                        style={{ cursor: 'pointer', marginRight: '10px', marginTop: '2px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', color: '#334155' }}>{obra.name}</div>
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                          {new Date(obra.startDate).toLocaleDateString('pt-PT')} → {new Date(obra.endDate).toLocaleDateString('pt-PT')}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Date Range */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '15px', color: '#334155' }}>
              Intervalo de Datas para o Relatório
            </h2>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569' }}>
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '1rem'
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569' }}>
                  Data Final
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '1rem'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={generateReport}
            disabled={loading || selectedObras.size === 0}
            style={{
              width: '100%',
              padding: '15px',
              background: loading || selectedObras.size === 0 ? '#cbd5e1' : '#01a383',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: '700',
              cursor: loading || selectedObras.size === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {loading ? 'A gerar relatório...' : '📊 Gerar Relatório'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportPage({ data, fromDate, toDate }) {
  const { token } = useAuth();
  const obra = data.obra;
  const kpis = data.kpis;
  const progress = data.progress || [];
  const materials = data.materials || [];
  const issuePhotos = data.issuePhotos || [];
  const completedTasks = data.completedTasks || [];
  const monthlyStats = data.monthlyStats || {};
  const [planningData, setPlanningData] = useState(null);

  const formatDate = (date) => new Date(date).toLocaleDateString('pt-PT');

  // Load planning data when component mounts
  useEffect(() => {
    const loadPlanning = async () => {
      try {
        console.log('Fetching planning for obra:', obra.id, 'fromDate:', fromDate, 'toDate:', toDate);
        const url = `/api/level-user-days/level/${obra.id}?from=${fromDate}&to=${toDate}`;
        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          console.log('Planning data fetched:', data);
          setPlanningData(data);
        } else {
          console.error('Failed to fetch planning:', res.status, res.statusText);
        }
      } catch (err) {
        console.error('Erro ao carregar planeamento:', err);
      }
    };
    if (obra?.id && token) {
      loadPlanning();
    }
  }, [obra?.id, fromDate, toDate, token]);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6', color: '#333' }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '15px', borderBottom: '1px solid #01a383', paddingBottom: '8px' }}>
        {obra.coverImage && (
          <img
            src={obra.coverImage}
            alt={obra.name}
            style={{
              width: '65px',
              height: '65px',
              objectFit: 'cover',
              borderRadius: '4px'
            }}
          />
        )}
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#01a383', margin: '0 0 2px 0' }}>
            {obra.name}
          </h1>
          <p style={{ margin: '1px 0', fontSize: '0.7rem' }}>
            <strong>Período:</strong> {formatDate(obra.startDate)} → {formatDate(obra.endDate)}
          </p>
          <p style={{ margin: '1px 0', fontSize: '0.65rem', color: '#666' }}>
            Relatório: {formatDate(fromDate)} → {formatDate(toDate)}
          </p>
        </div>
      </div>

      {/* KPIs - First Section */}
      <div style={{ marginBottom: '10px' }}>
        <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#01a383', marginBottom: '6px', borderBottom: '1px solid #01a383', paddingBottom: '3px' }}>
          📊 KPIs
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
          <div style={{ background: '#e6f9f6', padding: '6px', borderRadius: '4px', border: '1px solid #01a383' }}>
            <div style={{ fontSize: '0.6rem', color: '#666', marginBottom: '1px' }}>Total</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#01a383' }}>{kpis.totalTasks}</div>
          </div>
          <div style={{ background: '#d1fae5', padding: '6px', borderRadius: '4px', border: '1px solid #10b981' }}>
            <div style={{ fontSize: '0.6rem', color: '#666', marginBottom: '1px' }}>Concluídas</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#10b981' }}>{kpis.completedTasks}</div>
          </div>
          <div style={{ background: '#fef3c7', padding: '6px', borderRadius: '4px', border: '1px solid #f59e0b' }}>
            <div style={{ fontSize: '0.6rem', color: '#666', marginBottom: '1px' }}>Pendentes</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#f59e0b' }}>{kpis.pendingTasks}</div>
          </div>
          <div style={{ background: '#f3e8ff', padding: '6px', borderRadius: '4px', border: '1px solid #a855f7' }}>
            <div style={{ fontSize: '0.6rem', color: '#666', marginBottom: '1px' }}>%</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#a855f7' }}>
              {kpis.totalTasks > 0 ? Math.round((kpis.completedTasks / kpis.totalTasks) * 100) : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Stats */}
      <div style={{ marginBottom: '10px' }}>
        <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#01a383', marginBottom: '6px', borderBottom: '1px solid #01a383', paddingBottom: '3px' }}>
          📅 Estatísticas
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          <div style={{ background: '#e6f9f6', padding: '6px', borderRadius: '4px', border: '1px solid #01a383' }}>
            <div style={{ fontSize: '0.6rem', color: '#666', marginBottom: '1px' }}>Mês Ant.</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#01a383' }}>
              {monthlyStats.completedLastMonth || 0}
            </div>
          </div>
          <div style={{ background: '#d1fae5', padding: '6px', borderRadius: '4px', border: '1px solid #10b981' }}>
            <div style={{ fontSize: '0.6rem', color: '#666', marginBottom: '1px' }}>Mês Atual</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#10b981' }}>
              {monthlyStats.completedCurrentMonth || 0}
            </div>
          </div>
          <div style={{ background: '#fef3c7', padding: '6px', borderRadius: '4px', border: '1px solid #f59e0b' }}>
            <div style={{ fontSize: '0.6rem', color: '#666', marginBottom: '1px' }}>Semana</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#f59e0b' }}>
              {monthlyStats.completedCurrentWeek || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Planeamento Global */}
      {planningData && planningData.length > 0 && (
        <div style={{ marginBottom: '10px', pageBreakInside: 'avoid' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#01a383', marginBottom: '6px', borderBottom: '1px solid #01a383', paddingBottom: '3px' }}>
            📅 Planeamento
          </h2>
          
          {/* Build days array and organize planning data by user */}
          {(() => {
            const days = [];
            const start = new Date(fromDate);
            const end = new Date(toDate);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              days.push(d.toISOString().slice(0, 10));
            }
            
            // Group planning data by user
            const planningByUser = {};
            planningData.forEach(p => {
              if (!planningByUser[p.userId]) {
                planningByUser[p.userId] = { name: p.name, email: p.email, days: {} };
              }
              // Normalize day format (remove time component if present)
              const dayKey = typeof p.day === 'string' ? p.day.split('T')[0] : new Date(p.day).toISOString().slice(0, 10);
              if (!planningByUser[p.userId].days[dayKey]) {
                planningByUser[p.userId].days[dayKey] = [];
              }
              if (!planningByUser[p.userId].days[dayKey].includes(p.period)) {
                planningByUser[p.userId].days[dayKey].push(p.period);
              }
            });

            const userCount = Object.keys(planningByUser).length;
            console.log('Planning table - Users:', userCount, 'Days:', days.length, 'Data by user:', planningByUser);

            if (userCount === 0) {
              return <p style={{ color: '#999', fontSize: '0.85rem', marginTop: '10px' }}>Sem planeamento registado neste período.</p>;
            }

            return (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.6rem', border: '1px solid #e2e8f0' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ padding: '4px', textAlign: 'left', fontWeight: '600', borderRight: '1px solid #e2e8f0', fontSize: '0.65rem' }}>Utilizador</th>
                    {days.map(day => {
                      const dow = new Date(day).getDay();
                      const dayName = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'][dow];
                      return (
                        <th 
                          key={day} 
                          style={{ 
                            padding: '3px 2px',
                            textAlign: 'center',
                            fontWeight: '600',
                            borderRight: '1px solid #e2e8f0',
                            background: [0, 6].includes(dow) ? '#f3e8ff' : '#f8fafc',
                            fontSize: '0.5rem'
                          }}
                        >
                          <div style={{ fontSize: '0.5rem' }}>{day.split('-')[2]}</div>
                          <div style={{ fontSize: '0.45rem', opacity: 0.7 }}>{dayName}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(planningByUser).map(([userId, userData]) => (
                    <tr key={userId} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ 
                        padding: '4px', 
                        fontWeight: '500', 
                        color: '#333',
                        borderRight: '1px solid #e2e8f0',
                        background: '#fafafa',
                        maxWidth: '80px',
                        wordBreak: 'break-word',
                        fontSize: '0.6rem'
                      }}>
                        <div style={{ fontSize: '0.6rem' }}>{userData.name}</div>
                        <div style={{ fontSize: '0.5rem', color: '#999', marginTop: '1px' }}>{userData.email.split('@')[0]}</div>
                      </td>
                      {days.map(day => {
                        const periods = userData.days[day] || [];
                        const hasMorning = periods.includes('m');
                        const hasAfternoon = periods.includes('a');
                        const dow = new Date(day).getDay();
                        const isWeekend = [0, 6].includes(dow);
                        
                        return (
                          <td 
                            key={day}
                            style={{
                              padding: '2px 1px',
                              textAlign: 'center',
                              borderRight: '1px solid #e2e8f0',
                              background: isWeekend ? '#faf5ff' : '#fafafa'
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                              <div style={{
                                fontSize: '0.45rem',
                                padding: '1px 2px',
                                borderRadius: '2px',
                                background: hasMorning ? '#d1fae5' : '#f0f0f0',
                                color: hasMorning ? '#065f46' : '#999',
                                fontWeight: hasMorning ? '600' : '400'
                              }}>
                                {hasMorning ? '✓' : '—'}
                              </div>
                              <div style={{
                                fontSize: '0.45rem',
                                padding: '1px 2px',
                                borderRadius: '2px',
                                background: hasAfternoon ? '#d1fae5' : '#f0f0f0',
                                color: hasAfternoon ? '#065f46' : '#999',
                                fontWeight: hasAfternoon ? '600' : '400'
                              }}>
                                {hasAfternoon ? '✓' : '—'}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </div>
      )}

      {/* Progress da Obra - Simplified */}
      {progress.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#01a383', marginBottom: '6px', borderBottom: '1px solid #01a383', paddingBottom: '3px' }}>
            🌳 Progresso
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
            {progress.map((item) => (
              <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', alignItems: 'center', padding: '6px', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '2px', color: '#1e293b', fontSize: '0.7rem' }}>
                    {item.name}
                  </div>
                  <div style={{
                    width: '100%',
                    height: '12px',
                    background: '#e2e8f0',
                    borderRadius: '6px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${item.progressPercent}%`,
                      background: item.progressPercent >= 75 ? '#10b981' : item.progressPercent >= 50 ? '#f59e0b' : '#ef4444',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#01a383' }}>
                    {item.progressPercent}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Materials */}
      {materials.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#01a383', marginBottom: '6px', borderBottom: '1px solid #01a383', paddingBottom: '3px' }}>
            🛒 Materiais
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.65rem' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '4px', textAlign: 'left', borderBottom: '1px solid #cbd5e1', fontWeight: '600' }}>Descrição</th>
                <th style={{ padding: '4px', textAlign: 'center', borderBottom: '1px solid #cbd5e1', fontWeight: '600' }}>Qty</th>
                <th style={{ padding: '4px', textAlign: 'center', borderBottom: '1px solid #cbd5e1', fontWeight: '600' }}>Entrega</th>
                <th style={{ padding: '4px', textAlign: 'center', borderBottom: '1px solid #cbd5e1', fontWeight: '600' }}>Montagem</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((material) => (
                <tr key={material.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '3px' }}>{material.description}</td>
                  <td style={{ padding: '3px', textAlign: 'center', fontSize: '0.6rem' }}>
                    {material.quantity}
                  </td>
                  <td style={{ padding: '3px', textAlign: 'center', fontSize: '0.6rem' }}>
                    <span style={{
                      padding: '2px 4px',
                      borderRadius: '2px',
                      background: material.deliveryStatus === 'Delivered' ? '#d1fae5' : '#fef3c7',
                      color: material.deliveryStatus === 'Delivered' ? '#059669' : '#92400e',
                      fontSize: '0.55rem'
                    }}>
                      {material.deliveryStatus ? material.deliveryStatus.charAt(0).toUpperCase() : '—'}
                    </span>
                  </td>
                  <td style={{ padding: '3px', textAlign: 'center', fontSize: '0.6rem' }}>
                    <span style={{
                      padding: '2px 4px',
                      borderRadius: '2px',
                      background: material.assemblyStatus === 'Completed' ? '#d1fae5' : '#fef3c7',
                      color: material.assemblyStatus === 'Completed' ? '#059669' : '#92400e',
                      fontSize: '0.55rem'
                    }}>
                      {material.assemblyStatus ? material.assemblyStatus.charAt(0).toUpperCase() : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Issue Photos */}
      {issuePhotos.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#01a383', marginBottom: '6px', borderBottom: '1px solid #01a383', paddingBottom: '3px' }}>
            ⚠️ Fotos de Inconformidades
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {issuePhotos.map((photo) => (
              <div key={photo.id} style={{ background: '#f9fafb', padding: '4px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                {photo.photoUrl && (
                  <img
                    src={photo.photoUrl}
                    alt="Issue"
                    style={{
                      width: '100%',
                      height: '80px',
                      objectFit: 'cover',
                      borderRadius: '3px',
                      marginBottom: '3px'
                    }}
                  />
                )}
                {photo.observations && <p style={{ fontSize: '0.6rem', color: '#666', margin: '2px 0' }}>📝 {photo.observations.substring(0, 30)}...</p>}
              </div>
            ))}
          </div>
          {issuePhotos.length > 4 && <p style={{ marginTop: '4px', color: '#666', fontSize: '0.7rem' }}>... e mais {issuePhotos.length - 4} fotos</p>}
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#01a383', marginBottom: '6px', borderBottom: '1px solid #01a383', paddingBottom: '3px' }}>
            ✅ Tarefas Concluídas
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.65rem' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '4px', textAlign: 'left', borderBottom: '1px solid #cbd5e1', fontWeight: '600' }}>Tarefa</th>
                <th style={{ padding: '4px', textAlign: 'center', borderBottom: '1px solid #cbd5e1', fontWeight: '600' }}>Data</th>
              </tr>
            </thead>
            <tbody>
              {completedTasks.map((task) => (
                <tr key={task.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '3px' }}>{task.name.substring(0, 40)}</td>
                  <td style={{ padding: '3px', textAlign: 'center', fontSize: '0.6rem', color: '#666' }}>
                    {formatDate(task.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: '15px', paddingTop: '8px', borderTop: '1px solid #e2e8f0', fontSize: '0.6rem', color: '#999', textAlign: 'center' }}>
        <p>Relatório confidencial | Beniteca © 2026</p>
      </div>
    </div>
  );
}
