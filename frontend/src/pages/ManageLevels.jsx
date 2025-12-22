import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function ManageLevels() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("sublevels");
  const [work, setWork] = useState(null);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [sublevels, setSublevels] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  // Estados para formulários
  const [showSublevelForm, setShowSublevelForm] = useState(false);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showPhotoForm, setShowPhotoForm] = useState(false);
  const [showDocumentForm, setShowDocumentForm] = useState(false);

  // Formulário de subnível
  const [sublevelName, setSublevelName] = useState("");
  const [sublevelDesc, setSublevelDesc] = useState("");
  const [sublevelCover, setSublevelCover] = useState(null);
  const [sublevelErrors, setSublevelErrors] = useState({});

  // Formulário de material
  const [materialName, setMaterialName] = useState("");
  const [materialQuantity, setMaterialQuantity] = useState("");
  const [materialUnit, setMaterialUnit] = useState("");
  const [materialEstimated, setMaterialEstimated] = useState("");
  const [materialReal, setMaterialReal] = useState("");
  const [materialDeliveryStatus, setMaterialDeliveryStatus] = useState("Not requested");
  const [materialAssemblyStatus, setMaterialAssemblyStatus] = useState("Not started");
  const [materialErrors, setMaterialErrors] = useState({});

  // Formulário de nota
  const [noteText, setNoteText] = useState("");
  const [noteErrors, setNoteErrors] = useState({});

  // Formulário de documento
  const [documentFile, setDocumentFile] = useState(null);
  const [documentType, setDocumentType] = useState("");
  const [documentErrors, setDocumentErrors] = useState({});

  // Formulário de foto
  const [photoFile, setPhotoFile] = useState(null);
  const [photoType, setPhotoType] = useState("inicio");
  const [photoDesc, setPhotoDesc] = useState("");
  const [photoErrors, setPhotoErrors] = useState({});

  // Estado para editar detalhes do nível atual
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editErrors, setEditErrors] = useState({});

  // Estado para editar material
  const [editingMaterial, setEditingMaterial] = useState(null);

  useEffect(() => {
    fetchWork();
    fetchSublevels();
    fetchMaterials();
    fetchDocuments();
    fetchNotes();
    fetchPhotos();
    buildBreadcrumb();
  }, [id]);

  const fetchWork = async () => {
    try {
      const res = await fetch(`/api/levels/${id}`);
      if (res.ok) {
        const data = await res.json();
        setWork(data);
        setEditName(data.name || "");
        setEditDesc(data.description || "");
        setEditStart(data.startDate ? data.startDate.split('T')[0] : "");
        setEditEnd(data.endDate ? data.endDate.split('T')[0] : "");
      }
    } catch (err) {
      console.error("Erro ao carregar obra:", err);
    }
  };

  const buildBreadcrumb = async () => {
    try {
      const chain = [];
      let currentId = id;
      for (let i = 0; i < 10 && currentId; i++) {
        const res = await fetch(`/api/levels/${currentId}`);
        if (!res.ok) break;
        const lvl = await res.json();
        chain.unshift({ id: lvl.id, name: lvl.name, parentId: lvl.parentId });
        currentId = lvl.parentId;
      }
      setBreadcrumb(chain);
    } catch (err) {
      console.error("Erro ao construir breadcrumb:", err);
    }
  };

  const fetchSublevels = async () => {
    try {
      const res = await fetch(`/api/levels?parentId=${id}`);
      if (res.ok) {
        const data = await res.json();
        
        // Fetch children count for each sublevel
        const enrichedData = await Promise.all(
          data.map(async (sub) => {
            const childrenRes = await fetch(`/api/levels?parentId=${sub.id}`);
            if (childrenRes.ok) {
              const children = await childrenRes.json();
              const completedChildren = children.filter(c => c.completed).length;
              return { ...sub, childrenCount: children.length, completedChildren };
            }
            return { ...sub, childrenCount: 0, completedChildren: 0 };
          })
        );
        
        setSublevels(enrichedData);
        const completed = enrichedData.filter(sub => sub.completed).length;
        setCompletedCount(completed);
      }
    } catch (err) {
      console.error("Erro ao carregar subníveis:", err);
    }
  };

  const fetchMaterials = async () => {
    try {
      const res = await fetch(`/api/materials/level/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMaterials(data);
      }
    } catch (err) {
      console.error("Erro ao carregar materiais:", err);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`/api/documents/level/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error("Erro ao carregar documentos:", err);
    }
  };

  const fetchNotes = async () => {
    try {
      const res = await fetch(`/api/levels/${id}`);
      if (res.ok) {
        const data = await res.json();
        setNotes([{ id: data.id, description: data.notes || "" }]);
      }
    } catch (err) {
      console.error("Erro ao carregar notas:", err);
    }
  };

  const fetchPhotos = async () => {
    try {
      const res = await fetch(`/api/photos/level/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPhotos(data);
      }
    } catch (err) {
      console.error("Erro ao carregar fotos:", err);
    }
  };

  // ========== SUBNÍVEIS ==========
  const handleCreateSublevel = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!sublevelName.trim()) errors.name = "Nome é obrigatório";
    if (!sublevelDesc.trim()) errors.description = "Descrição é obrigatória";
    // Imagem é obrigatória apenas em obras principais (parentId === null)
    // Para subníveis, imagem é opcional
    setSublevelErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      let url = null;
      
      // Upload da imagem apenas se foi fornecida
      if (sublevelCover) {
        const formData = new FormData();
        const renamed = new File([sublevelCover], `${id}-${Date.now()}-cover-${sublevelCover.name}`, { type: sublevelCover.type });
        formData.append("file", renamed);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Erro ao fazer upload");
        const uploadData = await uploadRes.json();
        url = uploadData.url;
      }

      const res = await fetch("/api/levels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sublevelName,
          description: sublevelDesc,
          coverImage: url,
          parentId: id,
        }),
      });
      if (!res.ok) throw new Error("Erro ao criar subnível");
      await fetchSublevels();
      setSublevelName("");
      setSublevelDesc("");
      setSublevelCover(null);
      setShowSublevelForm(false);
      setSublevelErrors({});
    } catch (err) {
      setSublevelErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSublevel = async (sublevelId) => {
    if (!confirm("Tem certeza que deseja deletar este subnível?")) return;
    try {
      const res = await fetch(`/api/levels/${sublevelId}`, { method: "DELETE" });
      if (res.ok) await fetchSublevels();
    } catch (err) {
      alert("Erro ao deletar subnível");
    }
  };

  const handleToggleComplete = async (sublevelId, currentStatus) => {
    const message = currentStatus 
      ? "Tem certeza que deseja marcar como não concluído?" 
      : "Tem certeza que deseja marcar como concluído?";
    if (!confirm(message)) return;
    
    try {
      const res = await fetch(`/api/levels/${sublevelId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !currentStatus }),
      });
      if (res.ok) await fetchSublevels();
    } catch (err) {
      alert("Erro ao alterar estado de conclusão");
    }
  };

  // ========== MATERIAIS ==========
  const handleCreateMaterial = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!materialName.trim()) errors.name = "Nome é obrigatório";
    if (!materialQuantity) errors.quantity = "Quantidade é obrigatória";
    setMaterialErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const description = materialUnit.trim() ? `${materialName} (${materialUnit})` : materialName;
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          quantity: parseFloat(materialQuantity),
          estimatedValue: materialEstimated ? parseFloat(materialEstimated) : null,
          realValue: materialReal ? parseFloat(materialReal) : null,
          deliveryStatus: materialDeliveryStatus,
          assemblyStatus: materialAssemblyStatus,
          levelId: id,
        }),
      });
      if (!res.ok) throw new Error("Erro ao criar material");
      await fetchMaterials();
      setMaterialName("");
      setMaterialQuantity("");
      setMaterialUnit("");
      setMaterialEstimated("");
      setMaterialReal("");
      setMaterialDeliveryStatus("Not requested");
      setMaterialAssemblyStatus("Not started");
      setShowMaterialForm(false);
      setMaterialErrors({});
    } catch (err) {
      setMaterialErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    if (!confirm("Tem certeza que deseja deletar este material?")) return;
    try {
      const res = await fetch(`/api/materials/${materialId}`, { method: "DELETE" });
      if (res.ok) await fetchMaterials();
    } catch (err) {
      alert("Erro ao deletar material");
    }
  };

  const handleUpdateMaterial = async (mat) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/materials/${mat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: mat.description,
          quantity: parseFloat(mat.quantity),
          estimatedValue: mat.estimatedValue ? parseFloat(mat.estimatedValue) : null,
          realValue: mat.realValue ? parseFloat(mat.realValue) : null,
          deliveryStatus: mat.deliveryStatus,
          assemblyStatus: mat.assemblyStatus,
          levelId: id,
        }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar material");
      await fetchMaterials();
      setEditingMaterial(null);
    } catch (err) {
      alert("Erro ao atualizar material: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ========== DOCUMENTOS ==========
  const handleCreateDocument = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!documentFile) errors.file = "Arquivo é obrigatório";
    setDocumentErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const formData = new FormData();
      const renamed = new File([documentFile], `${id}-${Date.now()}-document-${documentFile.name}`, { type: documentFile.type });
      formData.append("file", renamed);
      const uploadRes = await fetch("/api/upload?container=beniteca-documents", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Erro ao fazer upload");
      const { url } = await uploadRes.json();

      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          type: documentType || null,
          fileName: documentFile.name,
          levelId: id,
        }),
      });
      if (!res.ok) throw new Error("Erro ao guardar documento");
      await fetchDocuments();
      setDocumentFile(null);
      setDocumentType("");
      setShowDocumentForm(false);
      setDocumentErrors({});
    } catch (err) {
      setDocumentErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!confirm("Tem certeza que deseja deletar este documento?")) return;
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
      if (res.ok) await fetchDocuments();
    } catch (err) {
      alert("Erro ao deletar documento");
    }
  };

  // ========== NOTAS ==========
  const handleCreateNote = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!noteText.trim()) errors.text = "Texto é obrigatório";
    setNoteErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/levels/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: noteText }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar nota");
      await fetchNotes();
      setNoteText("");
      setShowNoteForm(false);
      setNoteErrors({});
    } catch (err) {
      setNoteErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm("Tem certeza que deseja deletar esta nota?")) return;
    try {
      const res = await fetch(`/api/permissions/${noteId}`, { method: "DELETE" });
      if (res.ok) await fetchNotes();
    } catch (err) {
      alert("Erro ao deletar nota");
    }
  };

  // ========== FOTOS ==========
  const handleCreatePhoto = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!photoFile) errors.file = "Arquivo é obrigatório";
    setPhotoErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const formData = new FormData();
      const renamed = new File([photoFile], `${id}-${Date.now()}-${photoType}-${photoFile.name}`, { type: photoFile.type });
      formData.append("file", renamed);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Erro ao fazer upload");
      const { url } = await uploadRes.json();

      const res = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          type: photoType,
          levelId: id,
        }),
      });
      if (!res.ok) throw new Error("Erro ao criar foto");
      await fetchPhotos();
      setPhotoFile(null);
      setPhotoType("inicio");
      setPhotoDesc("");
      setShowPhotoForm(false);
      setPhotoErrors({});
    } catch (err) {
      setPhotoErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!confirm("Tem certeza que deseja deletar esta foto?")) return;
    try {
      const res = await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
      if (res.ok) await fetchPhotos();
    } catch (err) {
      alert("Erro ao deletar foto");
    }
  };

  const handleUpdateLevel = async () => {
    const errors = {};
    if (!editName.trim()) errors.name = "Nome é obrigatório";
    if (!editDesc.trim()) errors.description = "Descrição é obrigatória";
    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/levels/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          description: editDesc,
          startDate: editStart || null,
          endDate: editEnd || null,
        }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar nível");
      await fetchWork();
      await buildBreadcrumb();
      setEditMode(false);
      setEditErrors({});
    } catch (err) {
      setEditErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ml-bg">
      <div className="ml-layout">
        <div className="ml-tree-panel">
          <h3>Mapa de Níveis</h3>
          <ul className="ml-tree-list">
            {breadcrumb.map((node, idx) => (
              <li key={node.id} className={`ml-tree-item ${parseInt(id) === node.id ? 'ml-tree-current' : ''}`}>
                <button onClick={() => navigate(`/works/${node.id}/levels`)}>
                  {idx === 0 ? 'Obra' : 'Nível'}: {node.name}
                </button>
              </li>
            ))}
            {sublevels.length > 0 && (
              <li className="ml-tree-children-title">Filhos imediatos</li>
            )}
            {sublevels.map((child) => (
              <li key={child.id} className="ml-tree-item ml-tree-child">
                <button onClick={() => navigate(`/works/${child.id}/levels`)}>
                  {child.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="ml-container">
          <div className="ml-header">
          <button onClick={() => navigate("/")} className="ml-back-btn">← Início</button>
          <h1 className="ml-title">
            {breadcrumb.length > 0
              ? breadcrumb.map((b, idx) => (
                  <span key={b.id}>
                    {idx < breadcrumb.length - 1 ? (
                      <button onClick={() => navigate(`/works/${b.id}/levels`)} className="ml-breadcrumb-link">
                        {b.name}
                      </button>
                    ) : (
                      <span className="ml-breadcrumb-current">{b.name}</span>
                    )}
                    {idx < breadcrumb.length - 1 ? " › " : ""}
                  </span>
                ))
              : (work?.name || "Obra")}
          </h1>
          <p className="ml-subtitle">{work?.description}</p>
          {sublevels.length > 0 && (
            <p className="ml-completion-ratio">
              ✓ {completedCount}/{sublevels.length} níveis concluídos
            </p>
          )}
          <button onClick={() => setEditMode(!editMode)} className="ml-edit-btn">
            {editMode ? "Cancelar Edição" : "✏ Editar Detalhes"}
          </button>
        </div>

        {editMode && (
          <div className="ml-edit-section">
            <h2>Editar Nível</h2>
            <form className="ml-form">
              <div className="ml-field">
                <label>Nome *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                {editErrors.name && <span className="ml-error">{editErrors.name}</span>}
              </div>
              <div className="ml-field">
                <label>Descrição *</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                />
                {editErrors.description && <span className="ml-error">{editErrors.description}</span>}
              </div>
              <div className="ml-row">
                <div className="ml-field">
                  <label>Data de Início</label>
                  <input
                    type="date"
                    value={editStart}
                    onChange={(e) => setEditStart(e.target.value)}
                  />
                </div>
                <div className="ml-field">
                  <label>Data de Fim</label>
                  <input
                    type="date"
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                  />
                </div>
              </div>
              {editErrors.submit && <div className="ml-error">{editErrors.submit}</div>}
              <button type="button" onClick={handleUpdateLevel} className="ml-btn" disabled={loading}>
                {loading ? "A guardar..." : "Guardar Alterações"}
              </button>
            </form>
          </div>
        )}

        <div className="ml-tabs">
          <button
            className={activeTab === "sublevels" ? "ml-tab ml-tab-active" : "ml-tab"}
            onClick={() => setActiveTab("sublevels")}
          >
            Subníveis
          </button>
          <button
            className={activeTab === "materials" ? "ml-tab ml-tab-active" : "ml-tab"}
            onClick={() => setActiveTab("materials")}
          >
            Materiais
          </button>
          <button
            className={activeTab === "notes" ? "ml-tab ml-tab-active" : "ml-tab"}
            onClick={() => setActiveTab("notes")}
          >
            Notas
          </button>
          <button
            className={activeTab === "photos" ? "ml-tab ml-tab-active" : "ml-tab"}
            onClick={() => setActiveTab("photos")}
          >
            Fotografias
          </button>
          <button
            className={activeTab === "documents" ? "ml-tab ml-tab-active" : "ml-tab"}
            onClick={() => setActiveTab("documents")}
          >
            Documentos
          </button>
        </div>

        {/* ========== TAB: SUBNÍVEIS ========== */}
        {activeTab === "sublevels" && (
          <div className="ml-tab-content">
            <div className="ml-section-header">
              <h2>Subníveis</h2>
              <button onClick={() => setShowSublevelForm(!showSublevelForm)} className="ml-add-btn">
                {showSublevelForm ? "Cancelar" : "+ Adicionar Subnível"}
              </button>
            </div>

            {showSublevelForm && (
              <form onSubmit={handleCreateSublevel} className="ml-form">
                <div className="ml-field">
                  <label>Nome *</label>
                  <input
                    type="text"
                    value={sublevelName}
                    onChange={(e) => setSublevelName(e.target.value)}
                  />
                  {sublevelErrors.name && <span className="ml-error">{sublevelErrors.name}</span>}
                </div>
                <div className="ml-field">
                  <label>Descrição *</label>
                  <textarea
                    value={sublevelDesc}
                    onChange={(e) => setSublevelDesc(e.target.value)}
                  />
                  {sublevelErrors.description && <span className="ml-error">{sublevelErrors.description}</span>}
                </div>
                <div className="ml-field">
                  <label>Imagem de Capa (opcional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSublevelCover(e.target.files[0])}
                  />
                  {sublevelErrors.cover && <span className="ml-error">{sublevelErrors.cover}</span>}
                </div>
                {sublevelErrors.submit && <div className="ml-error">{sublevelErrors.submit}</div>}
                <button type="submit" className="ml-btn" disabled={loading}>
                  {loading ? "A criar..." : "Criar Subnível"}
                </button>
              </form>
            )}

            <div className="ml-list">
              {sublevels.length === 0 ? (
                <p className="ml-empty">Nenhum subnível encontrado.</p>
              ) : (
                sublevels.map((sub) => (
                  <div key={sub.id} className="ml-item">
                    <div className="ml-item-info">
                      <h3>{sub.name} {sub.completed && <span className="ml-completed-badge">✓</span>}</h3>
                      <p>{sub.description}</p>
                      {sub.childrenCount > 0 && (
                        <p className="ml-sublevel-ratio">
                          ✓ {sub.completedChildren}/{sub.childrenCount} níveis concluídos
                        </p>
                      )}
                    </div>
                    <div className="ml-item-actions">
                      <button onClick={() => navigate(`/works/${sub.id}/levels`)} className="ml-btn-view">Ver</button>
                      <button onClick={() => handleDeleteSublevel(sub.id)} className="ml-btn-delete">Deletar</button>
                      <button 
                        onClick={() => handleToggleComplete(sub.id, sub.completed)} 
                        className={sub.completed ? "ml-btn-completed" : "ml-btn-incomplete"}
                        title={sub.completed ? "Marcar como não concluído" : "Marcar como concluído"}
                      >
                        {sub.completed ? "✓" : "○"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========== TAB: MATERIAIS ========== */}
        {activeTab === "materials" && (
          <div className="ml-tab-content">
            <div className="ml-section-header">
              <h2>Materiais</h2>
              <button onClick={() => setShowMaterialForm(!showMaterialForm)} className="ml-add-btn">
                {showMaterialForm ? "Cancelar" : "+ Adicionar Material"}
              </button>
            </div>

            {showMaterialForm && (
              <form onSubmit={handleCreateMaterial} className="ml-form">
                <div className="ml-status-row">
                  <div className="ml-field">
                    <label>Delivery</label>
                    <div className="ml-radio-group">
                      {['Not requested','Requested','Delivered'].map(status => (
                        <label key={status} className="ml-radio">
                          <input
                            type="radio"
                            value={status}
                            checked={materialDeliveryStatus === status}
                            onChange={(e) => setMaterialDeliveryStatus(e.target.value)}
                          />
                          {status}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="ml-field">
                    <label>Assembly</label>
                    <div className="ml-radio-group">
                      {['Not started','Started','Finished'].map(status => (
                        <label key={status} className="ml-radio">
                          <input
                            type="radio"
                            value={status}
                            checked={materialAssemblyStatus === status}
                            onChange={(e) => setMaterialAssemblyStatus(e.target.value)}
                          />
                          {status}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="ml-field">
                  <label>Nome *</label>
                  <input
                    type="text"
                    value={materialName}
                    onChange={(e) => setMaterialName(e.target.value)}
                  />
                  {materialErrors.name && <span className="ml-error">{materialErrors.name}</span>}
                </div>
                <div className="ml-row">
                  <div className="ml-field">
                    <label>Quantidade *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={materialQuantity}
                      onChange={(e) => setMaterialQuantity(e.target.value)}
                    />
                    {materialErrors.quantity && <span className="ml-error">{materialErrors.quantity}</span>}
                  </div>
                  <div className="ml-field">
                    <label>Unidade (opcional)</label>
                    <input
                      type="text"
                      placeholder="m², kg, L, etc."
                      value={materialUnit}
                      onChange={(e) => setMaterialUnit(e.target.value)}
                    />
                    {materialErrors.unit && <span className="ml-error">{materialErrors.unit}</span>}
                  </div>
                  <div className="ml-field">
                    <label>Valor Estimado (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={materialEstimated}
                      onChange={(e) => setMaterialEstimated(e.target.value)}
                    />
                  </div>
                </div>
                <div className="ml-row">
                  <div className="ml-field">
                    <label>Valor Real (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={materialReal}
                      onChange={(e) => setMaterialReal(e.target.value)}
                    />
                  </div>
                </div>
                {materialErrors.submit && <div className="ml-error">{materialErrors.submit}</div>}
                <button type="submit" className="ml-btn" disabled={loading}>
                  {loading ? "A criar..." : "Criar Material"}
                </button>
              </form>
            )}

            <div className="ml-list">
              {materials.length === 0 ? (
                <p className="ml-empty">Nenhum material encontrado.</p>
              ) : (
                materials.map((mat) => (
                  <div key={mat.id} className="ml-item">
                    {editingMaterial?.id === mat.id ? (
                      <div className="ml-edit-material">
                        <div className="ml-status-row">
                          <div className="ml-field">
                            <label>Delivery</label>
                            <div className="ml-radio-group">
                              {['Not requested','Requested','Delivered'].map(status => (
                                <label key={status} className="ml-radio">
                                  <input
                                    type="radio"
                                    value={status}
                                    checked={editingMaterial.deliveryStatus === status}
                                    onChange={(e) => setEditingMaterial({...editingMaterial, deliveryStatus: e.target.value})}
                                  />
                                  {status}
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="ml-field">
                            <label>Assembly</label>
                            <div className="ml-radio-group">
                              {['Not started','Started','Finished'].map(status => (
                                <label key={status} className="ml-radio">
                                  <input
                                    type="radio"
                                    value={status}
                                    checked={editingMaterial.assemblyStatus === status}
                                    onChange={(e) => setEditingMaterial({...editingMaterial, assemblyStatus: e.target.value})}
                                  />
                                  {status}
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="ml-field">
                          <label>Descrição</label>
                          <input
                            type="text"
                            value={editingMaterial.description}
                            onChange={(e) => setEditingMaterial({...editingMaterial, description: e.target.value})}
                          />
                        </div>
                        <div className="ml-row">
                          <div className="ml-field">
                            <label>Quantidade</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editingMaterial.quantity}
                              onChange={(e) => setEditingMaterial({...editingMaterial, quantity: e.target.value})}
                            />
                          </div>
                          <div className="ml-field">
                            <label>Valor Estimado (€)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editingMaterial.estimatedValue || ''}
                              onChange={(e) => setEditingMaterial({...editingMaterial, estimatedValue: e.target.value})}
                            />
                          </div>
                          <div className="ml-field">
                            <label>Valor Real (€)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editingMaterial.realValue || ''}
                              onChange={(e) => setEditingMaterial({...editingMaterial, realValue: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="ml-item-actions">
                          <button onClick={() => handleUpdateMaterial(editingMaterial)} className="ml-btn-view">Guardar</button>
                          <button onClick={() => setEditingMaterial(null)} className="ml-btn-delete">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="ml-item-info">
                          <div className="ml-status-badges">
                            <span className="ml-badge">Delivery: {mat.deliveryStatus || 'Not requested'}</span>
                            <span className="ml-badge">Assembly: {mat.assemblyStatus || 'Not started'}</span>
                          </div>
                          <h3>{mat.description}</h3>
                          <p>
                            Quantidade: {mat.quantity} {" "}
                            {mat.estimatedValue != null && (
                              <span>• Estimado: €{Number(mat.estimatedValue).toFixed(2)} </span>
                            )}
                            {mat.realValue != null && (
                              <span>• Real: €{Number(mat.realValue).toFixed(2)}</span>
                            )}
                          </p>
                        </div>
                        <div className="ml-item-actions">
                          <button
                            onClick={() => setEditingMaterial({
                              ...mat,
                              deliveryStatus: mat.deliveryStatus || "Not requested",
                              assemblyStatus: mat.assemblyStatus || "Not started",
                            })}
                            className="ml-btn-view"
                          >
                            Editar
                          </button>
                          <button onClick={() => handleDeleteMaterial(mat.id)} className="ml-btn-delete">Deletar</button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========== TAB: NOTAS ========== */}
        {activeTab === "notes" && (
          <div className="ml-tab-content">
            <div className="ml-section-header">
              <h2>Notas</h2>
              <button onClick={() => setShowNoteForm(!showNoteForm)} className="ml-add-btn">
                {showNoteForm ? "Cancelar" : "+ Adicionar Nota"}
              </button>
            </div>

            {showNoteForm && (
              <form onSubmit={handleCreateNote} className="ml-form">
                <div className="ml-field">
                  <label>Texto *</label>
                  <textarea
                    rows="4"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                  />
                  {noteErrors.text && <span className="ml-error">{noteErrors.text}</span>}
                </div>
                {noteErrors.submit && <div className="ml-error">{noteErrors.submit}</div>}
                <button type="submit" className="ml-btn" disabled={loading}>
                  {loading ? "A criar..." : "Criar Nota"}
                </button>
              </form>
            )}

            <div className="ml-form">
              <div className="ml-field">
                <label>Notas do nível</label>
                <textarea
                  rows="5"
                  value={notes[0]?.description || ""}
                  onChange={(e) => setNotes([{ id: id, description: e.target.value }])}
                />
              </div>
              <button
                type="button"
                className="ml-btn"
                onClick={async () => {
                  const text = notes[0]?.description || "";
                  const res = await fetch(`/api/levels/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ notes: text }),
                  });
                  if (res.ok) {
                    await fetchNotes();
                  } else {
                    alert("Erro ao salvar notas");
                  }
                }}
              >
                Guardar Notas
              </button>
            </div>
          </div>
        )}

        {/* ========== TAB: FOTOGRAFIAS ========== */}
        {activeTab === "photos" && (
          <div className="ml-tab-content">
            <div className="ml-section-header">
              <h2>Fotografias</h2>
              <button onClick={() => setShowPhotoForm(!showPhotoForm)} className="ml-add-btn">
                {showPhotoForm ? "Cancelar" : "+ Adicionar Foto"}
              </button>
            </div>

            {showPhotoForm && (
              <form onSubmit={handleCreatePhoto} className="ml-form">
                <div className="ml-field">
                  <label>Tipo de Foto</label>
                  <select value={photoType} onChange={(e) => setPhotoType(e.target.value)}>
                    <option value="inicio">Início</option>
                    <option value="durante">Durante</option>
                    <option value="fim">Fim</option>
                  </select>
                </div>
                <div className="ml-field">
                  <label>Arquivo *</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhotoFile(e.target.files[0])}
                  />
                  {photoErrors.file && <span className="ml-error">{photoErrors.file}</span>}
                </div>
                <div className="ml-field">
                  <label>Descrição (opcional)</label>
                  <input
                    type="text"
                    value={photoDesc}
                    onChange={(e) => setPhotoDesc(e.target.value)}
                  />
                </div>
                {photoErrors.submit && <div className="ml-error">{photoErrors.submit}</div>}
                <button type="submit" className="ml-btn" disabled={loading}>
                  {loading ? "A enviar..." : "Enviar Foto"}
                </button>
              </form>
            )}

            <div className="ml-photo-sections">
              {['inicio','durante','fim'].map(section => (
                <div key={section} className="ml-photo-section">
                  <h3 className="ml-photo-section-title">
                    {section === 'inicio' ? 'Antes' : section === 'durante' ? 'Durante' : 'Depois'}
                  </h3>
                  <div className="ml-photo-grid">
                    {photos.filter(p => p.type === section).length === 0 ? (
                      <p className="ml-empty">Sem fotos nesta secção.</p>
                    ) : (
                      photos.filter(p => p.type === section).map(photo => (
                        <div key={photo.id} className="ml-photo-card">
                          <img src={photo.url} alt={"Foto"} className="ml-photo-img" />
                          <button onClick={() => handleDeletePhoto(photo.id)} className="ml-btn-delete-photo">✕</button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========== TAB: DOCUMENTOS ========== */}
        {activeTab === "documents" && (
          <div className="ml-tab-content">
            <div className="ml-section-header">
              <h2>Documentos</h2>
              <button onClick={() => setShowDocumentForm(!showDocumentForm)} className="ml-add-btn">
                {showDocumentForm ? "Cancelar" : "+ Adicionar Documento"}
              </button>
            </div>

            {showDocumentForm && (
              <form onSubmit={handleCreateDocument} className="ml-form">
                <div className="ml-field">
                  <label>Tipo (opcional)</label>
                  <input
                    type="text"
                    placeholder="Contrato, Fatura, Certificado..."
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                  />
                </div>
                <div className="ml-field">
                  <label>Arquivo *</label>
                  <input
                    type="file"
                    onChange={(e) => setDocumentFile(e.target.files[0])}
                  />
                  {documentErrors.file && <span className="ml-error">{documentErrors.file}</span>}
                </div>
                {documentErrors.submit && <div className="ml-error">{documentErrors.submit}</div>}
                <button type="submit" className="ml-btn" disabled={loading}>
                  {loading ? "A enviar..." : "Enviar Documento"}
                </button>
              </form>
            )}

            <div className="ml-doc-grid">
              {documents.length === 0 ? (
                <p className="ml-empty">Nenhum documento encontrado.</p>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="ml-doc-card">
                    <div className="ml-doc-info">
                      <h3>{doc.fileName || doc.type || 'Documento'}</h3>
                      {doc.type && <p className="ml-doc-type">{doc.type}</p>}
                      <a href={doc.url} target="_blank" rel="noreferrer" className="ml-doc-link">Abrir</a>
                    </div>
                    <div className="ml-item-actions">
                      <button onClick={() => handleDeleteDocument(doc.id)} className="ml-btn-delete">Deletar</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      </div>

      <style>{`
        .ml-bg {
          min-height: 100vh;
          background: #f8fafc;
          padding: 20px;
        }
        .ml-layout {
          width: 100%;
          margin: 0;
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 1100px) {
          .ml-layout {
            grid-template-columns: 1fr;
          }
        }
        .ml-tree-panel {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 16px #0001;
          padding: 16px;
          border: 1px solid #e2e8f0;
        }
        .ml-tree-panel h3 {
          margin-bottom: 12px;
          font-size: 1.1rem;
          color: #1e293b;
        }
        .ml-tree-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .ml-tree-item button {
          width: 100%;
          text-align: left;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px 10px;
          cursor: pointer;
          color: #334155;
          transition: background 0.2s, border-color 0.2s;
        }
        .ml-tree-item button:hover {
          background: #e2e8f0;
        }
        .ml-tree-item.ml-tree-child button {
          padding-left: 18px;
        }
        .ml-tree-item.ml-tree-current button {
          background: #e0e7ff;
          border-color: #c7d2fe;
          font-weight: 700;
        }
        .ml-tree-children-title {
          margin-top: 8px;
          font-size: 0.9rem;
          color: #94a3b8;
        }
        .ml-container {
          width: 100%;
          margin: 0;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 16px #0001;
          padding: 32px;
        }
        .ml-header {
          margin-bottom: 32px;
        }
        .ml-back-btn {
          background: #e2e8f0;
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          cursor: pointer;
          font-size: 0.95rem;
          margin-bottom: 16px;
          transition: background 0.2s;
        }
        .ml-back-btn:hover {
          background: #cbd5e1;
        }
        .ml-title {
          font-size: 2rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 8px;
        }
        .ml-breadcrumb-link {
          background: none;
          border: none;
          color: #2563eb;
          font-size: 2rem;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
          text-decoration: underline;
          transition: color 0.2s;
        }
        .ml-breadcrumb-link:hover {
          color: #1d4ed8;
        }
        .ml-breadcrumb-current {
          color: #1e293b;
        }
        .ml-edit-btn {
          background: #e0e7ff;
          color: #4338ca;
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 600;
          margin-top: 12px;
          transition: background 0.2s;
        }
        .ml-edit-btn:hover {
          background: #c7d2fe;
        }
        .ml-edit-section {
          background: #fff;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 2px 16px #0001;
        }
        .ml-edit-section h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 16px;
        }
        .ml-subtitle {
          color: #64748b;
          font-size: 1.1rem;
        }
        .ml-tabs {
          display: flex;
          gap: 8px;
          border-bottom: 2px solid #e2e8f0;
          margin-bottom: 24px;
        }
        .ml-tab {
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          padding: 12px 24px;
          font-size: 1rem;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: color 0.2s, border-color 0.2s;
        }
        .ml-tab:hover {
          color: #1e293b;
        }
        .ml-tab-active {
          color: #2563eb;
          border-bottom-color: #2563eb;
        }
        .ml-tab-content {
          animation: fadeIn 0.3s;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .ml-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .ml-section-header h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
        }
        .ml-add-btn {
          background: linear-gradient(90deg, #6366f1 0%, #2563eb 100%);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .ml-add-btn:hover {
          transform: scale(1.05);
        }
        .ml-form {
          background: #fff;
          border-radius: 8px;
          padding: 24px;
          margin-bottom: 24px;
          border: 1px solid #e2e8f0;
        }
        .ml-field {
          margin-bottom: 16px;
        }
        .ml-field label {
          display: block;
          font-weight: 600;
          color: #475569;
          margin-bottom: 6px;
          font-size: 0.95rem;
        }
        .ml-field input,
        .ml-field textarea,
        .ml-field select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 1rem;
          background: #fff;
          transition: border 0.2s;
        }
        .ml-field input:focus,
        .ml-field textarea:focus,
        .ml-field select:focus {
          outline: none;
          border-color: #6366f1;
        }
        .ml-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .ml-row .ml-field { flex: 1; }
        @media (max-width: 900px) {
          .ml-row { grid-template-columns: 1fr; }
        }
        .ml-status-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 16px;
        }
        @media (max-width: 900px) {
          .ml-status-row { grid-template-columns: 1fr; }
        }
        .ml-radio-group {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .ml-radio {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: #f8fafc;
          font-size: 0.95rem;
        }
        .ml-error {
          color: #dc2626;
          font-size: 0.875rem;
          margin-top: 4px;
          display: block;
        }
        .ml-btn {
          width: 100%;
          padding: 12px;
          background: linear-gradient(90deg, #6366f1 0%, #2563eb 100%);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: opacity 0.2s;
          margin-top: 8px;
        }
        .ml-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .ml-btn:hover:not(:disabled) {
          opacity: 0.9;
        }
        .ml-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .ml-empty {
          text-align: center;
          color: #94a3b8;
          padding: 40px;
          font-style: italic;
        }
        .ml-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8fafc;
          border-radius: 8px;
          padding: 16px 20px;
          border: 1px solid #e2e8f0;
          transition: box-shadow 0.2s;
        }
        .ml-item:hover {
          box-shadow: 0 2px 8px #0001;
        }
        .ml-item-info h3 {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 4px;
        }
        .ml-item-info p {
          color: #64748b;
          font-size: 0.95rem;
        }
        .ml-status-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 6px;
        }
        .ml-badge {
          background: #e0f2fe;
          color: #0ea5e9;
          border-radius: 999px;
          padding: 4px 10px;
          font-weight: 600;
          font-size: 0.85rem;
          border: 1px solid #bae6fd;
        }
        .ml-date {
          color: #94a3b8;
          font-size: 0.85rem;
        }
        .ml-item-actions {
          display: flex;
          gap: 8px;
        }
        .ml-btn-view,
        .ml-btn-delete {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background 0.2s;
        }
        .ml-btn-view {
          background: #e0e7ff;
          color: #4338ca;
        }
        .ml-btn-view:hover {
          background: #c7d2fe;
        }
        .ml-btn-delete {
          background: #fee2e2;
          color: #dc2626;
        }
        .ml-btn-delete:hover {
          background: #fecaca;
        }
        .ml-btn-incomplete {
          background: #e2e8f0;
          color: #64748b;
          border: none;
          border-radius: 6px;
          padding: 8px 14px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s;
        }
        .ml-btn-incomplete:hover {
          background: #cbd5e1;
        }
        .ml-btn-completed {
          background: #16a34a;
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 8px 14px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s;
        }
        .ml-btn-completed:hover {
          background: #15803d;
        }
        .ml-completed-badge {
          display: inline-block;
          background: #16a34a;
          color: #fff;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          text-align: center;
          line-height: 20px;
          font-size: 0.75rem;
          margin-left: 8px;
        }
        .ml-completion-ratio {
          font-size: 1rem;
          color: #16a34a;
          font-weight: 600;
          margin-top: 8px;
        }
        .ml-sublevel-ratio {
          font-size: 0.9rem;
          color: #16a34a;
          font-weight: 600;
          margin-top: 6px;
        }
        .ml-photo-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
        }
        .ml-photo-section { margin-bottom: 24px; }
        .ml-photo-section-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 12px;
        }
        .ml-photo-card {
          position: relative;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          background: #fff;
          transition: box-shadow 0.2s;
        }
        .ml-photo-card:hover {
          box-shadow: 0 4px 16px #0002;
        }
        .ml-photo-img {
          width: 100%;
          height: 200px;
          object-fit: cover;
        }
        .ml-photo-info {
          padding: 12px;
        }
        .ml-photo-type {
          display: inline-block;
          background: #e0e7ff;
          color: #4338ca;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .ml-photo-info p {
          color: #64748b;
          font-size: 0.9rem;
          margin-top: 6px;
        }
        .ml-btn-delete-photo {
          position: absolute;
          top: 8px;
          right: 8px;
          background: #dc2626;
          color: #fff;
          border: none;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .ml-btn-delete-photo:hover {
          background: #b91c1c;
        }
        .ml-doc-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
        }
        .ml-doc-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .ml-doc-info h3 {
          margin: 0 0 4px 0;
          color: #1e293b;
          font-size: 1rem;
        }
        .ml-doc-type {
          color: #64748b;
          margin: 0 0 6px 0;
          font-size: 0.9rem;
        }
        .ml-doc-link {
          color: #2563eb;
          text-decoration: underline;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
