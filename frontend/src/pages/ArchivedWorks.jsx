import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ArchivedWorks() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [accessDeniedModal, setAccessDeniedModal] = useState(false);

  useEffect(() => {
    // Apenas admin pode acessar
    if (user?.role !== 'A') {
      setAccessDeniedModal(true);
      return;
    }
    fetchObras();
  }, [user]);

  const fetchObras = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/levels?parentId=");
      if (res.ok) {
        const data = await res.json();
        // Filter to show only archived works (status = 'completed')
        setObras(data.filter(obra => obra.status === 'completed'));
      }
    } catch (err) {
      console.error("Erro ao carregar obras arquivadas:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnarchive = async (id) => {
    if (!confirm("Tem certeza que deseja desarquivar esta obra?")) return;
    try {
      const res = await fetch(`/api/levels/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'active', closedBy: null })
      });
      if (res.ok) {
        await fetchObras();
        navigate("/");
      } else {
        alert("Erro ao desarquivar obra");
      }
    } catch (err) {
      alert("Erro ao desarquivar obra: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Tem certeza que deseja deletar permanentemente esta obra?")) return;
    try {
      const res = await fetch(`/api/levels/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchObras();
      } else {
        alert("Erro ao deletar obra");
      }
    } catch (err) {
      alert("Erro ao deletar obra: " + err.message);
    }
  };

  const filteredObras = obras.filter(obra =>
    obra.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    obra.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (accessDeniedModal) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '40px 20px'
      }}>
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          padding: '40px',
          maxWidth: '500px',
          width: '100%',
          minWidth: '320px'
        }}>
          <h2 style={{ 
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#dc2626',
            margin: '0 0 16px 0'
          }}>
            🔒 Acesso Negado
          </h2>
          <p style={{
            color: '#64748b',
            lineHeight: 1.7,
            margin: '0 0 32px 0',
            fontSize: '1.05rem'
          }}>
            Apenas administradores podem gerir obras arquivadas.
          </p>
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center'
          }}>
            <button 
              style={{
                padding: '12px 32px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '1rem',
                minWidth: '200px',
                background: '#059669',
                color: 'white',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#047857';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#059669';
                e.target.style.transform = 'translateY(0)';
              }}
              onClick={() => navigate("/")}
            >
              Voltar para Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="archived-page">
      <div className="archived-header">
        <div>
          <h1 className="archived-title">📦 Obras Arquivadas</h1>
          <p className="archived-subtitle">Gerir obras concluídas</p>
        </div>
        <button className="btn-primary" onClick={() => navigate("/")}>
          ← Voltar para Obras Ativas
        </button>
      </div>

      <div className="archived-content">
        <div className="archived-search">
          <input
            type="text"
            placeholder="🔍 Pesquisar obras arquivadas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="archived-search-input"
          />
        </div>

        <div className="archived-list">
          {loading ? (
            <p className="loading-text">A carregar...</p>
          ) : filteredObras.length === 0 ? (
            <p className="empty-text">
              {searchTerm ? "Nenhuma obra arquivada encontrada com esse termo." : "Sem obras arquivadas."}
            </p>
          ) : (
            <div className="cards-grid">
              {filteredObras.map((obra) => (
                <div 
                  key={obra.id} 
                  className="archived-card"
                  onClick={() => navigate(`/works/${obra.id}/levels`)}
                >
                  {obra.coverImage && (
                    <img src={obra.coverImage} alt={obra.name} className="archived-card-img" />
                  )}
                  <div className="card-content">
                    <div className="card-header">
                      <h3 className="card-title">{obra.name}</h3>
                      {obra.childrenCount > 0 && (
                        <span className="badge archived">
                          {obra.childrenCount} {obra.childrenCount === 1 ? 'nível' : 'níveis'}
                        </span>
                      )}
                    </div>
                    {obra.description && (
                      <p className="card-description">{obra.description}</p>
                    )}
                    {obra.startDate && (
                      <p className="card-date">
                        📅 {new Date(obra.startDate).toLocaleDateString('pt-PT')} - {new Date(obra.endDate).toLocaleDateString('pt-PT')}
                      </p>
                    )}
                    {obra.constructionManagerName && (
                      <p className="card-manager">
                        👷 {obra.constructionManagerName}
                      </p>
                    )}
                  </div>
                  <div className="card-actions">
                    <button
                      className="btn-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/works/${obra.id}/equipa`);
                      }}
                    >
                      👥 Equipa
                    </button>
                    <button
                      className="btn-unarchive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnarchive(obra.id);
                      }}
                      title="Desarquivar"
                    >
                      ↶ Desarquivar
                    </button>
                    <button
                      className="btn-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(obra.id);
                      }}
                      title="Deletar permanentemente"
                    >
                      🗑️ Deletar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .archived-page {
          padding: 20px;
          background: #f8fafc;
          min-height: 100vh;
        }
        .archived-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding: 24px 32px;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 16px #0001;
        }
        .archived-title {
          margin: 0;
          font-size: 2rem;
          color: #1e293b;
          font-weight: 800;
        }
        .archived-subtitle {
          margin: 4px 0 0 0;
          color: #64748b;
          font-size: 1rem;
        }
        .archived-content {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 16px #0001;
          padding: 20px;
        }
        .archived-search {
          margin-bottom: 24px;
        }
        .archived-search-input {
          width: 100%;
          padding: 14px 20px;
          font-size: 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          background: #fff;
          transition: border-color 0.2s;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .archived-search-input:focus {
          outline: none;
          border-color: #2563eb;
        }
        .archived-list {
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
        .archived-card {
          background: #fff;
          border-radius: 10px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
          border: 1px solid #cbd5e1;
          cursor: pointer;
          opacity: 0.65;
          filter: grayscale(40%);
        }
        .archived-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          opacity: 0.8;
        }
        .archived-card-img {
          width: 100%;
          aspect-ratio: 1 / 1;
          height: auto;
          object-fit: cover;
          background: #f1f5f9;
          opacity: 0.75;
        }
        .card-content {
          padding: 12px;
          flex: 1;
          color: #64748b;
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
          color: #475569;
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
        .badge.archived {
          background: #cbd5e1;
          color: #475569;
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
          opacity: 0.7;
        }
        .btn-secondary:hover {
          background: #e2e8f0;
          border-color: #cbd5e1;
          opacity: 1;
        }
        .btn-unarchive {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
          border-radius: 6px;
          padding: 6px 10px;
          font-weight: 600;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
          opacity: 0.8;
        }
        .btn-unarchive:hover {
          background: #a7f3d0;
          border-color: #6ee7b7;
          opacity: 1;
        }
        .btn-delete {
          background: #fee2e2;
          color: #b91c1c;
          border: 1px solid #fecaca;
          border-radius: 6px;
          padding: 6px 10px;
          font-weight: 600;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
          opacity: 0.8;
        }
        .btn-delete:hover {
          background: #fecaca;
          border-color: #fca5a5;
          opacity: 1;
        }
        @media (max-width: 768px) {
          .archived-page {
            padding: 16px;
          }
          .archived-header {
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
