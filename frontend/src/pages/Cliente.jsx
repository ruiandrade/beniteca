import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Cliente() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accessDeniedModal, setAccessDeniedModal] = useState(false);
  const [myWorks, setMyWorks] = useState([]);
  const [selectedWork, setSelectedWork] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('photos'); // 'photos' or 'documents'
  const [enlargedPhoto, setEnlargedPhoto] = useState(null); // For modal enlargement

  // Check access on mount
  useEffect(() => {
    if (user?.role !== 'A' && user?.role !== 'C') {
      setAccessDeniedModal(true);
    }
  }, [user]);

  // Fetch works where user is involved
  useEffect(() => {
    if (user?.role === 'A' || user?.role === 'C') {
      fetchMyWorks();
    }
  }, [user]);

  const fetchMyWorks = async () => {
    try {
      const res = await fetch('/api/levels?parentId=null');
      if (res.ok) {
        const data = await res.json();
        let filtered = data.filter(obra => obra.status === 'active');
        
        if (user?.role === 'C') {
          // Clientes veem apenas obras onde fazem parte da equipa
          const userWorks = [];
          for (const obra of filtered) {
            try {
              const teamRes = await fetch(`/api/level-users/level/${obra.id}`);
              if (teamRes.ok) {
                const team = await teamRes.json();
                if (team.some(m => m.userId === user?.id)) {
                  userWorks.push(obra);
                }
              }
            } catch (err) {
              console.error('Erro ao buscar equipa da obra:', obra.id, err);
            }
          }
          filtered = userWorks;
        }
        // Admins veem tudo
        
        setMyWorks(filtered);
        if (filtered.length > 0) {
          setSelectedWork(filtered[0].id);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar obras:', err);
    }
  };

  const fetchContents = async (workId) => {
    if (!workId) return;
    setLoading(true);
    try {
      // Fetch photos with "Client" label
      const photosRes = await fetch(`/api/photos/level/${workId}`);
      if (photosRes.ok) {
        const allPhotos = await photosRes.json();
        console.log('Todas as fotos:', allPhotos);
        // Filter only Client photos (not backend)
        const clientPhotos = allPhotos.filter(p => p.label === 'Client' || p.label === 'client');
        console.log('Fotos Cliente:', clientPhotos);
        setPhotos(clientPhotos.length > 0 ? clientPhotos : allPhotos);
      }

      // Fetch documents
      const docsRes = await fetch(`/api/documents/level/${workId}`);
      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDocuments(docsData);
      }
    } catch (err) {
      console.error('Erro ao carregar conteúdos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkChange = (workId) => {
    setSelectedWork(workId);
    fetchContents(workId);
  };

  const downloadFile = (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', minHeight: '100vh', background: '#f5f5f5' }}>
      <style>{`
        .cliente-header {
          margin-bottom: 32px;
        }

        .cliente-header h1 {
          margin: 0 0 8px 0;
          color: #1f2937;
          font-size: 28px;
        }

        .cliente-header p {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }

        .cliente-work-selector {
          background: white;
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .cliente-work-selector label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #374151;
          font-size: 14px;
        }

        .cliente-work-selector select {
          width: 100%;
          max-width: 400px;
          padding: 10px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          background: white;
          cursor: pointer;
        }

        .cliente-tabs {
          display: flex;
          gap: 0;
          margin-bottom: 24px;
          background: white;
          border-radius: 12px 12px 0 0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .cliente-tab {
          flex: 1;
          padding: 16px 24px;
          border: none;
          background: #f9fafb;
          color: #6b7280;
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cliente-tab:hover {
          background: #f3f4f6;
        }

        .cliente-tab.active {
          background: white;
          color: #1f2937;
          border-bottom: 3px solid #3b82f6;
        }

        .cliente-content {
          background: white;
          border-radius: 0 0 12px 12px;
          padding: 24px;
          min-height: 400px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .cliente-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 20px;
          margin-top: 16px;
        }

        .cliente-item {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s;
          cursor: pointer;
        }

        .cliente-item:hover {
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
          border-color: #d1d5db;
        }

        .cliente-item-image {
          width: 100%;
          height: 180px;
          background: #e5e7eb;
          object-fit: cover;
          display: block;
        }

        .cliente-item-content {
          padding: 16px;
        }

        .cliente-item-title {
          font-weight: 600;
          color: #1f2937;
          font-size: 14px;
          margin-bottom: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cliente-item-desc {
          color: #6b7280;
          font-size: 13px;
          margin-bottom: 12px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 26px;
        }

        .cliente-item-action {
          display: flex;
          gap: 8px;
        }

        .cliente-btn-view {
          flex: 1;
          padding: 8px 12px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .cliente-btn-view:hover {
          background: #2563eb;
        }

        .cliente-btn-download {
          flex: 1;
          padding: 8px 12px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .cliente-btn-download:hover {
          background: #059669;
        }

        .cliente-empty {
          text-align: center;
          padding: 64px 24px;
          color: #9ca3af;
        }

        .cliente-empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .cliente-icon-folder {
          width: 100%;
          height: 120px;
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          margin-bottom: 0;
          border-radius: 0;
        }

        .cliente-icon-doc {
          width: 100%;
          height: 120px;
          background: linear-gradient(135deg, #93c5fd 0%, #60a5fa 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          margin-bottom: 0;
          border-radius: 0;
        }
      `}</style>

      <div className="cliente-header">
        <h1>📁 Cliente</h1>
        <p>Aceda às fotografias e documentos das suas obras</p>
      </div>

      {/* Work Selector */}
      <div className="cliente-work-selector">
        <label>Obra</label>
        <select value={selectedWork || ''} onChange={(e) => handleWorkChange(e.target.value)}>
          <option value="">-- Seleccione uma obra --</option>
          {myWorks.map(work => (
            <option key={work.id} value={work.id}>{work.name}</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="cliente-tabs">
        <button
          className={`cliente-tab ${activeTab === 'photos' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('photos');
            if (selectedWork) fetchContents(selectedWork);
          }}
        >
          📸 Fotografias ({photos.length})
        </button>
        <button
          className={`cliente-tab ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('documents');
            if (selectedWork) fetchContents(selectedWork);
          }}
        >
          📄 Documentos ({documents.length})
        </button>
      </div>

      {/* Content */}
      <div className="cliente-content">
        {loading && <p style={{ textAlign: 'center', color: '#6b7280' }}>A carregar...</p>}

        {!loading && activeTab === 'photos' && (
          <>
            {photos.length === 0 ? (
              <div className="cliente-empty">
                <div className="cliente-empty-icon">📸</div>
                <p>Nenhuma fotografia disponível para esta obra</p>
              </div>
            ) : (
              <div className="cliente-grid">
                {photos.map(photo => (
                  <div key={photo.id} className="cliente-item">
                    {photo.url ? (
                      <img 
                        src={photo.url} 
                        alt={photo.name || 'Foto'} 
                        className="cliente-photo-img"
                        onClick={() => setEnlargedPhoto(photo)}
                        style={{ 
                          width: '100%', 
                          height: '150px', 
                          objectFit: 'cover', 
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'transform 0.2s ease',
                          transformOrigin: 'center'
                        }}
                        onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                      />
                    ) : (
                      <div className="cliente-icon-folder">📸</div>
                    )}
                    <div className="cliente-item-content">
                      <div className="cliente-item-title" title={photo.name}>{photo.name}</div>
                      <div className="cliente-item-desc">{photo.observacoes || 'Sem descrição'}</div>
                      <div className="cliente-item-action">
                        <button 
                          className="cliente-btn-view"
                          onClick={() => window.open(photo.url, '_blank')}
                        >
                          Ver
                        </button>
                        <button 
                          className="cliente-btn-download"
                          onClick={() => downloadFile(photo.url, photo.name || 'foto')}
                        >
                          ⬇️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {!loading && activeTab === 'documents' && (
          <>
            {documents.length === 0 ? (
              <div className="cliente-empty">
                <div className="cliente-empty-icon">📄</div>
                <p>Nenhum documento disponível para esta obra</p>
              </div>
            ) : (
              <div className="cliente-grid">
                {documents.map(doc => (
                  <div key={doc.id} className="cliente-item">
                    <div className="cliente-icon-doc">📄</div>
                    <div className="cliente-item-content">
                      <div className="cliente-item-title" title={doc.name}>{doc.name}</div>
                      <div className="cliente-item-desc">{doc.description || 'Sem descrição'}</div>
                      <div className="cliente-item-action">
                        <button 
                          className="cliente-btn-view"
                          onClick={() => window.open(doc.documentUrl, '_blank')}
                        >
                          Ver
                        </button>
                        <button 
                          className="cliente-btn-download"
                          onClick={() => downloadFile(doc.documentUrl, doc.name || 'documento')}
                        >
                          ⬇️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Access Denied Modal */}
      {accessDeniedModal && (
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
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '32px',
            borderRadius: '12px',
            textAlign: 'center',
            maxWidth: '400px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)'
          }}>
            <h2 style={{ color: '#dc2626', marginTop: 0 }}>❌ Acesso Negado</h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>
              Apenas administradores e clientes podem aceder a esta secção.
            </p>
            <button
              onClick={() => navigate('/')}
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Voltar ao Início
            </button>
          </div>
        </div>
      )}

      {/* Photo Enlargement Modal */}
      {enlargedPhoto && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
          onClick={() => setEnlargedPhoto(null)}
        >
          <button
            onClick={() => setEnlargedPhoto(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '30px',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '32px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            ✕
          </button>
          
          <img
            src={enlargedPhoto.url}
            alt={enlargedPhoto.name}
            style={{
              maxWidth: '90%',
              maxHeight: '80vh',
              borderRadius: '8px',
              objectFit: 'contain'
            }}
            onClick={(e) => e.stopPropagation()}
          />
          
          <div style={{
            color: 'white',
            marginTop: '20px',
            textAlign: 'center',
            maxWidth: '600px'
          }}>
            <h3 style={{ margin: '0 0 10px 0' }}>{enlargedPhoto.name}</h3>
            <p style={{ margin: '0', fontSize: '14px', opacity: 0.9 }}>
              {enlargedPhoto.observacoes || 'Sem descrição'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
