import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchObras();
  }, []);

  const fetchObras = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/levels?parentId=");
      if (res.ok) {
        const data = await res.json();
        setObras(data);
      }
    } catch (err) {
      console.error("Erro ao carregar obras:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Tem certeza que deseja deletar esta obra?")) return;
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

  return (
    <div className="home-bg">
      <div className="home-container">
        <div className="home-header">
          <h1 className="home-title">Gestão de Obras</h1>
          <button onClick={() => navigate("/create")} className="home-create-btn">
            + Criar Nova Obra
          </button>
        </div>

        {loading ? (
          <p className="home-loading">A carregar obras...</p>
        ) : obras.length === 0 ? (
          <div className="home-empty">
            <p>Nenhuma obra encontrada.</p>
            <p className="home-empty-hint">Comece por criar a primeira obra.</p>
          </div>
        ) : (
          <div className="home-grid">
            {obras.map((obra) => (
              <div key={obra.id} className="home-card">
                {obra.coverImage && (
                  <img src={obra.coverImage} alt={obra.name} className="home-card-img" />
                )}
                <div className="home-card-content">
                  <h2 className="home-card-title">{obra.name}</h2>
                  <p className="home-card-desc">{obra.description}</p>
                  {obra.startDate && (
                    <p className="home-card-date">
                      Início: {new Date(obra.startDate).toLocaleDateString("pt-PT")}
                    </p>
                  )}
                  {obra.endDate && (
                    <p className="home-card-date">
                      Fim: {new Date(obra.endDate).toLocaleDateString("pt-PT")}
                    </p>
                  )}
                  {obra.constructionManagerName && (
                    <p className="home-card-manager">
                      Responsável: {obra.constructionManagerName}
                    </p>
                  )}
                </div>
                <div className="home-card-actions">
                  <button
                    onClick={() => navigate(`/works/${obra.id}/levels`)}
                    className="home-btn-view"
                  >
                    Gerir
                  </button>
                  <button onClick={() => handleDelete(obra.id)} className="home-btn-delete">
                    Deletar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .home-bg {
          min-height: 100vh;
          background: #f8fafc;
          padding: 20px;
        }
        .home-container {
          max-width: 1400px;
          margin: 0 auto;
        }
        .home-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          padding: 24px 32px;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 16px #0001;
        }
        .home-title {
          font-size: 2.5rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }
        .home-create-btn {
          background: linear-gradient(90deg, #6366f1 0%, #2563eb 100%);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          font-weight: 600;
          font-size: 1.05rem;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .home-create-btn:hover {
          transform: scale(1.05);
        }
        .home-loading {
          text-align: center;
          color: #64748b;
          padding: 60px;
          font-size: 1.1rem;
        }
        .home-empty {
          text-align: center;
          padding: 80px 40px;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 16px #0001;
        }
        .home-empty p {
          font-size: 1.2rem;
          color: #64748b;
          margin-bottom: 8px;
        }
        .home-empty-hint {
          color: #94a3b8;
          font-size: 1rem;
        }
        .home-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 24px;
        }
        .home-card {
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 16px #0001;
          transition: box-shadow 0.3s, transform 0.2s;
          display: flex;
          flex-direction: column;
        }
        .home-card:hover {
          box-shadow: 0 4px 24px #0002;
          transform: translateY(-4px);
        }
        .home-card-img {
          width: 100%;
          height: 200px;
          object-fit: cover;
        }
        .home-card-content {
          padding: 20px;
          flex: 1;
        }
        .home-card-title {
          font-size: 1.4rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 8px;
        }
        .home-card-desc {
          color: #64748b;
          font-size: 0.95rem;
          margin-bottom: 12px;
          line-height: 1.5;
        }
        .home-card-date,
        .home-card-manager {
          color: #94a3b8;
          font-size: 0.9rem;
          margin-bottom: 4px;
        }
        .home-card-actions {
          display: flex;
          gap: 8px;
          padding: 16px 20px;
          border-top: 1px solid #e2e8f0;
        }
        .home-btn-view,
        .home-btn-delete {
          flex: 1;
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.95rem;
          transition: background 0.2s;
        }
        .home-btn-view {
          background: linear-gradient(90deg, #6366f1 0%, #2563eb 100%);
          color: #fff;
        }
        .home-btn-view:hover {
          opacity: 0.9;
        }
        .home-btn-delete {
          background: #fee2e2;
          color: #dc2626;
        }
        .home-btn-delete:hover {
          background: #fecaca;
        }
      `}</style>
    </div>
  );
}
