import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WorkerSchedule from './WorkerSchedule';

export default function Home() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('list');
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadLevels();
  }, []);

  const loadLevels = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/levels?parentId=');
      if (!res.ok) throw new Error('Erro ao carregar obras');
      const data = await res.json();
      setLevels(data.filter(l => !l.completed));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (id) => {
    if (!confirm('Tem certeza que deseja arquivar esta obra?')) return;
    try {
      const res = await fetch(`/api/levels/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      });
      if (!res.ok) throw new Error('Erro ao arquivar');
      loadLevels();
    } catch (err) {
      alert('Erro ao arquivar obra');
      console.error(err);
    }
  };

  const filteredLevels = levels.filter(level =>
    level.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    level.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="home-page">
      <div className="home-header">
        <div>
          <h1 className="home-title">🏗️ As Minhas Obras</h1>
          <p className="home-subtitle">Gerir obras ativas</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/create')}>
          ➕ Nova Obra
        </button>
      </div>

      <div className="home-tabs">
        <button
          className={`tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          📋 Lista de Obras
        </button>
        <button
          className={`tab ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          📅 Calendário
        </button>
      </div>

      <div className="home-content">
        {activeTab === 'list' ? (
          <>
            <div className="home-search">
              <input
                type="text"
                placeholder="🔍 Pesquisar obras..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="home-search-input"
              />
            </div>

            <div className="works-list">
              {loading ? (
                <p className="loading-text">A carregar...</p>
              ) : filteredLevels.length === 0 ? (
                <p className="empty-text">
                  {searchTerm ? 'Nenhuma obra encontrada com esse termo.' : 'Sem obras ativas. Clique em "Nova Obra" para começar.'}
                </p>
              ) : (
                <div className="cards-grid">
                  {filteredLevels.map((level) => (
                    <div 
                      key={level.id} 
                      className="work-card"
                      onClick={() => navigate(`/works/${level.id}/levels`)}
                    >
                      {level.coverImage && (
                        <img src={level.coverImage} alt={level.name} className="work-card-img" />
                      )}
                      <div className="card-content">
                        <div className="card-header">
                          <h3 className="card-title">{level.name}</h3>
                          {level.childrenCount > 0 && (
                            <span className="badge info">
                              {level.childrenCount} {level.childrenCount === 1 ? 'nível' : 'níveis'}
                            </span>
                          )}
                        </div>
                        {level.description && (
                          <p className="card-description">{level.description}</p>
                        )}
                        {level.startDate && (
                          <p className="card-date">
                            📅 {new Date(level.startDate).toLocaleDateString('pt-PT')} - {new Date(level.endDate).toLocaleDateString('pt-PT')}
                          </p>
                        )}
                        {level.constructionManagerName && (
                          <p className="card-manager">
                            👷 {level.constructionManagerName}
                          </p>
                        )}
                      </div>
                      <div className="card-actions">
                        <button
                          className="btn-secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/works/${level.id}/equipa`);
                          }}
                        >
                          👥 Equipa
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/works/${level.id}/planeamento`);
                          }}
                        >
                          📆 Planeamento
                        </button>
                        <button
                          className="btn-danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchive(level.id);
                          }}
                        >
                          📦 Arquivar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <WorkerSchedule />
        )}
      </div>

      <style>{`
        .home-page {
          padding: 20px;
          background: #f8fafc;
          min-height: 100vh;
        }
        .home-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding: 24px 32px;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 16px #0001;
        }
        .home-title {
          margin: 0;
          font-size: 2rem;
          color: #1e293b;
          font-weight: 800;
        }
        .home-subtitle {
          margin: 4px 0 0 0;
          color: #64748b;
          font-size: 1rem;
        }
        .home-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 0;
        }
        .tab {
          background: transparent;
          border: none;
          padding: 12px 20px;
          font-size: 1rem;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          transition: all 0.2s;
          margin-bottom: -2px;
        }
        .tab:hover {
          color: #1e293b;
          background: #f1f5f9;
        }
        .tab.active {
          color: #2563eb;
          border-bottom-color: #2563eb;
        }
        .home-content {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 16px #0001;
          padding: 20px;
        }
        .home-search {
          margin-bottom: 24px;
        }
        .home-search-input {
          width: 100%;
          padding: 14px 20px;
          font-size: 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          background: #fff;
          transition: border-color 0.2s;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .home-search-input:focus {
          outline: none;
          border-color: #2563eb;
        }
        .works-list {
          min-height: 400px;
        }
        .loading-text, .empty-text {
          text-align: center;
          color: #64748b;
          padding: 40px 20px;
          font-size: 1rem;
        }
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
        }
        .work-card {
          background: #fff;
          border-radius: 10px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: transform 0.2s, box-shadow 0.2s;
          border: 1px solid #e2e8f0;
          cursor: pointer;
        }
        .work-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .work-card-img {
          width: 100%;
          aspect-ratio: 1 / 1;
          height: auto;
          object-fit: cover;
          background: #f1f5f9;
        }
        .card-content {
          padding: 12px;
          flex: 1;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 8px;
          gap: 8px;
        }
        .card-title {
          margin: 0;
          font-size: 1rem;
          color: #1e293b;
          font-weight: 700;
          flex: 1;
          line-height: 1.3;
        }
        .badge {
          padding: 3px 8px;
          border-radius: 8px;
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .badge.info {
          background: #dbeafe;
          color: #1e40af;
        }
        .card-description {
          color: #64748b;
          font-size: 0.8rem;
          margin: 0 0 8px 0;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .card-date, .card-manager {
          color: #64748b;
          font-size: 0.75rem;
          margin: 3px 0;
        }
        .card-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 10px 12px;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
        }
        .btn-primary {
          background: #2563eb;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }
        .btn-secondary {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 6px 10px;
          font-weight: 600;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-secondary:hover {
          background: #e2e8f0;
          border-color: #cbd5e1;
        }
        .btn-danger {
          background: #fee2e2;
          color: #b91c1c;
          border: 1px solid #fecaca;
          border-radius: 6px;
          padding: 6px 10px;
          font-weight: 600;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-danger:hover {
          background: #fecaca;
          border-color: #fca5a5;
        }
        @media (max-width: 768px) {
          .home-page {
            padding: 16px;
          }
          .home-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .cards-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
