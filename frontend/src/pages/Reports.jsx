import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import html2pdf from 'html2pdf.js';

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

  // Check admin access
  useEffect(() => {
    if (user && user.role !== 'A') {
      setError('Apenas administradores podem aceder aos relatórios');
      return;
    }
    loadObras();
    // Set default date range (today to today + 30 days)
    const today = new Date();
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);
    setFromDate(today.toISOString().slice(0, 10));
    setToDate(in30Days.toISOString().slice(0, 10));
  }, [user, token]);

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
          throw new Error(`Erro ao gerar relatório para obra ${obraId}`);
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

  if (user && user.role !== 'A') {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
        <h2>Acesso Negado</h2>
        <p>Esta página é apenas para administradores.</p>
      </div>
    );
  }

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
          {/* Obra Selection */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '15px', color: '#334155' }}>
              Selecione as Obras
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
              {obras.map((obra) => (
                <label
                  key={obra.id}
                  style={{
                    padding: '15px',
                    background: selectedObras.has(obra.id) ? '#01a383' : '#f1f5f9',
                    color: selectedObras.has(obra.id) ? '#fff' : '#334155',
                    border: `2px solid ${selectedObras.has(obra.id) ? '#01a383' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedObras.has(obra.id)}
                    onChange={() => toggleObraSelection(obra.id)}
                    style={{ cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontWeight: '600' }}>{obra.name}</div>
                    <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                      {new Date(obra.startDate).toLocaleDateString('pt-PT')} → {new Date(obra.endDate).toLocaleDateString('pt-PT')}
                    </div>
                  </div>
                </label>
              ))}
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
  const obra = data.obra;
  const kpis = data.kpis;
  const hierarchy = data.hierarchy;
  const materials = data.materials;
  const issuePhotos = data.issuePhotos;
  const completedTasks = data.completedTasks;
  const monthlyStats = data.monthlyStats;

  const formatDate = (date) => new Date(date).toLocaleDateString('pt-PT');

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6', color: '#333' }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: '30px', marginBottom: '40px', borderBottom: '2px solid #01a383', paddingBottom: '20px' }}>
        {obra.coverImage && (
          <img
            src={obra.coverImage}
            alt={obra.name}
            style={{
              width: '150px',
              height: '150px',
              objectFit: 'cover',
              borderRadius: '8px'
            }}
          />
        )}
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#01a383', margin: '0 0 10px 0' }}>
            {obra.name}
          </h1>
          <p style={{ margin: '5px 0', fontSize: '0.95rem' }}>
            <strong>Descrição:</strong> {obra.description}
          </p>
          <p style={{ margin: '5px 0', fontSize: '0.95rem' }}>
            <strong>Período:</strong> {formatDate(obra.startDate)} → {formatDate(obra.endDate)}
          </p>
          <p style={{ margin: '5px 0', fontSize: '0.95rem' }}>
            <strong>Responsável:</strong> {obra.constructionManagerName || '—'} ({obra.constructionManagerEmail || '—'})
          </p>
          <p style={{ margin: '5px 0', fontSize: '0.95rem' }}>
            <strong>Director:</strong> {obra.siteDirectorName || '—'} ({obra.siteDirectorEmail || '—'})
          </p>
          <p style={{ margin: '10px 0 0 0', fontSize: '0.85rem', color: '#666' }}>
            Relatório gerado em {formatDate(new Date())} para {formatDate(fromDate)} → {formatDate(toDate)}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#01a383', marginBottom: '15px', borderBottom: '2px solid #01a383', paddingBottom: '10px' }}>
          📊 KPIs - Tarefas
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          <div style={{ background: '#e6f9f6', padding: '20px', borderRadius: '8px', border: '1px solid #01a383' }}>
            <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '5px' }}>Total de Tarefas</div>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#01a383' }}>{kpis.totalTasks}</div>
          </div>
          <div style={{ background: '#d1fae5', padding: '20px', borderRadius: '8px', border: '1px solid #10b981' }}>
            <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '5px' }}>Tarefas Concluídas</div>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#10b981' }}>{kpis.completedTasks}</div>
          </div>
          <div style={{ background: '#fef3c7', padding: '20px', borderRadius: '8px', border: '1px solid #f59e0b' }}>
            <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '5px' }}>Por Concluir</div>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#f59e0b' }}>{kpis.pendingTasks}</div>
          </div>
        </div>
      </div>

      {/* Hierarchy Summary */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#01a383', marginBottom: '15px', borderBottom: '2px solid #01a383', paddingBottom: '10px' }}>
          🌳 Progresso da Obra
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #cbd5e1', fontWeight: '600' }}>Nível</th>
              <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', fontWeight: '600' }}>Status</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #cbd5e1', fontWeight: '600' }}>Datas</th>
            </tr>
          </thead>
          <tbody>
            {hierarchy.slice(0, 20).map((node) => (
              <tr key={node.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px', fontWeight: node.parentId === null ? '700' : '400' }}>
                  {node.parentId === null ? '▶ ' : '  ├ '}{node.name}
                </td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      background: node.status === 'completed' ? '#d1fae5' : '#fef3c7',
                      color: node.status === 'completed' ? '#059669' : '#92400e'
                    }}
                  >
                    {node.status === 'completed' ? '✓ Concluído' : '⏳ Ativo'}
                  </span>
                </td>
                <td style={{ padding: '10px', fontSize: '0.85rem', color: '#666' }}>
                  {node.startDate ? formatDate(node.startDate) : '—'} → {node.endDate ? formatDate(node.endDate) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {hierarchy.length > 20 && <p style={{ marginTop: '10px', color: '#666', fontSize: '0.9rem' }}>... e mais {hierarchy.length - 20} níveis</p>}
      </div>

      {/* Monthly Stats */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#01a383', marginBottom: '15px', borderBottom: '2px solid #01a383', paddingBottom: '10px' }}>
          📅 Estatísticas Mensais
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          <div style={{ background: '#f0f4f8', padding: '15px', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '5px' }}>Mês Anterior</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#334155' }}>{monthlyStats.completedLastMonth}</div>
          </div>
          <div style={{ background: '#f0f4f8', padding: '15px', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '5px' }}>Mês Atual ({monthlyStats.currentMonth})</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#334155' }}>{monthlyStats.completedCurrentMonth}</div>
          </div>
          <div style={{ background: '#f0f4f8', padding: '15px', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '5px' }}>Semana Atual</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#334155' }}>{monthlyStats.completedCurrentWeek}</div>
          </div>
        </div>
      </div>

      {/* Materials */}
      {materials.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#01a383', marginBottom: '15px', borderBottom: '2px solid #01a383', paddingBottom: '10px' }}>
            🛒 Materiais em Espera (Pedido)
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #cbd5e1', fontWeight: '600' }}>Descrição</th>
                <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', fontWeight: '600' }}>Marca</th>
                <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', fontWeight: '600' }}>Quantidade</th>
                <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', fontWeight: '600' }}>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((material) => (
                <tr key={material.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px' }}>{material.name}</td>
                  <td style={{ padding: '10px', textAlign: 'center', fontSize: '0.85rem', color: '#666' }}>{material.brand || '—'}</td>
                  <td style={{ padding: '10px', textAlign: 'center', fontWeight: '600' }}>{material.quantity}</td>
                  <td style={{ padding: '10px', textAlign: 'center', fontSize: '0.85rem', color: '#666' }}>{material.type || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Issue Photos */}
      {issuePhotos.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#01a383', marginBottom: '15px', borderBottom: '2px solid #01a383', paddingBottom: '10px' }}>
            ⚠️ Fotos de Inconformidades ({fromDate} → {toDate})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
            {issuePhotos.slice(0, 9).map((photo) => (
              <div key={photo.id} style={{ background: '#f9fafb', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                {photo.photoUrl && (
                  <img
                    src={photo.photoUrl}
                    alt="Issue"
                    style={{
                      width: '100%',
                      height: '150px',
                      objectFit: 'cover',
                      borderRadius: '6px',
                      marginBottom: '10px'
                    }}
                  />
                )}
                <p style={{ fontSize: '0.85rem', fontWeight: '600', margin: '5px 0' }}>{photo.levelName}</p>
                {photo.observations && <p style={{ fontSize: '0.8rem', color: '#666', margin: '5px 0' }}>{photo.observations}</p>}
                <p style={{ fontSize: '0.75rem', color: '#999', margin: '5px 0' }}>{formatDate(photo.createdAt)}</p>
              </div>
            ))}
          </div>
          {issuePhotos.length > 9 && <p style={{ marginTop: '10px', color: '#666', fontSize: '0.9rem' }}>... e mais {issuePhotos.length - 9} fotos</p>}
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#01a383', marginBottom: '15px', borderBottom: '2px solid #01a383', paddingBottom: '10px' }}>
            ✅ Tarefas Concluídas ({fromDate} → {toDate})
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #cbd5e1', fontWeight: '600' }}>Tarefa</th>
                <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', fontWeight: '600' }}>Data de Conclusão</th>
              </tr>
            </thead>
            <tbody>
              {completedTasks.slice(0, 20).map((task) => (
                <tr key={task.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px' }}>{task.name}</td>
                  <td style={{ padding: '10px', textAlign: 'center', fontSize: '0.85rem', color: '#666' }}>
                    {formatDate(task.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {completedTasks.length > 20 && <p style={{ marginTop: '10px', color: '#666', fontSize: '0.9rem' }}>... e mais {completedTasks.length - 20} tarefas</p>}
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: '60px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#999', textAlign: 'center' }}>
        <p>Relatório confidencial | Beniteca © 2026</p>
      </div>
    </div>
  );
}
