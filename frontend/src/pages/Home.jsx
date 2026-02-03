import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyWorks } from '../services/permissionService';
import WorkerSchedule from './WorkerSchedule';

export default function Home() {
  const navigate = useNavigate();
  const { token, user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('list');
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadLevels();
  }, [token]);

  const loadLevels = async () => {
    if (!token) {
      setLevels([]);
      return;
    }
    
    setLoading(true);
    try {
      const data = await getMyWorks(token);
      // Filter out completed works, show active and paused
      setLevels(data.filter(l => l.status !== 'completed'));
    } catch (err) {
      console.error('Erro ao carregar obras:', err);
      if (err.status === 401) {
        // Não mostrar alert aqui - o AuthContext já mostra ao fazer logout
        logout('expired');
        return;
      }
      alert(`Erro ao carregar obras: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (id) => {
    if (!confirm('Tem certeza que deseja arquivar esta obra?')) return;
    try {
      const res = await fetch(`/api/levels/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'completed', closedBy: user?.id }),
      });
      if (!res.ok) throw new Error('Erro ao arquivar');
      loadLevels();
    } catch (err) {
      alert('Erro ao arquivar obra');
      console.error(err);
    }
  };

  const handlePause = async (id) => {
    if (!confirm('Deseja pausar esta obra? Ela não aparecerá nas listagens mas pode ser retomada a qualquer momento.')) return;
    try {
      const res = await fetch(`/api/levels/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paused' }),
      });
      if (!res.ok) throw new Error('Erro ao pausar');
      loadLevels();
    } catch (err) {
      alert('Erro ao pausar obra');
      console.error(err);
    }
  };

  const handleResume = async (id) => {
    try {
      const res = await fetch(`/api/levels/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      if (!res.ok) throw new Error('Erro ao retomar');
      loadLevels();
    } catch (err) {
      alert('Erro ao retomar obra');
      console.error(err);
    }
  };

  const filteredLevels = levels.filter(level =>
    level.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    level.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separate active and paused works
  const activeWorks = filteredLevels.filter(l => l.status === 'active');
  const pausedWorks = filteredLevels.filter(l => l.status === 'paused');

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
                <>
                  {/* Active Works Section */}
                  {activeWorks.length > 0 && (
                    <div className="works-section">
                      <h2 className="section-title">✅ Obras Ativas</h2>
                      <div className="cards-grid">
                        {activeWorks.map((level) => (
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
                                className="btn-warning"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePause(level.id);
                                }}
                              >
                                ⏸️ Pausar
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
                    </div>
                  )}

                  {/* Paused Works Section */}
                  {pausedWorks.length > 0 && (
                    <div className="works-section paused-section">
                      <h2 className="section-title">⏸️ Obras Pausadas</h2>
                      <div className="cards-grid">
                        {pausedWorks.map((level) => (
                          <div 
                            key={level.id} 
                            className="work-card paused-card"
                            onClick={() => navigate(`/works/${level.id}/levels`)}
                          >
                            {level.coverImage && (
                              <img src={level.coverImage} alt={level.name} className="work-card-img grayscale" />
                            )}
                            <div className="card-content">
                              <div className="card-header">
                                <h3 className="card-title">{level.name}</h3>
                                <span className="badge warning">Pausada</span>
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
                                className="btn-success"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleResume(level.id);
                                }}
                              >
                                ▶️ Retomar
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
                    </div>
                  )}
                </>
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
          background: #f0fdf9;
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
          box-shadow: 0 1px 8px rgba(1, 163, 131, 0.08);
          border: 1px solid #d1fae5;
        }
        .home-title {
          margin: 0;
          font-size: 2rem;
          color: #01a383;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .home-subtitle {
          margin: 4px 0 0 0;
          color: #047857;
          font-size: 1rem;
          font-weight: 500;
        }
        .home-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          border-bottom: 2px solid #d1fae5;
          padding-bottom: 0;
        }
        .tab {
          background: transparent;
          border: none;
          padding: 12px 20px;
          font-size: 1rem;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          transition: all 0.2s ease;
          margin-bottom: -2px;
        }
        .tab:hover {
          color: #01a383;
          background: #f0fdf9;
        }
        .tab.active {
          color: #01a383;
          border-bottom-color: #01a383;
        }
        .home-content {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 1px 8px rgba(1, 163, 131, 0.08);
          padding: 20px;
          border: 1px solid #f0fdf9;
        }
        .home-search {
          margin-bottom: 24px;
        }
        .home-search-input {
          width: 100%;
          padding: 14px 20px;
          font-size: 1rem;
          border: 2px solid #d1fae5;
          border-radius: 10px;
          background: #fff;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(1, 163, 131, 0.04);
        }
        .home-search-input:focus {
          outline: none;
          border-color: #01a383;
          box-shadow: 0 0 0 3px rgba(1, 163, 131, 0.1);
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
          background: #01a383;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-primary:hover {
          background: #018568;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(1, 163, 131, 0.3);
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
        .btn-warning {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
          border-radius: 6px;
          padding: 6px 10px;
          font-weight: 600;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-warning:hover {
          background: #fde68a;
          border-color: #fcd34d;
        }
        .btn-success {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
          border-radius: 6px;
          padding: 6px 10px;
          font-weight: 600;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-success:hover {
          background: #a7f3d0;
          border-color: #6ee7b7;
        }
        .works-section {
          margin-bottom: 32px;
        }
        .section-title {
          font-size: 1.5rem;
          color: #01a383;
          margin-bottom: 16px;
          font-weight: 700;
        }
        .paused-section .section-title {
          color: #92400e;
        }
        .paused-card {
          opacity: 0.85;
          border: 2px dashed #fbbf24;
        }
        .grayscale {
          filter: grayscale(50%);
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
