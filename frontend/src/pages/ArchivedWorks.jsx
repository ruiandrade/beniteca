import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function ArchivedWorks() {
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
        // Filter to show only archived works (completed = true)
        setObras(data.filter(obra => obra.completed === true));
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: false })
      });
      if (res.ok) {
        await fetchObras();
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

  return (
    <div className="archived-bg">
      <div className="archived-container">
        <div className="archived-header">
          <h1 className="archived-title">Obras Arquivadas</h1>
          <button onClick={() => navigate("/")} className="archived-back-btn">
            ← Voltar para Obras Ativas
          </button>
        </div>

        <div className="archived-search">
          <input
            type="text"
            placeholder="🔍 Pesquisar obras arquivadas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="archived-search-input"
          />
        </div>

        {loading ? (
          <p className="archived-loading">A carregar obras arquivadas...</p>
        ) : obras.filter(obra => 
            obra.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            obra.description?.toLowerCase().includes(searchTerm.toLowerCase())
          ).length === 0 ? (
          <div className="archived-empty">
            <p>{searchTerm ? "Nenhuma obra arquivada encontrada com esse termo." : "Nenhuma obra arquivada."}</p>
          </div>
        ) : (
          <div className="archived-grid">
            {obras.filter(obra => 
              obra.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              obra.description?.toLowerCase().includes(searchTerm.toLowerCase())
            ).map((obra) => (
              <div key={obra.id} className="archived-card">
                {obra.coverImage && (
                  <img src={obra.coverImage} alt={obra.name} className="archived-card-img" />
                )}
                <div className="archived-card-content">
                  <div className="archived-badge">Arquivada</div>
                  <h2 className="archived-card-title">{obra.name}</h2>
                  <p className="archived-card-desc">{obra.description}</p>
                  {obra.startDate && (
                    <p className="archived-card-date">
                      Início: {new Date(obra.startDate).toLocaleDateString("pt-PT")}
                    </p>
                  )}
                  {obra.endDate && (
                    <p className="archived-card-date">
                      Fim: {new Date(obra.endDate).toLocaleDateString("pt-PT")}
                    </p>
                  )}
                  {obra.constructionManagerName && (
                    <p className="archived-card-manager">
                      Responsável: {obra.constructionManagerName}
                    </p>
                  )}
                </div>
                <div className="archived-card-actions">
                  <button
                    onClick={() => navigate(`/works/${obra.id}/levels`)}
                    className="archived-btn-view"
                  >
                    Ver
                  </button>
                  <button onClick={() => handleUnarchive(obra.id)} className="archived-btn-unarchive" title="Desarquivar">
                    ↶
                  </button>
                  <button onClick={() => handleDelete(obra.id)} className="archived-btn-delete" title="Deletar">
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .archived-bg {
          min-height: 100vh;
          background: #f8fafc;
          padding: 20px;
        }
        .archived-container {
          width: 100%;
          max-width: 100%;
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
          font-size: 2rem;
          font-weight: 800;
          color: #1e293b;
          margin: 0;
        }
        .archived-back-btn {
          padding: 12px 24px;
          background: #2563eb;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .archived-back-btn:hover {
          background: #1d4ed8;
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
        .archived-loading {
          text-align: center;
          color: #64748b;
          padding: 40px;
          font-size: 1.1rem;
        }
        .archived-empty {
          text-align: center;
          color: #64748b;
          padding: 60px 20px;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 16px #0001;
        }
        .archived-empty p {
          font-size: 1.1rem;
          margin: 8px 0;
        }
        .archived-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
        }
        .archived-card {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: transform 0.2s, box-shadow 0.2s;
          border: 1px solid #e2e8f0;
        }
        .archived-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 28px rgba(0,0,0,0.12);
        }
        .archived-card-img {
          width: 100%;
          aspect-ratio: 1 / 1;
          height: auto;
          object-fit: cover;
          background: #f1f5f9;
          opacity: 0.7;
        }
        .archived-card-content {
          padding: 20px;
          flex: 1;
          position: relative;
        }
        .archived-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          background: #f59e0b;
          color: #fff;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: bold;
          text-transform: uppercase;
        }
        .archived-card-title {
          font-size: 1.4rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 8px;
        }
        .archived-card-desc {
          color: #64748b;
          font-size: 0.95rem;
          margin-bottom: 12px;
          line-height: 1.5;
        }
        .archived-card-date,
        .archived-card-manager {
          color: #94a3b8;
          font-size: 0.9rem;
          margin-bottom: 4px;
        }
        .archived-card-actions {
          display: flex;
          gap: 8px;
          padding: 16px 20px;
          border-top: 1px solid #e2e8f0;
        }
        .archived-btn-view {
          flex: 1;
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.95rem;
          transition: background 0.2s;
          background: linear-gradient(90deg, #6366f1 0%, #2563eb 100%);
          color: #fff;
        }
        .archived-btn-view:hover {
          opacity: 0.9;
        }
        .archived-btn-unarchive,
        .archived-btn-delete {
          padding: 10px 14px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 1.2rem;
          transition: background 0.2s;
        }
        .archived-btn-unarchive {
          background: #dbeafe;
          color: #2563eb;
        }
        .archived-btn-unarchive:hover {
          background: #bfdbfe;
        }
        .archived-btn-delete {
          background: #fee2e2;
          color: #dc2626;
        }
        .archived-btn-delete:hover {
          background: #fecaca;
        }
      `}</style>
    </div>
  );
}
