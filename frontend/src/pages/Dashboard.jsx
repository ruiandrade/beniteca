import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchObras();
  }, []);

  const fetchObras = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/levels?parentId=");
      if (res.ok) {
        const data = await res.json();
        // Filter to show only active works
        setObras(data.filter(obra => !obra.completed));
      }
    } catch (err) {
      console.error("Erro ao carregar obras:", err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate KPIs for a work
  const calculateKPIs = (obra) => {
    const today = new Date();
    const startDate = new Date(obra.startDate);
    const endDate = new Date(obra.endDate);

    // % of time elapsed
    const totalDays = Math.max(1, (endDate - startDate) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.max(0, (today - startDate) / (1000 * 60 * 60 * 24));
    const timeProgressPercent = Math.min(100, Math.round((elapsedDays / totalDays) * 100));

    // Count sublevels (leaf nodes only - without children)
    // This would need to be calculated from the children count
    const totalSublevels = obra.childrenCount || 0;
    const completedSublevels = obra.completedChildren || 0;
    const subLevelProgressPercent = totalSublevels > 0 ? Math.round((completedSublevels / totalSublevels) * 100) : 0;

    return {
      timeProgressPercent,
      totalSublevels,
      completedSublevels,
      subLevelProgressPercent,
      startDate,
      endDate
    };
  };

  const filteredObras = obras.filter(obra =>
    obra.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    obra.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="dashboard-bg">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">📊 Dashboard de Obras</h1>
        </div>

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
            <p>{searchTerm ? "Nenhuma obra encontrada com esse termo." : "Nenhuma obra encontrada."}</p>
          </div>
        ) : (
          <div className="dashboard-grid">
            {filteredObras.map((obra) => {
              const kpis = calculateKPIs(obra);
              return (
                <div
                  key={obra.id}
                  className="dashboard-card"
                  onClick={() => navigate(`/report/${obra.id}`)}
                >
                  <div className="dashboard-card-header">
                    <h2 className="dashboard-card-title">{obra.name}</h2>
                    <p className="dashboard-card-manager">{obra.constructionManagerName || "Sem responsável"}</p>
                  </div>

                  <div className="dashboard-card-content">
                    {/* Datas */}
                    <div className="dashboard-kpi-row">
                      <div className="dashboard-kpi-item">
                        <span className="dashboard-kpi-label">Início</span>
                        <span className="dashboard-kpi-value">
                          {kpis.startDate.toLocaleDateString("pt-PT")}
                        </span>
                      </div>
                      <div className="dashboard-kpi-item">
                        <span className="dashboard-kpi-label">Fim Previsto</span>
                        <span className="dashboard-kpi-value">
                          {kpis.endDate.toLocaleDateString("pt-PT")}
                        </span>
                      </div>
                    </div>

                    {/* Progresso Temporal */}
                    <div className="dashboard-progress-section">
                      <div className="dashboard-progress-label">
                        Tempo Decorrido
                        <span className="dashboard-progress-percent">{kpis.timeProgressPercent}%</span>
                      </div>
                      <div className="dashboard-progress-bar">
                        <div
                          className="dashboard-progress-fill"
                          style={{ width: `${kpis.timeProgressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Subníveis */}
                    <div className="dashboard-kpi-row">
                      <div className="dashboard-kpi-item">
                        <span className="dashboard-kpi-label">Subníveis</span>
                        <span className="dashboard-kpi-value">
                          {kpis.completedSublevels}/{kpis.totalSublevels}
                        </span>
                      </div>
                    </div>

                    {/* Progresso Subníveis */}
                    <div className="dashboard-progress-section">
                      <div className="dashboard-progress-label">
                        Conclusão
                        <span className="dashboard-progress-percent">{kpis.subLevelProgressPercent}%</span>
                      </div>
                      <div className="dashboard-progress-bar">
                        <div
                          className="dashboard-progress-fill"
                          style={{ width: `${kpis.subLevelProgressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-card-footer">
                    <button className="dashboard-btn-report">
                      Ver Relatório →
                    </button>
                  </div>
                </div>
              );
            })}
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
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding: 24px 32px;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 16px #0001;
        }
        .dashboard-title {
          font-size: 2rem;
          font-weight: 800;
          color: #1e293b;
          margin: 0;
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
          font-size: 1.1rem;
        }
        .dashboard-empty {
          text-align: center;
          color: #64748b;
          padding: 60px 20px;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 16px #0001;
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 24px;
        }
        .dashboard-card {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: transform 0.2s, box-shadow 0.2s, cursor 0.2s;
          border: 1px solid #e2e8f0;
          cursor: pointer;
        }
        .dashboard-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
        }
        .dashboard-card-header {
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
        }
        .dashboard-card-title {
          font-size: 1.4rem;
          font-weight: 700;
          margin: 0 0 6px 0;
          color: #fff;
        }
        .dashboard-card-manager {
          font-size: 0.95rem;
          margin: 0;
          opacity: 0.9;
        }
        .dashboard-card-content {
          padding: 20px;
          flex: 1;
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
          font-size: 0.85rem;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
        }
        .dashboard-kpi-value {
          font-size: 1.1rem;
          font-weight: 700;
          color: #1e293b;
        }
        .dashboard-progress-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .dashboard-progress-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.9rem;
          font-weight: 600;
          color: #475569;
        }
        .dashboard-progress-percent {
          font-size: 1.1rem;
          color: #2563eb;
          font-weight: 700;
        }
        .dashboard-progress-bar {
          height: 10px;
          background: #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }
        .dashboard-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          transition: width 0.3s ease;
        }
        .dashboard-card-footer {
          padding: 16px 20px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          gap: 8px;
        }
        .dashboard-btn-report {
          flex: 1;
          padding: 10px 16px;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .dashboard-btn-report:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
}
