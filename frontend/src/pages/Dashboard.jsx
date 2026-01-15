import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from '../context/AuthContext';
import { getMyWorks } from '../services/permissionService';
import Reports from './Reports';

// Sub-component to load and display obra card with ratio
function ObraCard({ obra, onSelect, getBarColor, getBarBgColor, getNameColor, ratioCache, onRatioLoaded }) {
  const [ratio, setRatio] = useState(ratioCache[obra.id] || '—');
  const [loadingRatio, setLoadingRatio] = useState(!ratioCache[obra.id]);

  useEffect(() => {
    if (!ratioCache[obra.id]) {
      fetchRatio();
    }
  }, [obra.id]);

  const fetchRatio = async () => {
    try {
      const res = await fetch(`/api/levels/${obra.id}/ratio`);
      if (res.ok) {
        const data = await res.json();
        const r = data.ratio || '—';
        setRatio(r);
        onRatioLoaded(obra.id, r);
      }
    } catch (err) {
      console.error("Erro ao carregar ratio:", err);
      setRatio('—');
    } finally {
      setLoadingRatio(false);
    }
  };

  return (
    <div
      className="dashboard-card"
      onClick={() => onSelect(obra)}
      style={{ borderLeft: `4px solid ${getBarColor(obra)}` }}
    >
      <div className="dashboard-card-header" style={{
        background: getBarBgColor(obra)
      }}>
        <h2 className="dashboard-card-title" style={{ color: getNameColor(0) }}>{obra.name}</h2>
        <p className="dashboard-card-manager">{obra.constructionManagerName || "Sem responsável"}</p>
      </div>

      <div className="dashboard-card-content">
        <div className="dashboard-kpi-row">
          <div className="dashboard-kpi-item">
            <span className="dashboard-kpi-label">Início</span>
            <span className="dashboard-kpi-value">
              {new Date(obra.startDate).toLocaleDateString("pt-PT")}
            </span>
          </div>
          <div className="dashboard-kpi-item">
            <span className="dashboard-kpi-label">Fim</span>
            <span className="dashboard-kpi-value">
              {new Date(obra.endDate).toLocaleDateString("pt-PT")}
            </span>
          </div>
        </div>

        <div className="dashboard-kpi-row">
          <div className="dashboard-kpi-item">
            <span className="dashboard-kpi-label">Rácio</span>
            <span className="dashboard-kpi-value">{loadingRatio ? '...' : ratio}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedObra, setSelectedObra] = useState(null);
  const [obraChildren, setObraChildren] = useState([]);
  const [activeTab, setActiveTab] = useState("gantt");
  const [hierarchyTree, setHierarchyTree] = useState(null);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [navigationStack, setNavigationStack] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [fromWeek, setFromWeek] = useState(1);
  const [toWeek, setToWeek] = useState(16);
  const [ratioCache, setRatioCache] = useState({});
  const [dashboardView, setDashboardView] = useState("cards"); // "cards" ou "reports"

  const handleRatioLoaded = (obraId, ratio) => {
    setRatioCache(prev => ({ ...prev, [obraId]: ratio }));
  };

  useEffect(() => {
    fetchObras();
  }, [token]);

  useEffect(() => {
    if (selectedObra) {
      // Clear previous data to avoid showing stale data
      setHierarchyTree(null);
      setHierarchyLoading(true);
      
      fetchObraChildren(selectedObra.id);
      buildHierarchy(selectedObra.id);
      // Expandir automaticamente a raiz
      setExpandedNodes(new Set([selectedObra.id]));
      
      // Reset week filters
      setFromWeek(1);
      setToWeek(16);
    }
  }, [selectedObra]);

  const handleObraClick = (obra) => {
    setNavigationStack([...navigationStack, selectedObra].filter(Boolean));
    setSelectedObra(obra);
    setActiveTab("gantt");
  };

  const handleGoBack = () => {
    if (navigationStack.length > 0) {
      const newStack = [...navigationStack];
      const previousObra = newStack.pop();
      setNavigationStack(newStack);
      setSelectedObra(previousObra);
      setActiveTab("gantt");
    } else {
      setSelectedObra(null);
      setActiveTab("gantt");
    }
  };

  const handleGoBackInGantt = async () => {
    if (!selectedObra || !selectedObra.parentId) return;
    
    try {
      // Carregar o nível pai
      const res = await fetch(`/api/levels/${selectedObra.parentId}`);
      if (res.ok) {
        const parentLevel = await res.json();
        setSelectedObra(parentLevel);
        setHierarchyTree(null);
        setHierarchyLoading(true);
        fetchObraChildren(parentLevel.id);
        buildHierarchy(parentLevel.id);
        setExpandedNodes(new Set([parentLevel.id]));
        setFromWeek(1);
        setToWeek(16);
      }
    } catch (err) {
      console.error("Erro ao voltar para o nível anterior:", err);
    }
  };

  const fetchObras = async () => {
    if (!token) {
      setObras([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getMyWorks(token);
      setObras(data.filter(obra => obra.status === 'active' && !obra.hidden));
    } catch (err) {
      console.error("Erro ao carregar obras:", err);
      alert(`Erro ao carregar obras: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchObraChildren = async (parentId) => {
    try {
      const res = await fetch(`/api/levels?parentId=${parentId}`);
      if (res.ok) {
        const data = await res.json();
        setObraChildren(data.filter(child => !child.hidden));
      }
    } catch (err) {
      console.error("Erro ao carregar filhos:", err);
      setObraChildren([]);
    }
  };

  const sanitizeHierarchy = (node, depth = 0) => {
    if (!node || !node.level || node.level.hidden) return null;
    const children = Array.isArray(node.children)
      ? node.children.map((child) => sanitizeHierarchy(child, depth + 1)).filter(Boolean)
      : [];
    const hasChildren = children.length > 0;

    return {
      ...node,
      depth,
      children,
      hasChildren,
      isLeaf: !hasChildren
    };
  };

  const buildHierarchy = async (levelId) => {
    setHierarchyLoading(true);
    try {
      const res = await fetch(`/api/levels/${levelId}/hierarchy`);
      if (!res.ok) throw new Error('Falha ao carregar hierarquia');
      const rawTree = await res.json();
      const cleanTree = sanitizeHierarchy(rawTree, 0);
      setHierarchyTree(cleanTree);
    } catch (err) {
      console.error("Erro ao construir hierarquia:", err);
      setHierarchyTree(null);
    } finally {
      setHierarchyLoading(false);
    }
  };

  const getBarColor = (level) => {
    if (level.status === 'completed') return "#16a34a"; // finished
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = level.startDate ? new Date(level.startDate) : null;
    if (startDate && startDate > today) return "#9ca3af"; // not started yet (grey)
    if (level.startDate) return "#f59e0b"; // on going (orange)
    return "#9ca3af"; // not started
  };

  const getBarBgColor = (level) => {
    if (level.status === 'completed') return "#dcfce7";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = level.startDate ? new Date(level.startDate) : null;
    if (startDate && startDate > today) return "#e5e7eb"; // not started yet (grey)
    if (level.startDate) return "#fef3c7";
    return "#e5e7eb";
  };

  // Cores para os nomes baseadas no nível de profundidade
  const getNameColor = (depth) => {
    const depthColors = [
      '#01a383',  // depth 0 - verde empresa
      '#0ea5e9',  // depth 1 - azul céu
      '#8b5cf6',  // depth 2 - roxo
      '#f59e0b',  // depth 3 - laranja
      '#ec4899',  // depth 4 - rosa
      '#14b8a6',  // depth 5 - teal
      '#6366f1',  // depth 6+ - indigo
    ];
    return depthColors[Math.min(depth, depthColors.length - 1)];
  };

  const getChildRatio = (level) => {
    if (!level.childrenCount) return "—";
    const totalChildren = level.childrenCount || 0;
    const completed = level.completedChildren || 0;
    return totalChildren > 0 ? `${completed}/${totalChildren}` : "—";
  };

  // Calcular rácio baseado em toda a descendência folha (níveis sem filhos)
  const getLeafNodeRatio = (levelId) => {
    const countLeafNodes = (node) => {
      if (!node) return { total: 0, completed: 0 };
      const isLeafNode = node.isLeaf || !node.children || node.children.length === 0;
      if (isLeafNode) {
        return {
          total: 1,
          completed: node.level.status === 'completed' ? 1 : 0
        };
      }

      return node.children.reduce((acc, child) => {
        const result = countLeafNodes(child);
        return {
          total: acc.total + result.total,
          completed: acc.completed + result.completed
        };
      }, { total: 0, completed: 0 });
    };

    // Encontrar o nó da árvore que corresponde ao levelId
    const findNode = (node, id) => {
      if (!node) return null;
      if (`${node.level.id}` === `${id}`) return node;
      
      if (node.children) {
        for (let child of node.children) {
          const found = findNode(child, id);
          if (found) return found;
        }
      }
      
      return null;
    };

    if (!hierarchyTree) return "—";
    
    const node = findNode(hierarchyTree, levelId);
    if (!node) return "—";
    
    const result = countLeafNodes(node);
    return result.total > 0 ? `${result.completed}/${result.total}` : "—";
  };

  // Calcular percentagem de conclusão para a barra visual
  const getCompletionPercentage = (levelId) => {
    const countLeafNodes = (node) => {
      if (!node) return { total: 0, completed: 0 };
      const isLeafNode = node.isLeaf || !node.children || node.children.length === 0;
      if (isLeafNode) {
        return {
          total: 1,
          completed: node.level.status === 'completed' ? 1 : 0
        };
      }

      return node.children.reduce((acc, child) => {
        const result = countLeafNodes(child);
        return {
          total: acc.total + result.total,
          completed: acc.completed + result.completed
        };
      }, { total: 0, completed: 0 });
    };

    const findNode = (node, id) => {
      if (!node) return null;
      if (`${node.level.id}` === `${id}`) return node;
      
      if (node.children) {
        for (let child of node.children) {
          const found = findNode(child, id);
          if (found) return found;
        }
      }
      
      return null;
    };

    if (!hierarchyTree) return 0;
    
    const node = findNode(hierarchyTree, levelId);
    if (!node) return 0;
    
    const result = countLeafNodes(node);
    return result.total > 0 ? Math.round((result.completed / result.total) * 100) : 0;
  };

  const calculateWeeks = (startDate, endDate) => {
    if (!startDate || !endDate) return [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const weeks = [];
    let current = new Date(start);
    
    const dayOfWeek = current.getDay();
    const daysToMonday = dayOfWeek === 0 ? 1 : (1 - dayOfWeek + 7) % 7 || 7;
    current.setDate(current.getDate() + daysToMonday);
    
    let weekNum = 1;
    while (current <= end && weekNum <= 16) {
      const dateStr = current.toLocaleDateString("pt-PT", { 
        day: "2-digit", 
        month: "2-digit", 
        year: "numeric" 
      });
      weeks.push({ number: weekNum, label: `S${weekNum}: ${dateStr}`, date: new Date(current) });
      current.setDate(current.getDate() + 7);
      weekNum++;
    }
    return weeks;
  };

  const getBarStyle = (level, weeks, fallback) => {
    if (!weeks.length) return { width: "0%" };

    const firstWeekStart = new Date(weeks[0].date);
    const lastWeekEnd = new Date(weeks[weeks.length - 1].date);
    lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);

    const levelStart = level.startDate ? new Date(level.startDate) : new Date(fallback.startDate);
    const levelEnd = level.endDate ? new Date(level.endDate) : new Date(fallback.endDate);

    const clampedStart = levelStart < firstWeekStart ? firstWeekStart : levelStart;
    const clampedEnd = levelEnd > lastWeekEnd ? lastWeekEnd : levelEnd;

    const total = Math.max(1, lastWeekEnd.getTime() - firstWeekStart.getTime());
    const left = Math.max(0, ((clampedStart.getTime() - firstWeekStart.getTime()) / total) * 100);
    const width = Math.max(4, ((clampedEnd.getTime() - clampedStart.getTime()) / total) * 100);

    return {
      left: `${left}%`,
      width: `${width}%`,
      backgroundColor: getBarColor(level),
    };
  };

  const flattenTree = (node, depth = 0) => {
    if (!node) return [];
    const rows = [{
      ...node.level,
      depth,
      hasChildren: node.hasChildren,
      isLeaf: node.isLeaf
    }];

    // Só incluir filhos se o nó estiver expandido
    if (node.hasChildren && expandedNodes.has(node.level.id)) {
      node.children.forEach((child) => {
        rows.push(...flattenTree(child, depth + 1));
      });
    }

    return rows;
  };

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const ganttRows = hierarchyTree ? flattenTree(hierarchyTree) : [
    ...(selectedObra ? [{ ...selectedObra, depth: 0 }] : []),
    ...obraChildren.map((child) => ({ ...child, depth: 1 }))
  ];

  const filteredObras = obras.filter(obra =>
    obra.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    obra.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Main cards view
  if (!selectedObra) {
    return (
      <div className="dashboard-bg">
        <div className="dashboard-container">
          <div className="dashboard-header">
            <h1 className="dashboard-title">📊 Dashboard de Obras</h1>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button 
                className={`view-toggle-btn ${dashboardView === 'cards' ? 'active' : ''}`}
                onClick={() => setDashboardView('cards')}
                title="Ver progresso das obras"
              >
                📊 Progresso
              </button>
              <button 
                className={`view-toggle-btn ${dashboardView === 'reports' ? 'active' : ''}`}
                onClick={() => setDashboardView('reports')}
                title="Ver relatórios"
              >
                📈 Relatórios
              </button>
            </div>
          </div>

          {dashboardView === 'cards' ? (
            <>
              <div className="dashboard-search">
                <input
                  type="text"
                  placeholder="🔍 Pesquisar obras..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="dashboard-search-input"
                />
              </div>

              {loading ? (
                <p className="dashboard-loading">A carregar obras...</p>
              ) : filteredObras.length === 0 ? (
                <div className="dashboard-empty">
                  <p>Nenhuma obra encontrada.</p>
                </div>
              ) : (
                <div className="dashboard-grid">
                  {filteredObras.map((obra) => (
                    <ObraCard
                      key={obra.id}
                      obra={obra}
                      onSelect={setSelectedObra}
                      getBarColor={getBarColor}
                      getBarBgColor={getBarBgColor}
                      getNameColor={getNameColor}
                      ratioCache={ratioCache}
                      onRatioLoaded={handleRatioLoaded}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <Reports />
            </div>
          )}
        </div>

        <style>{`
          .dashboard-bg {
            min-height: 100vh;
            background: #f8fafc;
            padding: 20px;
          }
          .dashboard-container {
            width: 100%;
            max-width: 100%;
          }
          .dashboard-header {
            margin-bottom: 24px;
            padding: 24px 32px;
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 2px 16px #0001;
            display: flex;
            align-items: center;
            gap: 24px;
          }
          .dashboard-title {
            font-size: 2rem;
            font-weight: 800;
            color: #1e293b;
            margin: 0;
          }
          .view-toggle-btn {
            padding: 8px 16px;
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 0.9rem;
            font-weight: 500;
            color: #475569;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
          }
          .view-toggle-btn:hover {
            background: #e2e8f0;
            border-color: #cbd5e1;
          }
          .view-toggle-btn.active {
            background: #2563eb;
            border-color: #2563eb;
            color: #fff;
          }
          .dashboard-search {
            margin-bottom: 24px;
          }
          .dashboard-search-input {
            width: 100%;
            padding: 14px 20px;
            font-size: 1rem;
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            background: #fff;
            transition: border-color 0.2s;
            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          }
          .dashboard-search-input:focus {
            outline: none;
            border-color: #2563eb;
          }
          .dashboard-loading {
            text-align: center;
            color: #64748b;
            padding: 40px;
          }
          .dashboard-empty {
            text-align: center;
            color: #64748b;
            padding: 60px 20px;
            background: #fff;
            border-radius: 12px;
          }
          .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 24px;
          }
          .dashboard-card {
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            overflow: hidden;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .dashboard-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          }
          .dashboard-card-header {
            padding: 20px;
          }
          .dashboard-card-title {
            font-size: 1.3rem;
            font-weight: 700;
            margin: 0 0 8px 0;
            color: #1e293b;
          }
          .dashboard-card-manager {
            font-size: 0.9rem;
            margin: 0;
            color: #64748b;
          }
          .dashboard-card-content {
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .dashboard-kpi-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .dashboard-kpi-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .dashboard-kpi-label {
            font-size: 0.8rem;
            color: #64748b;
            font-weight: 600;
            text-transform: uppercase;
          }
          .dashboard-kpi-value {
            font-size: 1rem;
            font-weight: 600;
            color: #1e293b;
          }
        `}</style>
      </div>
    );
  }

  // Detail view with tabs
  const weeks = calculateWeeks(selectedObra.startDate, selectedObra.endDate);

  return (
    <div className="dashboard-bg">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <button className="back-btn" onClick={handleGoBack}>
            ← Voltar
          </button>
          <h1 className="dashboard-title">{selectedObra.name}</h1>
        </div>

        <div className="dashboard-tabs">
          <button 
            className={`tab-btn ${activeTab === "gantt" ? "active" : ""}`}
            onClick={() => setActiveTab("gantt")}
          >
            📊 Gantt (Filhos Diretos)
          </button>
          <button 
            className={`tab-btn ${activeTab === "hierarchy" ? "active" : ""}`}
            onClick={() => setActiveTab("hierarchy")}
          >
            🌳 Hierarquia Completa
          </button>
        </div>

        {activeTab === "gantt" ? (
          <div className="gantt-container">
            {hierarchyLoading ? (
              <div className="loading-overlay">
                <div className="loading-spinner"></div>
                <p>A carregar hierarquia...</p>
              </div>
            ) : ganttRows.length === 0 ? (
              <div className="empty-state">
                <p>Não há dados de planeamento para esta obra.</p>
              </div>
            ) : (
              <>
                <div className="gantt-filters">
                  <div className="gantt-filter-group">
                    <label>Semana De:</label>
                    <select value={fromWeek} onChange={(e) => setFromWeek(Math.max(1, parseInt(e.target.value)))}>
                      {weeks.map((w) => (
                        <option key={w.number} value={w.number}>{w.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="gantt-filter-group">
                    <label>Semana Até:</label>
                    <select value={toWeek} onChange={(e) => setToWeek(Math.min(weeks.length, parseInt(e.target.value)))}>
                      {weeks.map((w) => (
                        <option key={w.number} value={w.number}>{w.label}</option>
                      ))}
                    </select>
                  </div>
                  {selectedObra?.parentId && (
                    <button 
                      className="gantt-nav-btn"
                      onClick={handleGoBackInGantt}
                      title="Voltar para o nível anterior"
                    >
                      ← Nível Anterior
                    </button>
                  )}
                </div>
                <div className="gantt-scroll">
                  <table className="gantt-table">
                    <thead>
                      <tr>
                        <th className="gantt-name-header">Nível</th>
                        {weeks.filter(w => w.number >= fromWeek && w.number <= toWeek).map((w) => (
                          <th key={w.number} className="gantt-week-header">{w.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ganttRows.map((row) => (
                        <tr key={row.id} className={`gantt-row depth-${row.depth}`}>
                          <td className="gantt-name-cell">
                            <div
                              className="level-info"
                              style={{
                                backgroundColor: getBarBgColor(row),
                                borderLeft: `4px solid ${getBarColor(row)}`,
                                marginLeft: `${row.depth * 16}px`,
                                width: `calc(100% - ${row.depth * 16}px)`,
                              }}
                            >
                              <div className="level-name">
                                <button
                                  className="link-btn"
                                  onClick={() => navigate(`/works/${row.id}/levels`)}
                                  style={{ color: getNameColor(row.depth || 0) }}
                                >
                                  {row.name}
                                </button>
                                {row.hasChildren && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleNode(row.id);
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      fontWeight: 'bold',
                                      marginLeft: '6px',
                                      fontSize: '14px',
                                      padding: '0 4px'
                                    }}
                                  >
                                    {expandedNodes.has(row.id) ? '−' : '+'}
                                  </button>
                                )}
                              </div>
                              <div className="level-ratio">{getLeafNodeRatio(row.id)}</div>
                            </div>
                          </td>
                          <td
                            className="gantt-bar-cell"
                            colSpan={Math.max(1, weeks.filter(w => w.number >= fromWeek && w.number <= toWeek).length)}
                          >
                            <div className="gantt-bar-track">
                              <div
                                className="gantt-bar"
                                style={getBarStyle(row, weeks.filter(w => w.number >= fromWeek && w.number <= toWeek), selectedObra)}
                                onClick={() => {
                                  if (row.depth > 0) {
                                    handleObraClick(row);
                                  }
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="hierarchy-container">
            {hierarchyLoading ? (
              <div className="loading-overlay">
                <div className="loading-spinner"></div>
                <p>A carregar hierarquia...</p>
              </div>
            ) : (
            <div className="hierarchy-table">
              <div className="hierarchy-header">
                <span>Nível</span>
                <span>Progresso</span>
                <span>Filhos</span>
                <span>Datas</span>
              </div>
              <div className="hierarchy-body">
                {ganttRows.map((row) => (
                  <div
                    key={row.id}
                    className="hierarchy-item"
                    style={{
                      backgroundColor: getBarBgColor(row),
                      borderLeft: `4px solid ${getBarColor(row)}`,
                      marginLeft: `${row.depth * 16}px`,
                      width: `calc(100% - ${row.depth * 16}px)`,
                    }}
                  >
                    <div
                      className="hierarchy-name"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <button
                        className="link-btn"
                        onClick={() => navigate(`/works/${row.id}/levels`)}
                        style={{ color: getNameColor(row.depth || 0) }}
                      >
                        {row.name}
                      </button>
                      {row.hasChildren && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleNode(row.id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            padding: '0 4px',
                            minWidth: '20px'
                          }}
                        >
                          {expandedNodes.has(row.id) ? '−' : '+'}
                        </button>
                      )}
                    </div>
                    <div className="hierarchy-progress">
                      <div style={{
                        width: '100px',
                        height: '20px',
                        background: '#e5e7eb',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${getCompletionPercentage(row.id)}%`,
                          background: getBarColor(row),
                          transition: 'width 0.3s'
                        }} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '600', minWidth: '30px' }}>
                        {getCompletionPercentage(row.id)}%
                      </span>
                    </div>
                    <div className="hierarchy-ratio">{getLeafNodeRatio(row.id)}</div>
                    <div className="hierarchy-dates">
                      <span>{row.startDate ? new Date(row.startDate).toLocaleDateString("pt-PT") : "—"}</span>
                      <span>→</span>
                      <span>{row.endDate ? new Date(row.endDate).toLocaleDateString("pt-PT") : "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .dashboard-bg {
          min-height: 100vh;
          background: #f8fafc;
          padding: 20px;
        }
        .dashboard-container {
          width: 100%;
          max-width: 100%;
        }
        .dashboard-header {
          margin-bottom: 24px;
          padding: 24px 32px;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 16px #0001;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .back-btn {
          padding: 8px 16px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .back-btn:hover {
          background: #e2e8f0;
        }
        .dashboard-title {
          font-size: 2rem;
          font-weight: 800;
          color: #1e293b;
          margin: 0;
        }
        .dashboard-tabs {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          background: #fff;
          padding: 12px;
          border-radius: 12px;
        }
        .tab-btn {
          padding: 10px 20px;
          border: 2px solid #e2e8f0;
          background: #fff;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tab-btn:hover {
          border-color: #cbd5e1;
        }
        .tab-btn.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          border-color: #667eea;
        }
        .gantt-container {
          background: #fff;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .gantt-filters {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
          padding: 12px;
          background: #f8fafc;
          border-radius: 8px;
          align-items: flex-end;
        }
        .gantt-filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .gantt-filter-group label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #475569;
        }
        .gantt-filter-group select {
          padding: 8px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background: #fff;
          font-size: 0.9rem;
          cursor: pointer;
          min-width: 120px;
        }
        .gantt-filter-group select:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        .gantt-nav-btn {
          padding: 8px 16px;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          margin-left: auto;
        }
        .gantt-nav-btn:hover {
          background: #e5e7eb;
          border-color: #9ca3af;
          transform: translateX(-2px);
        }
        .gantt-nav-btn:active {
          transform: translateX(-1px);
        }
        .empty-state {
          text-align: center;
          color: #64748b;
          padding: 40px;
        }
        .gantt-scroll {
          overflow-x: auto;
        }
        .gantt-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 800px;
        }
        .gantt-row td {
          border-bottom: 1px solid #e2e8f0;
          height: 44px;
        }
        .gantt-row.depth-0 {
          border-top: 2px solid #cbd5e1;
          background: #fafbfc;
        }
        .gantt-row.depth-1 {
          border-left: 4px solid #dbeafe;
          background: #f8fafc;
        }
        .gantt-row.depth-2 {
          border-left: 8px solid #fed7aa;
          background: #fefbf4;
        }
        .gantt-row.depth-3 {
          border-left: 12px solid #fecaca;
          background: #fffbfa;
        }
        .gantt-name-header {
          position: sticky;
          left: 0;
          background: #f8fafc;
          padding: 12px;
          text-align: left;
          font-weight: 700;
          border-bottom: 2px solid #e2e8f0;
          min-width: 200px;
          z-index: 10;
        }
        .gantt-week-header {
          padding: 12px;
          text-align: center;
          font-weight: 600;
          font-size: 0.85rem;
          color: #64748b;
          border-bottom: 2px solid #e2e8f0;
          border-left: 1px solid #e2e8f0;
          min-width: 120px;
        }
        .gantt-name-cell {
          position: sticky;
          left: 0;
          background: #fff;
          padding: 4px;
          min-width: 250px;
          max-width: 250px;
          width: 250px;
          z-index: 5;
          overflow: hidden;
        }
        .level-info {
          padding: 6px 10px;
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow: hidden;
        }
        .level-name {
          font-weight: 600;
          color: #1e293b;
          font-size: 0.9rem;
        }
        .level-ratio {
          font-size: 0.75rem;
          color: #64748b;
        }
        .gantt-bar-cell {
          padding: 12px 16px;
          border-left: 1px solid #e2e8f0;
        }
        .gantt-bar-track {
          position: relative;
          width: 100%;
          height: 28px;
          background: linear-gradient(90deg, #f8fafc 0%, #f8fafc 50%, #f8fafc 100%);
          border: 1px dashed #e2e8f0;
          border-radius: 6px;
          overflow: hidden;
        }
        .gantt-bar {
          position: absolute;
          top: 3px;
          height: 22px;
          border-radius: 6px;
          opacity: 0.9;
          cursor: pointer;
          transition: transform 0.15s;
        }
        .gantt-bar:hover {
          transform: translateY(-2px);
        }
        .hierarchy-container {
          background: #fff;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .hierarchy-table {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .hierarchy-header {
          display: grid;
          grid-template-columns: 1.5fr 0.6fr 1fr;
          color: #475569;
          font-weight: 700;
          padding: 8px 12px;
        }
        .hierarchy-body {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .hierarchy-item {
          display: grid;
          grid-template-columns: 1.5fr 0.6fr 1fr;
          padding: 12px;
          border-radius: 10px;
          gap: 12px;
          align-items: center;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .hierarchy-name {
          font-weight: 700;
          color: #1f2937;
        }
        .hierarchy-ratio {
          font-weight: 600;
          color: #475569;
          min-width: 70px;
          text-align: left;
        }
        .hierarchy-dates {
          display: flex;
          gap: 6px;
          color: #475569;
          font-weight: 600;
          align-items: center;
          justify-content: flex-start;
        }
        .link-btn {
          background: none;
          border: none;
          color: #1d4ed8;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
          text-align: left;
        }
        .link-btn:hover {
          text-decoration: underline;
        }
        
        /* Loading overlay */
        .loading-overlay {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          gap: 16px;
        }
        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 5px solid #e5e7eb;
          border-top-color: #01a383;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .loading-overlay p {
          color: #64748b;
          font-size: 1rem;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
