import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function ProjectReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [obra, setObra] = useState(null);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      // Fetch main work
      const obraRes = await fetch(`/api/levels/${id}`);
      if (obraRes.ok) {
        const obraData = await obraRes.json();
        setObra(obraData);

        // Fetch all direct sublevels
        const levelsRes = await fetch(`/api/levels?parentId=${id}`);
        if (levelsRes.ok) {
          const levelsData = await levelsRes.json();
          setLevels(levelsData);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate weeks from start to end date
  const getWeekColumns = () => {
    if (!obra?.startDate || !obra?.endDate) return [];

    const start = new Date(obra.startDate);
    const end = new Date(obra.endDate);
    const weeks = [];

    let current = new Date(start);
    while (current <= end) {
      const weekStart = new Date(current);
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);

      weeks.push({
        start: weekStart,
        end: weekEnd,
        weekNum: weeks.length + 1
      });

      current.setDate(current.getDate() + 7);
    }

    return weeks;
  };

  // Calculate position and width for a level/sublevel in the gantt
  const calculateLevelPosition = (levelStart, levelEnd) => {
    if (!obra?.startDate) return { left: 0, width: 0 };

    const proStart = new Date(obra.startDate);
    const proEnd = new Date(obra.endDate);
    const totalDays = (proEnd - proStart) / (1000 * 60 * 60 * 24);

    const start = new Date(levelStart);
    const end = new Date(levelEnd);

    const daysFromStart = Math.max(0, (start - proStart) / (1000 * 60 * 60 * 24));
    const daysWidth = Math.max(1, (end - start) / (1000 * 60 * 60 * 24));

    const left = (daysFromStart / totalDays) * 100;
    const width = (daysWidth / totalDays) * 100;

    return { left, width };
  };

  // Calculate KPI for a level
  const calculateLevelKPI = (level) => {
    const today = new Date();
    const start = new Date(level.startDate || obra?.startDate);
    const end = new Date(level.endDate || obra?.endDate);

    const totalDays = Math.max(1, (end - start) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.max(0, Math.min(totalDays, (today - start) / (1000 * 60 * 60 * 24)));
    const timePercent = Math.round((elapsedDays / totalDays) * 100);

    const completionPercent = level.completedChildren && level.childrenCount 
      ? Math.round((level.completedChildren / level.childrenCount) * 100)
      : 0;

    return { timePercent, completionPercent };
  };

  if (loading) return <div style={{ padding: '32px' }}>A carregar relatório...</div>;
  if (!obra) return <div style={{ padding: '32px' }}>Obra não encontrada</div>;

  const weeks = getWeekColumns();

  return (
    <div className="report-bg">
      <div className="report-header">
        <button onClick={() => navigate("/dashboard")} className="report-back-btn">
          ← Voltar
        </button>
        <h1 className="report-title">📈 {obra.name}</h1>
        <p className="report-subtitle">Responsável: {obra.constructionManagerName || "Sem responsável"}</p>
      </div>

      <div className="report-container">
        <div className="report-gantt">
          {/* Header com as semanas */}
          <div className="gantt-header">
            <div className="gantt-row-label">Níveis do Projeto</div>
            <div className="gantt-timeline">
              {weeks.map((week) => (
                <div key={week.weekNum} className="gantt-week">
                  <div className="gantt-week-label">S{week.weekNum}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Obra principal */}
          <div className="gantt-row">
            <div className="gantt-row-label gantt-label-main">
              <span className="gantt-label-text">{obra.name}</span>
            </div>
            <div className="gantt-timeline">
              <div
                className="gantt-bar gantt-bar-main"
                style={{
                  left: '0%',
                  width: '100%'
                }}
                title={`${calculateLevelKPI(obra).timePercent}% tempo | ${calculateLevelKPI(obra).completionPercent}% conclusão`}
              >
                <div className="gantt-bar-content">
                  <span className="gantt-bar-time">{calculateLevelKPI(obra).timePercent}%</span>
                  <span className="gantt-bar-completion">{calculateLevelKPI(obra).completionPercent}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Subníveis */}
          {levels.map((level) => {
            const pos = calculateLevelPosition(
              level.startDate || obra.startDate,
              level.endDate || obra.endDate
            );
            const kpi = calculateLevelKPI(level);

            return (
              <div key={level.id} className="gantt-row">
                <div className="gantt-row-label">
                  <span className="gantt-label-text gantt-sublevel-indent">└─ {level.name}</span>
                </div>
                <div className="gantt-timeline">
                  <div
                    className="gantt-bar gantt-bar-level"
                    style={{
                      left: `${pos.left}%`,
                      width: `${Math.max(pos.width, 2)}%`
                    }}
                    title={`${kpi.timePercent}% tempo | ${kpi.completionPercent}% conclusão`}
                  >
                    <div className="gantt-bar-content">
                      <span className="gantt-bar-time">{kpi.timePercent}%</span>
                      <span className="gantt-bar-completion">{kpi.completionPercent}%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .report-bg {
          min-height: 100vh;
          background: #f8fafc;
          padding: 20px;
        }
        .report-header {
          background: #fff;
          padding: 24px 32px;
          border-radius: 12px;
          margin-bottom: 24px;
          box-shadow: 0 2px 16px #0001;
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .report-back-btn {
          padding: 10px 16px;
          background: #2563eb;
          color: #fff;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s;
        }
        .report-back-btn:hover {
          background: #1d4ed8;
        }
        .report-title {
          font-size: 1.8rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }
        .report-subtitle {
          color: #64748b;
          margin: 0;
          font-size: 0.95rem;
        }
        .report-container {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 16px #0001;
          overflow-x: auto;
          padding: 20px;
        }
        .report-gantt {
          min-width: 800px;
        }
        .gantt-header {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 0;
          margin-bottom: 12px;
          border-bottom: 2px solid #e2e8f0;
        }
        .gantt-row {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 0;
          margin-bottom: 2px;
          align-items: center;
          min-height: 60px;
        }
        .gantt-row-label {
          padding: 12px;
          background: #f8fafc;
          border-right: 1px solid #e2e8f0;
          font-weight: 500;
          color: #334155;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .gantt-label-main {
          background: #e0e7ff;
          color: #312e81;
          font-weight: 700;
        }
        .gantt-label-text {
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 0.95rem;
        }
        .gantt-sublevel-indent {
          padding-left: 12px;
          font-size: 0.9rem;
          color: #475569;
        }
        .gantt-timeline {
          position: relative;
          background: #fafbfc;
          display: flex;
          align-items: center;
          min-height: 60px;
        }
        .gantt-week {
          flex: 1;
          border-right: 1px solid #e2e8f0;
          padding: 8px;
          text-align: center;
          min-width: 60px;
        }
        .gantt-week-label {
          font-size: 0.8rem;
          color: #64748b;
          font-weight: 600;
        }
        .gantt-bar {
          position: absolute;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          cursor: pointer;
          transition: opacity 0.2s;
          margin: 0 2px;
          border: 1px solid rgba(0,0,0,0.1);
        }
        .gantt-bar:hover {
          opacity: 0.8;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .gantt-bar-main {
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          color: #fff;
        }
        .gantt-bar-level {
          background: linear-gradient(90deg, #06b6d4 0%, #0891b2 100%);
          color: #fff;
        }
        .gantt-bar-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          width: 100%;
          padding: 4px;
        }
        .gantt-bar-time {
          font-size: 0.75rem;
          font-weight: 700;
        }
        .gantt-bar-completion {
          font-size: 0.7rem;
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
}
