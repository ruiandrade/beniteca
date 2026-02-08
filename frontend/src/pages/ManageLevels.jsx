import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import * as XLSX from "xlsx";

export default function ManageLevels() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || "sublevels");
  const [work, setWork] = useState(null);
  const [accessDeniedModal, setAccessDeniedModal] = useState(false);
  const [userPermission, setUserPermission] = useState(user?.role === 'A' ? 'W' : null); // 'R', 'W', ou null (para LEVELS)
  const [userPermissionMaterials, setUserPermissionMaterials] = useState(user?.role === 'A' ? 'W' : null);
  const [userPermissionNotes, setUserPermissionNotes] = useState(user?.role === 'A' ? 'W' : null);
  const [userPermissionPhotos, setUserPermissionPhotos] = useState(user?.role === 'A' ? 'W' : null);
  const [userPermissionDocuments, setUserPermissionDocuments] = useState(user?.role === 'A' ? 'W' : null); // 'R', 'W', ou null (para DOCUMENTS)
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [sublevels, setSublevels] = useState([]);
  const [draggingSublevelId, setDraggingSublevelId] = useState(null);
  const [dragOverSublevelId, setDragOverSublevelId] = useState(null);
  const [reorderingSublevels, setReorderingSublevels] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [photos, setPhotos] = useState([]);
  // Equipa moved to dedicated page; remove related local state
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
  const [sublevelStart, setSublevelStart] = useState("");
  const [sublevelEnd, setSublevelEnd] = useState("");
  const [sublevelErrors, setSublevelErrors] = useState({});

  // Formulário de material
  const [materialName, setMaterialName] = useState("");
  const [materialBrand, setMaterialBrand] = useState("");
  const [materialManufacturer, setMaterialManufacturer] = useState("");
  const [materialType, setMaterialType] = useState("");
  const [materialQuantity, setMaterialQuantity] = useState("");
  const [materialUnit, setMaterialUnit] = useState("");
  const [materialEstimated, setMaterialEstimated] = useState("");
  const [materialReal, setMaterialReal] = useState("");
  const [materialDeliveryStatus, setMaterialDeliveryStatus] = useState("Not requested");
  const [materialAssemblyStatus, setMaterialAssemblyStatus] = useState("Not started");
  const [materialPhotoFile, setMaterialPhotoFile] = useState(null);
  const [materialErrors, setMaterialErrors] = useState({});
  const materialPhotoInputRef = useRef(null);

  // Import/export hierarchy via Excel
  const [importingHierarchy, setImportingHierarchy] = useState(false);
  const fileInputRef = useRef(null);

  // Formulário de nota
  const [noteText, setNoteText] = useState("");
  const [noteErrors, setNoteErrors] = useState({});

  // Formulário de documento
  const [documentFile, setDocumentFile] = useState(null);
  const [documentType, setDocumentType] = useState("");
  const [documentErrors, setDocumentErrors] = useState({});

  // Formulário de foto
  const [photoFile, setPhotoFile] = useState(null);
  const [photoType, setPhotoType] = useState("issue");
  const [photoDesc, setPhotoDesc] = useState("");
  const [photoRole, setPhotoRole] = useState("B");
  const [photoErrors, setPhotoErrors] = useState({});
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Estado para editar detalhes do nível atual
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editCover, setEditCover] = useState(null);
  const [editConstructionManagerId, setEditConstructionManagerId] = useState("");
  const [editSiteDirectorId, setEditSiteDirectorId] = useState("");
  const [editErrors, setEditErrors] = useState({});
  const [managers, setManagers] = useState([]);

  // Estado para mover level (mudar parentId)
  const [moveMode, setMoveMode] = useState(false);
  const [newParentId, setNewParentId] = useState("");
  const [levelTree, setLevelTree] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [moveErrors, setMoveErrors] = useState({});

  // Estado para clonar level (criar nova hierarquia)
  const [cloneMode, setCloneMode] = useState(false);
  const [cloneParentId, setCloneParentId] = useState("");
  const [cloneTree, setCloneTree] = useState(null);
  const [cloneExpandedNodes, setCloneExpandedNodes] = useState(new Set());
  const [cloneErrors, setCloneErrors] = useState({});

  // Estado para editar material
  const [editingMaterial, setEditingMaterial] = useState(null);

  // Estado para filtro de tipo de material
  const [materialTypeFilter, setMaterialTypeFilter] = useState("");

  // Estado para expandir/colapsar seção de importação Excel
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [showExcelImportMaterials, setShowExcelImportMaterials] = useState(false);

  // Estado para tab "Todos os Anexos"
  const [allContents, setAllContents] = useState({ materials: [], photos: [], documents: [], counts: { materials: 0, photos: 0, documents: 0 } });
  const [contentsFilter, setContentsFilter] = useState('all'); // 'all', 'materials', 'photos', 'documents'
  const [contentsSearch, setContentsSearch] = useState('');
  const [contentsOffset, setContentsOffset] = useState(0);
  const [contentsLoading, setContentsLoading] = useState(false);

  // Estado para seleção múltipla de subníveis
  const [selectedSublevels, setSelectedSublevels] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  // Estado para modal de notificação
  const [modal, setModal] = useState({ type: null, title: '', message: '', onConfirm: null });

  // Helper para confirmação com modal
  const confirmWithModal = (title, message, onConfirm) => {
    setModal({
      type: 'confirm',
      title,
      message,
      onConfirm,
    });
  };

  // Helpers: hierarchy operations (complete/reopen) cascading upwards
  const fetchLevelById = async (levelId) => {
    const res = await fetch(`/api/levels/${levelId}`);
    if (!res.ok) return null;
    return await res.json();
  };

  // Retorna ids de todos os ancestrais até a raiz (exclui o próprio levelId)
  const fetchAncestorIds = async (levelId) => {
    const ancestors = [];
    let current = await fetchLevelById(levelId);
    while (current && current.parentId) {
      ancestors.push(current.parentId);
      current = await fetchLevelById(current.parentId);
    }
    return ancestors;
  };

  const fetchChildren = async (parentId) => {
    const res = await fetch(`/api/levels?parentId=${parentId}`);
    if (!res.ok) return [];
    return await res.json();
  };

  const setLevelStatus = async (levelId, status) => {
    let payload = { status };
    if (status === 'completed') {
      payload = { status, closedBy: user?.id };
    } else if (status === 'active') {
      payload = { status, closedBy: null };
    }

    const res = await fetch(`/api/levels/${levelId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error('Erro ao alterar estado de conclusão');
    }
  };

  // If all children of ancestor are completed, complete ancestor, then check its parent (cascade up)
  const cascadeCompleteUpFrom = async (levelId) => {
    const level = await fetchLevelById(levelId);
    if (!level || !level.parentId) return;
    let currentParentId = level.parentId;
    // Walk up while each ancestor qualifies to be completed
    while (currentParentId) {
      const siblings = await fetchChildren(currentParentId);
      const allCompleted = siblings.length === 0 ? true : siblings.every(s => s.status === 'completed');
      if (allCompleted) {
        await setLevelStatus(currentParentId, 'completed');
        const parentLevel = await fetchLevelById(currentParentId);
        currentParentId = parentLevel?.parentId || null;
      } else {
        break;
      }
    }
  };

  // When reopening a child, mark all ancestors as not completed (cascade up)
  const cascadeReopenUpFrom = async (levelId) => {
    const ancestors = await fetchAncestorIds(levelId);
    for (const ancestorId of ancestors) {
      await setLevelStatus(ancestorId, 'active');
    }
  };

  useEffect(() => {
    fetchWork();
    fetchSublevels();
    fetchMaterials();
    fetchDocuments();
    fetchNotes();
    fetchPhotos();
    buildBreadcrumb();
  }, [id]);

  // Update activeTab when URL search params change
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Fetch all contents when "Todos os Anexos" tab is active and work is root
  useEffect(() => {
    if (activeTab === 'allContents' && work && !work.parentId) {
      fetchAllContents();
    }
  }, [activeTab, work, contentsFilter, contentsSearch, contentsOffset]);

  const checkAccess = async (levelId) => {
    // Admin sempre tem acesso
    if (user?.role === 'A') return true;

    // Para non-admin, verificar se tem permissão na obra raiz
    try {
      // Encontrar a obra raiz
      let currentId = levelId;
      let rootId = levelId;
      for (let i = 0; i < 100; i++) {
        const res = await fetch(`/api/levels/${currentId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) break;
        const data = await res.json();
        rootId = currentId;
        if (!data.parentId) break;
        currentId = data.parentId;
      }

      // Verificar se o user tem acesso a essa obra raiz
      const accessRes = await fetch(`/api/permissions/work/${rootId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!accessRes.ok) return false;
      const perm = await accessRes.json();
      return perm && perm.permissionLevel;
    } catch (err) {
      console.error('Erro ao verificar acesso:', err);
      return false;
    }
  };

  const fetchWork = async () => {
    try {
      const res = await fetch(`/api/levels/${id}`);
      if (res.ok) {
        const data = await res.json();
        
        // Verificar acesso
        const hasAccess = await checkAccess(id);
        if (!hasAccess) {
          setAccessDeniedModal(true);
          return;
        }

        // Buscar permissão do user para LEVELS nesta obra
        await fetchUserPermission(id);
        
        // Buscar permissão do user para MATERIALS nesta obra
        await fetchObjectTypePermission(id, 'MATERIALS', setUserPermissionMaterials);
        
        // Buscar permissões para outros object types
        await fetchObjectTypePermission(id, 'NOTES', setUserPermissionNotes);
        await fetchObjectTypePermission(id, 'PHOTOS', setUserPermissionPhotos);
        await fetchObjectTypePermission(id, 'DOCUMENTS', setUserPermissionDocuments);

        setWork(data);
        setEditName(data.name || "");
        setEditDesc(data.description || "");
        setEditStart(data.startDate ? data.startDate.split('T')[0] : "");
        setEditEnd(data.endDate ? data.endDate.split('T')[0] : "");
        // Set default dates for sublevel form
        setSublevelStart(data.startDate ? data.startDate.split('T')[0] : "");
        setSublevelEnd(data.endDate ? data.endDate.split('T')[0] : "");
        // Set director IDs
        setEditConstructionManagerId(data.constructionManagerId || "");
        setEditSiteDirectorId(data.siteDirectorId || "");
        // Set director IDs
        setEditConstructionManagerId(data.constructionManagerId || "");
        setEditSiteDirectorId(data.siteDirectorId || "");
      }
    } catch (err) {
      console.error("Erro ao carregar obra:", err);
    }
  };

  const fetchUserPermission = async (levelId) => {
    await fetchObjectTypePermission(levelId, 'LEVELS', setUserPermission);
  };

  const fetchObjectTypePermission = async (levelId, objectType, setPermissionState) => {
    // Admin sempre tem Write
    if (user?.role === 'A') {
      setPermissionState('W');
      return;
    }

    try {
      // Encontrar a obra raiz
      let currentId = levelId;
      let rootId = levelId;
      for (let i = 0; i < 100; i++) {
        const res = await fetch(`/api/levels/${currentId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) break;
        const data = await res.json();
        rootId = currentId;
        if (!data.parentId) break;
        currentId = data.parentId;
      }

      // Buscar permissão para objectType
      const res = await fetch(`/api/permissions/work/${rootId}?objectType=${objectType}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const perm = await res.json();
        setPermissionState(perm?.permissionLevel || 'R');
      } else {
        setPermissionState('R');
      }
    } catch (err) {
      console.error(`Erro ao buscar permissão para ${objectType}:`, err);
      setPermissionState('R');
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
        
        // Fetch children count for each sublevel (excluding hidden)
        const enrichedData = await Promise.all(
          data.map(async (sub) => {
            const childrenRes = await fetch(`/api/levels?parentId=${sub.id}`);
            if (childrenRes.ok) {
              const children = await childrenRes.json();
              const visibleChildren = children.filter(c => !c.hidden);
              const completedChildren = visibleChildren.filter(c => c.status === 'completed').length;
              return { ...sub, childrenCount: visibleChildren.length, completedChildren };
            }
            return { ...sub, childrenCount: 0, completedChildren: 0 };
          })
        );
        
        const sortedData = [...enrichedData].sort((a, b) => {
          const orderA = a.order ?? a.id;
          const orderB = b.order ?? b.id;
          if (orderA === orderB) return a.id - b.id;
          return orderA - orderB;
        });

        setSublevels(sortedData);
        const completed = sortedData.filter(sub => sub.status === 'completed').length;
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
        const nextNotes = data.notes || "";
        setNotes([{ id: data.id, description: nextNotes }]);
        setNoteText(nextNotes);
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

  const fetchAllContents = async () => {
    setContentsLoading(true);
    try {
      const types = contentsFilter === 'all' ? 'materials,photos,documents' 
        : contentsFilter === 'materials' ? 'materials'
        : contentsFilter === 'photos' ? 'photos'
        : 'documents';
      
      const params = new URLSearchParams({
        types,
        limit: 50,
        offset: contentsOffset
      });
      if (contentsSearch) params.set('q', contentsSearch);

      const res = await fetch(`/api/levels/${id}/contents?${params}`);
      if (!res.ok) throw new Error('Erro ao carregar anexos');
      const data = await res.json();
      
      if (contentsOffset === 0) {
        setAllContents(data);
      } else {
        // Append for pagination
        setAllContents(prev => ({
          materials: [...prev.materials, ...data.materials],
          photos: [...prev.photos, ...data.photos],
          documents: [...prev.documents, ...data.documents],
          counts: data.counts
        }));
      }
    } catch (err) {
      console.error('Erro ao carregar todos os anexos:', err);
      setModal({
        type: 'error',
        title: 'Erro',
        message: err.message,
        onConfirm: null
      });
    } finally {
      setContentsLoading(false);
    }
  };
  
  // Equipa-related handlers removed; handled in Equipa page

  const buildReorderedSublevels = (draggedId, targetId) => {
    const dragged = sublevels.find((s) => s.id === draggedId);
    const target = sublevels.find((s) => s.id === targetId);
    if (!dragged || !target) return { nextSublevels: sublevels, orderedIds: sublevels.map((s) => s.id) };

    const filtered = sublevels.filter((s) => s.id !== draggedId);
    const targetIndex = filtered.findIndex((s) => s.id === targetId);
    const merged = [...filtered.slice(0, targetIndex + 1), dragged, ...filtered.slice(targetIndex + 1)];

    const orderedIds = merged.map((item) => item.id);
    return { nextSublevels: merged, orderedIds };
  };

  const handleDropOnSublevel = async (targetId) => {
    if (!draggingSublevelId || draggingSublevelId === targetId) {
      setDraggingSublevelId(null);
      setDragOverSublevelId(null);
      return;
    }

    const result = buildReorderedSublevels(draggingSublevelId, targetId);
    if (!result) {
      setDraggingSublevelId(null);
      setDragOverSublevelId(null);
      return;
    }

    const { nextSublevels, orderedIds } = result;
    setSublevels(nextSublevels);
    setReorderingSublevels(true);

    try {
      const res = await fetch('/api/levels/reorder', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ parentId: id, orderedIds }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Erro ao guardar ordem');
      }
    } catch (err) {
      alert(`Erro ao reordenar níveis: ${err.message}`);
      await fetchSublevels();
    } finally {
      setDraggingSublevelId(null);
      setDragOverSublevelId(null);
      setReorderingSublevels(false);
    }
  };

  const handleDragEndSublevel = () => {
    setDraggingSublevelId(null);
    setDragOverSublevelId(null);
  };

  const handleCreateSublevel = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!sublevelName.trim()) errors.name = "Nome é obrigatório";
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
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: sublevelName,
          description: sublevelDesc,
          coverImage: url,
          parentId: id,
          startDate: sublevelStart || null,
          endDate: sublevelEnd || null,
        }),
      });
      if (!res.ok) throw new Error("Erro ao criar subnível");
      
      // Se o nível atual ou algum ancestral estava concluído, reabrir todos
      const ancestors = await fetchAncestorIds(id);
      const targetsToReopen = work?.status === 'completed' ? [id, ...ancestors] : ancestors;
      for (const ancestorId of targetsToReopen) {
        await fetch(`/api/levels/${ancestorId}`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ status: 'active', closedBy: null }),
        });
      }
      
      await fetchSublevels();
      await fetchWork();
      setSublevelName("");
      setSublevelDesc("");
      setSublevelCover(null);
      setSublevelStart(work?.startDate ? work.startDate.split('T')[0] : "");
      setSublevelEnd(work?.endDate ? work.endDate.split('T')[0] : "");
      setShowSublevelForm(false);
      setSublevelErrors({});
      setModal({
        type: 'success',
        title: 'Sucesso',
        message: 'Subnível criado com sucesso!',
        onConfirm: null,
      });
    } catch (err) {
      setSublevelErrors({ submit: err.message });
      setModal({
        type: 'error',
        title: 'Erro ao Criar Subnível',
        message: err.message,
        onConfirm: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSublevel = async (sublevelId) => {
    confirmWithModal(
      'Ocultar Subnível',
      'Tem certeza que deseja ocultar este subnível? Pode ser mostrado novamente a qualquer momento.',
      async () => {
        try {
          const res = await fetch(`/api/levels/${sublevelId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ hidden: true }),
          });
          if (res.ok) {
            await fetchSublevels();
            setModal({
              type: 'success',
              title: 'Sucesso',
              message: 'Subnível ocultado com sucesso!',
              onConfirm: null,
            });
          } else {
            throw new Error('Erro ao ocultar subnível');
          }
        } catch (err) {
          setModal({
            type: 'error',
            title: 'Erro',
            message: 'Erro ao ocultar subnível',
            onConfirm: null,
          });
        }
      }
    );
  };

  // Função para contar todos os níveis leaf (sem filhos) recursivamente
  const countLeafNodes = async (levelIds) => {
    let leafCount = 0;
    
    const countRecursive = async (levelId) => {
      const res = await fetch(`/api/levels?parentId=${levelId}`);
      if (!res.ok) return;
      const children = await res.json();
      
      if (children.length === 0) {
        // É leaf node
        leafCount++;
      } else {
        // Tem filhos, contar recursivamente
        await Promise.all(children.map(child => countRecursive(child.id)));
      }
    };
    
    await Promise.all(levelIds.map(id => countRecursive(id)));
    return leafCount;
  };

  // Função para apagar múltiplos subníveis
  const handleDeleteSelectedSublevels = async () => {
    if (selectedSublevels.size === 0) {
      setModal({
        type: 'error',
        title: 'Erro',
        message: 'Nenhum subnível selecionado.',
        onConfirm: null,
      });
      return;
    }

    setLoading(true);
    try {
      // Contar níveis leaf que serão apagados
      const leafCount = await countLeafNodes(Array.from(selectedSublevels));
      
      confirmWithModal(
        'Apagar Subníveis Selecionados',
        `Tem certeza que deseja apagar ${selectedSublevels.size} subnível(s) selecionado(s)?\n\n⚠️ ATENÇÃO: Esta operação irá apagar ${leafCount} nível(eis) final(is) e toda a sua descendência de forma PERMANENTE.\n\nEsta ação não pode ser revertida.`,
        async () => {
          setLoading(true);
          let successCount = 0;
          let errorCount = 0;
          
          for (const sublevelId of selectedSublevels) {
            try {
              const res = await fetch(`/api/levels/${sublevelId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              if (res.ok) {
                successCount++;
              } else {
                errorCount++;
              }
            } catch (err) {
              errorCount++;
            }
          }
          
          setLoading(false);
          setSelectedSublevels(new Set());
          setSelectionMode(false);
          await fetchSublevels();
          
          if (errorCount === 0) {
            setModal({
              type: 'success',
              title: 'Sucesso',
              message: `${successCount} subnível(is) apagado(s) com sucesso!`,
              onConfirm: null,
            });
          } else {
            setModal({
              type: 'error',
              title: 'Erro Parcial',
              message: `${successCount} subnível(is) apagado(s), mas ${errorCount} falharam.`,
              onConfirm: null,
            });
          }
        }
      );
    } catch (err) {
      setModal({
        type: 'error',
        title: 'Erro',
        message: 'Erro ao contar níveis a apagar.',
        onConfirm: null,
      });
    } finally {
      setLoading(false);
    }
  };

  // Toggle seleção de um subnível
  const toggleSublevelSelection = (sublevelId) => {
    const next = new Set(selectedSublevels);
    if (next.has(sublevelId)) {
      next.delete(sublevelId);
    } else {
      next.add(sublevelId);
    }
    setSelectedSublevels(next);
  };

  // Selecionar/desselecionar todos
  const toggleSelectAll = () => {
    if (selectedSublevels.size === sublevels.length) {
      setSelectedSublevels(new Set());
    } else {
      setSelectedSublevels(new Set(sublevels.map(s => s.id)));
    }
  };

  const handleShowSublevel = async (sublevelId) => {
    try {
      const res = await fetch(`/api/levels/${sublevelId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ hidden: false }),
      });
      if (res.ok) {
        await fetchSublevels();
        setModal({
          type: 'success',
          title: 'Sucesso',
          message: 'Subnível mostrado com sucesso!',
          onConfirm: null,
        });
      } else {
        throw new Error('Erro ao mostrar subnível');
      }
    } catch (err) {
      setModal({
        type: 'error',
        title: 'Erro',
        message: 'Erro ao mostrar subnível',
        onConfirm: null,
      });
    }
  };

  const handleRemoveSublevel = async (sublevelId) => {
    confirmWithModal(
      'Remover Subnível Permanentemente',
      'ATENÇÃO: Esta ação é irreversível! Tem certeza que deseja remover este subnível e toda a sua hierarquia descendente permanentemente?',
      async () => {
        try {
          const res = await fetch(`/api/levels/${sublevelId}`, {
            method: "DELETE",
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.ok) {
            await fetchSublevels();
            setModal({
              type: 'success',
              title: 'Sucesso',
              message: 'Subnível removido permanentemente!',
              onConfirm: null,
            });
          } else {
            throw new Error('Erro ao remover subnível');
          }
        } catch (err) {
          setModal({
            type: 'error',
            title: 'Erro',
            message: 'Erro ao remover subnível',
            onConfirm: null,
          });
        }
      }
    );
  };

  const handleToggleComplete = async (sublevelId, currentStatus) => {
    const title = currentStatus ? "Marcar como Não Concluído" : "Marcar como Concluído";
    
    // Se tentando marcar como concluído, verificar se há filhos por encerrar
    if (!currentStatus) {
      const childrenRes = await fetch(`/api/levels?parentId=${sublevelId}`);
      if (childrenRes.ok) {
        const children = await childrenRes.json();
        const incompletedChildren = children.filter(c => c.status !== 'completed');
        
        if (incompletedChildren.length > 0) {
          setModal({
            type: 'error',
            title: 'Não é Possível Encerrar',
            message: `Este nível ainda tem ${incompletedChildren.length} filho(s) por encerrar. Encerre todos os filhos antes de encerrar o pai.`,
            onConfirm: null,
          });
          return;
        }
      }
    }
    
    const message = currentStatus 
      ? "Tem certeza que deseja marcar como não concluído?" 
      : "Tem certeza que deseja marcar como concluído?";
    
    confirmWithModal(title, message, async () => {
      try {
        const nextStatus = currentStatus ? 'active' : 'completed';
        await setLevelStatus(sublevelId, nextStatus);

        if (sublevelId == id) {
          await fetchWork();
        }
        
        // Se marcou como concluído, verificar se pode marcar o pai também
        if (!currentStatus) {
          // Cascade: se todos os irmãos concluídos, completa pai e continua a subir
          await cascadeCompleteUpFrom(sublevelId);
        } else {
          // Se reabriu, garantir que todos os ancestrais ficam como não concluídos
          await cascadeReopenUpFrom(sublevelId);
        }
        
        await fetchSublevels();
        await fetchWork();
        setModal({
          type: 'success',
          title: 'Sucesso',
          message: currentStatus ? 'Marcado como não concluído!' : 'Marcado como concluído!',
          onConfirm: null,
        });
      } catch (err) {
        setModal({
          type: 'error',
          title: 'Erro',
          message: 'Erro ao alterar estado de conclusão',
          onConfirm: null,
        });
      }
    });
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
      let photoUrl = null;
      
      // Upload photo if provided
      if (materialPhotoFile) {
        const formData = new FormData();
        const renamed = new File([materialPhotoFile], `${id}-${Date.now()}-material-${materialPhotoFile.name}`, { type: materialPhotoFile.type });
        formData.append("file", renamed);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Erro ao fazer upload da foto");
        const { url } = await uploadRes.json();
        photoUrl = url;
      }

      const description = materialUnit.trim() ? `${materialName} (${materialUnit})` : materialName;
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          brand: materialBrand || null,
          manufacturer: materialManufacturer || null,
          type: materialType || null,
          quantity: parseFloat(materialQuantity),
          estimatedValue: materialEstimated ? parseFloat(materialEstimated) : null,
          realValue: materialReal ? parseFloat(materialReal) : null,
          deliveryStatus: materialDeliveryStatus,
          assemblyStatus: materialAssemblyStatus,
          photoUrl,
          levelId: id,
        }),
      });
      if (!res.ok) throw new Error("Erro ao criar material");
      await fetchMaterials();
      setMaterialName("");
      setMaterialBrand("");
      setMaterialManufacturer("");
      setMaterialType("");
      setMaterialQuantity("");
      setMaterialUnit("");
      setMaterialEstimated("");
      setMaterialReal("");
      setMaterialPhotoFile(null);
      setMaterialDeliveryStatus("Not requested");
      setMaterialAssemblyStatus("Not started");
      setShowMaterialForm(false);
      setMaterialErrors({});
      if (materialPhotoInputRef.current) materialPhotoInputRef.current.value = "";
    } catch (err) {
      setMaterialErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  };

  const downloadHierarchyTemplate = () => {
    const template = [
      {
        "Path": "Fase 1",
        "Description (optional)": "",
        "Start Date (YYYY-MM-DD)": "2025-01-10",
        "End Date (YYYY-MM-DD)": "2025-02-10"
      },
      {
        "Path": "Fase 1/Fundação",
        "Description (optional)": "",
        "Start Date (YYYY-MM-DD)": "2025-01-12",
        "End Date (YYYY-MM-DD)": "2025-01-25"
      },
      {
        "Path": "Fase 1/Fundação/Betonagem",
        "Description (optional)": "",
        "Start Date (YYYY-MM-DD)": "2025-01-15",
        "End Date (YYYY-MM-DD)": "2025-01-18"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hierarquia");
    XLSX.writeFile(workbook, "hierarquia-template.xlsx");
  };

  const parseHierarchyFile = async (file) => {
    setImportingHierarchy(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });

      const entries = rows
        .map((row) => ({
          path: String(row["Path"] || "").trim(),
          description: String(row["Description (optional)"] || "").trim(),
          startDate: String(row["Start Date (YYYY-MM-DD)"] || "").trim(),
          endDate: String(row["End Date (YYYY-MM-DD)"] || "").trim(),
        }))
        .filter((r) => r.path.length > 0);

      if (entries.length === 0) {
        setModal({
          type: 'error',
          title: 'Ficheiro Vazio',
          message: 'O ficheiro está vazio ou sem coluna Path',
          onConfirm: null,
        });
        return;
      }

      // Send all entries in one request for transactional processing
      const res = await fetch("/api/levels/hierarchy/import-excel", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          rootId: parseInt(id, 10),
          entries: entries,
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(`Erro ao importar hierarquia: ${msg}`);
      }

      await fetchSublevels();
      setModal({
        type: 'success',
        title: 'Sucesso',
        message: 'Hierarquia criada com sucesso!',
        onConfirm: null,
      });
    } catch (err) {
      setModal({
        type: 'error',
        title: 'Erro ao Importar',
        message: err.message,
        onConfirm: null,
      });
    } finally {
      setImportingHierarchy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const [importingMaterials, setImportingMaterials] = useState(false);
  const materialFileInputRef = useRef(null);

  const downloadMaterialsTemplate = () => {
    const template = [
      {
        "Description": "Cimento Portland",
        "Quantity": 100,
        "Unit": "kg",
        "Brand": "Lafarge",
        "Manufacturer": "Lafarge",
        "Type": "CP II",
        "Estimated Value (€)": 500,
        "Real Value (€)": "",
        "Delivery Status": "Not requested",
        "Assembly Status": "Not started"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    
    // Add column widths
    worksheet['!cols'] = [
      { wch: 20 },
      { wch: 12 },
      { wch: 10 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 16 },
      { wch: 14 },
      { wch: 18 },
      { wch: 16 }
    ];

    // Add instructions as a comment in header row
    const deliveryComment = "Opções: Not requested | Requested | Delivered";
    const assemblyComment = "Opções: Not started | Started | Finished";
    
    if (!worksheet['I1']) worksheet['I1'] = { t: 's', v: 'Delivery Status' };
    if (!worksheet['J1']) worksheet['J1'] = { t: 's', v: 'Assembly Status' };
    
    worksheet['I1'].c = [{ a: 'User', t: deliveryComment, r: deliveryComment }];
    worksheet['J1'].c = [{ a: 'User', t: assemblyComment, r: assemblyComment }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Materiais");
    XLSX.writeFile(workbook, "materiais-template.xlsx");
  };

  const parseMaterialsFile = async (file) => {
    setImportingMaterials(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });

      const deliveryStatusOptions = ["Not requested", "Requested", "Delivered"];
      const assemblyStatusOptions = ["Not started", "Started", "Finished"];

      const materials = rows
        .map((row, idx) => {
          const desc = String(row["Description"] || "").trim();
          const qty = parseFloat(row["Quantity"] || 0);
          const delivery = String(row["Delivery Status"] || "Not requested").trim();
          const assembly = String(row["Assembly Status"] || "Not started").trim();

          // Validate delivery status
          if (!deliveryStatusOptions.includes(delivery)) {
            throw new Error(`Linha ${idx + 2}: Delivery Status "${delivery}" inválido. Use: ${deliveryStatusOptions.join(", ")}`);
          }

          // Validate assembly status
          if (!assemblyStatusOptions.includes(assembly)) {
            throw new Error(`Linha ${idx + 2}: Assembly Status "${assembly}" inválido. Use: ${assemblyStatusOptions.join(", ")}`);
          }

          return {
            description: desc,
            quantity: qty,
            unit: String(row["Unit"] || "").trim(),
            brand: String(row["Brand"] || "").trim(),
            manufacturer: String(row["Manufacturer"] || "").trim(),
            type: String(row["Type"] || "").trim(),
            estimatedValue: row["Estimated Value (€)"] ? parseFloat(row["Estimated Value (€)"]) : null,
            realValue: row["Real Value (€)"] ? parseFloat(row["Real Value (€)"]) : null,
            deliveryStatus: delivery,
            assemblyStatus: assembly,
          };
        })
        .filter((m) => m.description.length > 0 && m.quantity > 0);

      if (materials.length === 0) {
        setModal({
          type: 'error',
          title: 'Ficheiro Inválido',
          message: 'O ficheiro está vazio ou sem colunas obrigatórias',
          onConfirm: null,
        });
        return;
      }

      for (const mat of materials) {
        const res = await fetch("/api/materials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: mat.unit.trim() ? `${mat.description} (${mat.unit})` : mat.description,
            quantity: mat.quantity,
            estimatedValue: mat.estimatedValue,
            realValue: mat.realValue,
            deliveryStatus: mat.deliveryStatus,
            assemblyStatus: mat.assemblyStatus,
            brand: mat.brand || null,
            manufacturer: mat.manufacturer || null,
            type: mat.type || null,
            levelId: id,
          }),
        });
        if (!res.ok) {
          throw new Error(`Erro ao criar material ${mat.description}`);
        }
      }

      await fetchMaterials();
      setModal({
        type: 'success',
        title: 'Sucesso',
        message: `${materials.length} material(is) criado(s) com sucesso!`,
        onConfirm: null,
      });
    } catch (err) {
      setModal({
        type: 'error',
        title: 'Erro ao Importar Materiais',
        message: err.message,
        onConfirm: null,
      });
    } finally {
      setImportingMaterials(false);
      if (materialFileInputRef.current) materialFileInputRef.current.value = "";
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    confirmWithModal(
      'Deletar Material',
      'Tem certeza que deseja deletar este material?',
      async () => {
        try {
          const res = await fetch(`/api/materials/${materialId}`, {
            method: "DELETE",
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.ok) {
            await fetchMaterials();
            setModal({
              type: 'success',
              title: 'Sucesso',
              message: 'Material deletado com sucesso!',
              onConfirm: null,
            });
          } else {
            throw new Error('Erro ao deletar material');
          }
        } catch (err) {
          setModal({
            type: 'error',
            title: 'Erro',
            message: 'Erro ao deletar material',
            onConfirm: null,
          });
        }
      }
    );
  };

  const handleUpdateMaterial = async (mat) => {
    setLoading(true);
    try {
      let photoUrl = mat.photoUrl;
      
      // Upload new photo if provided
      if (mat.photoFile && mat.photoFile instanceof File) {
        const formData = new FormData();
        const renamed = new File([mat.photoFile], `${id}-${Date.now()}-material-${mat.photoFile.name}`, { type: mat.photoFile.type });
        formData.append("file", renamed);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Erro ao fazer upload da foto");
        const { url } = await uploadRes.json();
        photoUrl = url;
      }

      const res = await fetch(`/api/materials/${mat.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          description: mat.description,
          brand: mat.brand || null,
          manufacturer: mat.manufacturer || null,
          type: mat.type || null,
          quantity: parseFloat(mat.quantity),
          estimatedValue: mat.estimatedValue ? parseFloat(mat.estimatedValue) : null,
          realValue: mat.realValue ? parseFloat(mat.realValue) : null,
          deliveryStatus: mat.deliveryStatus,
          assemblyStatus: mat.assemblyStatus,
          photoUrl,
          levelId: id,
        }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar material");
      await fetchMaterials();
      setEditingMaterial(null);
    } catch (err) {
      setModal({
        type: 'error',
        title: 'Erro ao Atualizar Material',
        message: err.message,
        onConfirm: null,
      });
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

  // Equipa-related handlers removed; handled in Equipa page

  const handleDeleteDocument = async (docId) => {
    confirmWithModal(
      'Deletar Documento',
      'Tem certeza que deseja deletar este documento?',
      async () => {
        try {
          const res = await fetch(`/api/documents/${docId}`, {
            method: "DELETE",
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.ok) {
            await fetchDocuments();
            setModal({
              type: 'success',
              title: 'Sucesso',
              message: 'Documento deletado com sucesso!',
              onConfirm: null,
            });
          } else {
            throw new Error('Erro ao deletar documento');
          }
        } catch (err) {
          setModal({
            type: 'error',
            title: 'Erro',
            message: 'Erro ao deletar documento',
            onConfirm: null,
          });
        }
      }
    );
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
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes: noteText }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar nota");
      await fetchNotes();
      setShowNoteForm(false);
      setNoteErrors({});
    } catch (err) {
      setNoteErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async (e) => {
    e.preventDefault();
    if (userPermissionNotes === 'R') return;
    const errors = {};
    if (!noteText.trim()) errors.text = "Texto é obrigatório";
    setNoteErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/levels/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes: noteText }),
      });
      if (!res.ok) throw new Error("Erro ao salvar notas");
      await fetchNotes();
      setNoteErrors({});
    } catch (err) {
      setNoteErrors({ submit: err.message });
      setModal({
        type: 'error',
        title: 'Erro',
        message: 'Erro ao salvar notas',
        onConfirm: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    confirmWithModal(
      'Deletar Nota',
      'Tem certeza que deseja deletar esta nota?',
      async () => {
        try {
          const res = await fetch(`/api/permissions/${noteId}`, {
            method: "DELETE",
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.ok) {
            await fetchNotes();
            setModal({
              type: 'success',
              title: 'Sucesso',
              message: 'Nota deletada com sucesso!',
              onConfirm: null,
            });
          } else {
            throw new Error('Erro ao deletar nota');
          }
        } catch (err) {
          setModal({
            type: 'error',
            title: 'Erro',
            message: 'Erro ao deletar nota',
            onConfirm: null,
          });
        }
      }
    );
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
          role: photoRole,
          levelId: id,
          observacoes: photoDesc || null,
        }),
      });
      if (!res.ok) throw new Error("Erro ao criar foto");
      await fetchPhotos();
      setPhotoFile(null);
      setPhotoType("issue");
      setPhotoRole("B");
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
    confirmWithModal(
      'Deletar Foto',
      'Tem certeza que deseja deletar esta foto?',
      async () => {
        try {
          const res = await fetch(`/api/photos/${photoId}`, {
            method: "DELETE",
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.ok) {
            await fetchPhotos();
            setModal({
              type: 'success',
              title: 'Sucesso',
              message: 'Foto deletada com sucesso!',
              onConfirm: null,
            });
          } else {
            throw new Error('Erro ao deletar foto');
          }
        } catch (err) {
          setModal({
            type: 'error',
            title: 'Erro',
            message: 'Erro ao deletar foto',
            onConfirm: null,
          });
        }
      }
    );
  };

  const handleTogglePhotoRole = async (photoId, currentRole) => {
    const newRole = currentRole === 'B' ? 'C' : 'B';
    try {
      const res = await fetch(`/api/photos/${photoId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) await fetchPhotos();
      else setModal({
        type: 'error',
        title: 'Erro',
        message: 'Erro ao alterar visibilidade',
        onConfirm: null,
      });
    } catch (err) {
      setModal({
        type: 'error',
        title: 'Erro ao Alterar Visibilidade',
        message: err.message,
        onConfirm: null,
      });
    }
  };

  const handleOpenEditMode = async () => {
    try {
      const res = await fetch('/api/users/managers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setManagers(data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar managers:', err);
    }
    setEditMode(true);
  };

  const handleCloseEditMode = () => {
    setEditMode(false);
    setEditConstructionManagerId("");
    setEditSiteDirectorId("");
    setEditErrors({});
  };

  const handleUpdateLevel = async () => {
    const errors = {};
    if (!editName.trim()) errors.name = "Nome é obrigatório";
    // Descrição agora é opcional

    // Validar datas contra o pai se houver
    if (work && work.parentId && (editStart || editEnd)) {
      try {
        const parentRes = await fetch(`/api/levels/${work.parentId}`);
        if (parentRes.ok) {
          const parent = await parentRes.json();
          if (parent.startDate && editStart && editStart < parent.startDate.slice(0, 10)) {
            errors.startDate = "Não pode começar antes do nível pai";
          }
          if (parent.endDate && editEnd && editEnd > parent.endDate.slice(0, 10)) {
            errors.endDate = "Não pode terminar depois do nível pai";
          }
        }
      } catch (err) {
        console.error('Erro ao validar datas do pai:', err);
      }
    }

    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      let coverUrl = null;
      if (editCover) {
        const formData = new FormData();
        const renamed = new File([editCover], `${id}-${Date.now()}-cover-${editCover.name}`, { type: editCover.type });
        formData.append("file", renamed);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Erro ao fazer upload da imagem");
        const uploadData = await uploadRes.json();
        coverUrl = uploadData.url;
      }

      const payload = {
        name: editName,
        description: editDesc,
        startDate: editStart || null,
        endDate: editEnd || null,
        constructionManagerId: editConstructionManagerId || null,
        siteDirectorId: editSiteDirectorId || null,
      };
      if (coverUrl) payload.coverImage = coverUrl;

      const res = await fetch(`/api/levels/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Erro ao atualizar nível");
      await fetchWork();
      await buildBreadcrumb();
      setEditMode(false);
      setEditCover(null);
      setEditErrors({});
    } catch (err) {
      setEditErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  };

  const buildHierarchyTree = async ({
    excludeCurrentDescendants,
    setTree,
    setExpanded,
    setErrors,
  }) => {
    try {
      if (!work) return;
      // Encontrar a obra mãe (top-level parent) do nível atual
      let topLevelParent = work;
      
      while (topLevelParent.parentId !== null && topLevelParent.parentId !== undefined) {
        const parentRes = await fetch(`/api/levels/${topLevelParent.parentId}`);
        if (!parentRes.ok) break;
        topLevelParent = await parentRes.json();
      }

      // Usar o endpoint de hierarquia otimizado que retorna tudo de uma vez
      const hierarchyRes = await fetch(`/api/levels/${topLevelParent.id}/hierarchy`);
      if (!hierarchyRes.ok) throw new Error('Falha ao carregar hierarquia');
      
      const rawHierarchy = await hierarchyRes.json();
      if (!rawHierarchy) throw new Error('Hierarquia vazia');

      // rawHierarchy já vem no formato correto {level: {...}, children: [...]}
      // Converter a resposta em tree format simples para o renderTreeNode
      const convertToTree = (node) => {
        if (!node || !node.level) return null;
        return {
          id: node.level.id,
          name: node.level.name,
          children: (node.children || []).map(convertToTree).filter(Boolean)
        };
      };

      const tree = convertToTree(rawHierarchy);
      if (!tree) throw new Error('Erro ao converter hierarquia');

      let finalTree = tree;
      if (excludeCurrentDescendants) {
        // Obter IDs de descendentes do level atual para excluir
        const getDescendantIds = (node) => {
          if (!node || !node.level) return [];
          const ids = [];
          if (node.level.id === parseInt(id)) {
            // Este é o nível atual, incluir todos os seus descendentes
            const collectIds = (n) => {
              if (n && n.children) {
                n.children.forEach(child => {
                  if (child && child.level) {
                    ids.push(child.level.id);
                    collectIds(child);
                  }
                });
              }
            };
            collectIds(node);
          } else if (node.children) {
            node.children.forEach(child => {
              const childIds = getDescendantIds(child);
              ids.push(...childIds);
            });
          }
          return ids;
        };

        const descendantIds = [parseInt(id), ...getDescendantIds(rawHierarchy)];

        const filterTree = (node) => {
          if (!node) return null;
          if (node.id === parseInt(id) || descendantIds.includes(node.id)) {
            return null;
          }
          return {
            ...node,
            children: (node.children || []).map(filterTree).filter(Boolean)
          };
        };

        finalTree = filterTree(tree);
        if (!finalTree) throw new Error('Nenhum nó disponível para mover');
      }

      setTree(finalTree);
      setExpanded(new Set([finalTree.id])); // Expandir raiz por padrão
      setErrors({});
    } catch (err) {
      console.error('Erro ao construir árvore:', err);
      setErrors({ fetch: err.message });
    }
  };

  const handleMoveLevel = async () => {
    const errors = {};
    if (!newParentId) {
      errors.parent = "Selecione um nível de destino";
    }

    setMoveErrors(errors);
    if (Object.keys(errors).length > 0) return;

    confirmWithModal(
      'Mover Nível',
      'Tem certeza que deseja mover este nível? Toda a hierarquia descendente será movida junto.',
      async () => {
        setLoading(true);
        try {
          const payload = {
            parentId: parseInt(newParentId)
          };

          const res = await fetch(`/api/levels/${id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload),
          });
          
          if (!res.ok) throw new Error("Erro ao mover nível");
          
          await fetchWork();
          await buildBreadcrumb();
          setMoveMode(false);
          setNewParentId('');
          setMoveErrors({});
          setModal({
            type: 'success',
            title: 'Sucesso',
            message: 'Nível movido com sucesso!',
            onConfirm: null,
          });
          
          // Redirecionar para o nível movido
          window.location.reload();
        } catch (err) {
          setMoveErrors({ submit: err.message });
          setModal({
            type: 'error',
            title: 'Erro',
            message: err.message,
            onConfirm: null,
          });
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const handleOpenMoveMode = async () => {
    setMoveMode(true);
    setCloneMode(false);
    setCloneParentId('');
    setCloneErrors({});
    await buildHierarchyTree({
      excludeCurrentDescendants: true,
      setTree: setLevelTree,
      setExpanded: setExpandedNodes,
      setErrors: setMoveErrors,
    });
  };

  const handleOpenCloneMode = async () => {
    setCloneMode(true);
    setMoveMode(false);
    setNewParentId('');
    setMoveErrors({});
    await buildHierarchyTree({
      excludeCurrentDescendants: false,
      setTree: setCloneTree,
      setExpanded: setCloneExpandedNodes,
      setErrors: setCloneErrors,
    });
  };

  const toggleNode = (nodeId, setExpanded) => {
    setExpanded(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const renderTreeNode = (
    node,
    depth = 0,
    expandedSet,
    setExpanded,
    selectedId,
    setSelectedId
  ) => {
    if (!node) return null;
    
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedSet.has(node.id);
    const isSelected = selectedId === node.id.toString();

    return (
      <div key={node.id} style={{ marginLeft: `${depth * 20}px` }}>
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '4px 6px',
            cursor: 'pointer',
            background: isSelected ? '#dbeafe' : 'transparent',
            borderRadius: '6px',
            marginBottom: '2px',
            border: isSelected ? '2px solid #3b82f6' : '2px solid transparent'
          }}
        >
          {hasChildren && (
            <span 
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id, setExpanded);
              }}
              style={{
                marginRight: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                userSelect: 'none',
                width: '20px',
                fontSize: '0.9rem'
              }}
            >
              {isExpanded ? '−' : '+'}
            </span>
          )}
          {!hasChildren && <span style={{ marginRight: '6px', width: '20px' }}></span>}
          <span 
            onClick={() => setSelectedId(node.id.toString())}
            style={{ flex: 1, fontSize: '0.9rem' }}
          >
            {node.name}
          </span>
        </div>
        {isExpanded && hasChildren && (
          <div>
            {node.children.map(child => renderTreeNode(
              child,
              depth + 1,
              expandedSet,
              setExpanded,
              selectedId,
              setSelectedId
            ))}
          </div>
        )}
      </div>
    );
  };

  const handleCloneLevel = async () => {
    const errors = {};
    if (!cloneParentId) {
      errors.parent = "Selecione um nível de destino";
    }

    setCloneErrors(errors);
    if (Object.keys(errors).length > 0) return;

    confirmWithModal(
      'Clonar Nível',
      'Tem certeza que deseja clonar este nível? Será criado um novo nível com toda a hierarquia descendente (sem fotos, documentos ou notas).',
      async () => {
        setLoading(true);
        try {
          const payload = {
            parentId: parseInt(cloneParentId)
          };

          const res = await fetch(`/api/levels/${id}/clone`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload),
          });

          if (!res.ok) throw new Error("Erro ao clonar nível");

          const result = await res.json();
          setCloneMode(false);
          setCloneParentId('');
          setCloneErrors({});
          setModal({
            type: 'success',
            title: 'Sucesso',
            message: 'Nível clonado com sucesso!',
            onConfirm: null,
          });

          if (result?.id) {
            navigate(`/works/${result.id}/levels`);
          }
        } catch (err) {
          setCloneErrors({ submit: err.message });
          setModal({
            type: 'error',
            title: 'Erro',
            message: err.message,
            onConfirm: null,
          });
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const visibleNotCompleted = sublevels.filter((s) => s.status !== 'completed' && !s.hidden);
  const visibleCompleted = sublevels.filter((s) => s.status === 'completed' && !s.hidden);
  const hiddenSublevels = sublevels.filter((s) => s.hidden);

  // Se acesso negado, mostrar apenas o modal e bloquear a página
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
            Você não tem permissão para acessar esta obra.
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
              onClick={() => {
                setAccessDeniedModal(false);
                navigate('/obras');
              }}
            >
              Ir para As Minhas Obras
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            {sublevels.filter(s => !s.hidden).length > 0 && (
              <li className="ml-tree-children-title">Filhos imediatos</li>
            )}
            {sublevels.filter(s => !s.hidden).map((child) => (
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
          <button 
            onClick={() => {
              if (work?.parentId) {
                navigate(`/works/${work.parentId}/levels`);
              } else {
                navigate("/");
              }
            }} 
            className="ml-back-btn"
          >
            ← {work?.parentId ? 'Voltar' : 'Início'}
          </button>
          <div className="ml-header-title-section">
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
            <div className="ml-header-actions"></div>
          </div>
          <p className="ml-subtitle">{work?.description}</p>
          {sublevels.filter(s => !s.hidden).length > 0 && (
            <p className="ml-completion-ratio">
              ✓ {completedCount}/{sublevels.filter(s => !s.hidden).length} níveis concluídos
            </p>
          )}
          <button 
            onClick={() => userPermission === 'W' && (editMode ? handleCloseEditMode() : handleOpenEditMode())} 
            disabled={userPermission === 'R'}
            style={{
              opacity: userPermission === 'R' ? 0.5 : 1,
              cursor: userPermission === 'R' ? 'not-allowed' : 'pointer'
            }}
            title={userPermission === 'R' ? 'Você tem apenas permissão de leitura' : ''}
            className="ml-edit-btn"
          >
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
                <label>Descrição</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                />
                {editErrors.description && <span className="ml-error">{editErrors.description}</span>}
              </div>
              <div className="ml-field">
                <label>Alterar Imagem de Capa (opcional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditCover(e.target.files[0])}
                />
              </div>
              <div className="ml-row">
                <div className="ml-field">
                  <label>Data de Início</label>
                  <input
                    type="date"
                    value={editStart}
                    onChange={(e) => setEditStart(e.target.value)}
                  />
                  {editErrors.startDate && <span className="ml-error">{editErrors.startDate}</span>}
                </div>
                <div className="ml-field">
                  <label>Data de Fim</label>
                  <input
                    type="date"
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                  />
                  {editErrors.endDate && <span className="ml-error">{editErrors.endDate}</span>}
                </div>
              </div>
              <div className="ml-row">
                <div className="ml-field">
                  <label>Responsável de Obra</label>
                  <select
                    value={editConstructionManagerId}
                    onChange={(e) => setEditConstructionManagerId(e.target.value)}
                  >
                    <option value="">-- Sem Responsável --</option>
                    {managers.map(manager => (
                      <option key={manager.id} value={manager.id}>
                        {manager.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ml-field">
                  <label>Diretor de Obra</label>
                  <select
                    value={editSiteDirectorId}
                    onChange={(e) => setEditSiteDirectorId(e.target.value)}
                  >
                    <option value="">-- Sem Diretor --</option>
                    {managers.map(manager => (
                      <option key={manager.id} value={manager.id}>
                        {manager.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {editErrors.submit && <div className="ml-error">{editErrors.submit}</div>}
              <button type="button" onClick={handleUpdateLevel} className="ml-btn" disabled={loading}>
                {loading ? "A guardar..." : "Guardar Alterações"}
              </button>
            </form>
          </div>
        )}

        {work && work.parentId !== undefined && (
          <div style={{ marginTop: '16px', marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => userPermission === 'W' && (moveMode ? setMoveMode(false) : handleOpenMoveMode())}
              disabled={userPermission !== 'W'}
              className="ml-move-btn"
              style={{
                background: moveMode ? '#f87171' : '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                cursor: userPermission !== 'W' ? 'not-allowed' : 'pointer',
                opacity: userPermission !== 'W' ? 0.5 : 1,
                fontWeight: '600'
              }}
              title={userPermission !== 'W' ? 'Você não tem permissão para mover' : ''}
              aria-label={moveMode ? "Cancelar Movimento" : "Mover na Hierarquia"}
            >
              {moveMode ? "✕" : "↕"}
            </button>
            <button 
              onClick={() => userPermission === 'W' && (cloneMode ? setCloneMode(false) : handleOpenCloneMode())}
              disabled={userPermission !== 'W'}
              className="ml-move-btn"
              style={{
                background: cloneMode ? '#f59e0b' : '#0ea5e9',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                cursor: userPermission !== 'W' ? 'not-allowed' : 'pointer',
                opacity: userPermission !== 'W' ? 0.5 : 1,
                fontWeight: '600'
              }}
              title={userPermission !== 'W' ? 'Você não tem permissão para clonar' : ''}
              aria-label={cloneMode ? "Cancelar Clonagem" : "Clonar Hierarquia"}
            >
              {cloneMode ? "✕" : "⧉"}
            </button>
          </div>
        )}

        {moveMode && (
          <div className="ml-edit-section">
            <h2>Mover Nível para Outro Local</h2>
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>
              Esta operação move este nível e toda a sua hierarquia descendente para outro local.
              Clique em "+" para expandir níveis e selecione o nível de destino.
            </p>
            <div className="ml-field">
              <label>Selecionar Novo Nível Pai *</label>
              <div style={{
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                padding: '12px',
                background: '#f9fafb',
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                {levelTree ? renderTreeNode(
                  levelTree,
                  0,
                  expandedNodes,
                  setExpandedNodes,
                  newParentId,
                  setNewParentId
                ) : <p>A carregar árvore...</p>}
              </div>
              {!newParentId && <span className="ml-error">Por favor, selecione um nível de destino</span>}
              {moveErrors.parent && <span className="ml-error">{moveErrors.parent}</span>}
            </div>
            {moveErrors.fetch && <div className="ml-error">{moveErrors.fetch}</div>}
            {moveErrors.submit && <div className="ml-error">{moveErrors.submit}</div>}
            <button type="button" onClick={handleMoveLevel} className="ml-btn" disabled={loading || !newParentId}>
              {loading ? "A mover..." : "Confirmar Movimento"}
            </button>
          </div>
        )}

        {cloneMode && (
          <div className="ml-edit-section">
            <h2>Clonar Nível para Outro Local</h2>
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>
              Esta operação cria uma cópia deste nível e toda a sua hierarquia descendente.
              Não serão copiados fotos, documentos ou notas.
            </p>
            <div className="ml-field">
              <label>Selecionar Nível Pai de Destino *</label>
              <div style={{
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                padding: '12px',
                background: '#f9fafb',
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                {cloneTree ? renderTreeNode(
                  cloneTree,
                  0,
                  cloneExpandedNodes,
                  setCloneExpandedNodes,
                  cloneParentId,
                  setCloneParentId
                ) : <p>A carregar árvore...</p>}
              </div>
              {!cloneParentId && <span className="ml-error">Por favor, selecione um nível de destino</span>}
              {cloneErrors.parent && <span className="ml-error">{cloneErrors.parent}</span>}
            </div>
            {cloneErrors.fetch && <div className="ml-error">{cloneErrors.fetch}</div>}
            {cloneErrors.submit && <div className="ml-error">{cloneErrors.submit}</div>}
            <button type="button" onClick={handleCloneLevel} className="ml-btn" disabled={loading || !cloneParentId}>
              {loading ? "A clonar..." : "Confirmar Clonagem"}
            </button>
          </div>
        )}

        <div className="ml-tabs">
          <button
            className={activeTab === "sublevels" ? "ml-tab ml-tab-active" : "ml-tab"}
            onClick={() => setActiveTab("sublevels")}
            title="Subníveis"
          >
            🏗️
          </button>
          {work && !work.parentId && (
            <button
              className={activeTab === "allContents" ? "ml-tab ml-tab-active" : "ml-tab"}
              onClick={() => setActiveTab("allContents")}
              title="Todos os Anexos"
            >
              📎
            </button>
          )}
          <button
            className={activeTab === "materials" ? "ml-tab ml-tab-active" : "ml-tab"}
            onClick={() => setActiveTab("materials")}
            title="Materiais"
          >
            📦
          </button>
          <button
            className={activeTab === "notes" ? "ml-tab ml-tab-active" : "ml-tab"}
            onClick={() => setActiveTab("notes")}
            title="Notas"
          >
            📝
          </button>
          <button
            className={activeTab === "photos" ? "ml-tab ml-tab-active" : "ml-tab"}
            onClick={() => setActiveTab("photos")}
            title="Fotografias"
          >
            📸
          </button>
          <button
            className={activeTab === "documents" ? "ml-tab ml-tab-active" : "ml-tab"}
            onClick={() => setActiveTab("documents")}
            title="Documentos"
          >
            📄
          </button>
          {/* Equipa tab removida — agora é página dedicada */}
        </div>

        {/* ========== TAB: SUBNÍVEIS ========== */}
        {activeTab === "sublevels" && (
          <div className="ml-tab-content">
            {(noteText || notes[0]?.description) && (
              <div className="ml-notes-readonly" aria-live="polite">
                <div className="ml-notes-readonly-header">📝 Notas</div>
                <div className="ml-notes-readonly-body">
                  {noteText || notes[0]?.description}
                </div>
              </div>
            )}
            <div className="ml-section-header">
              <h2>Subníveis</h2>
              <button 
                onClick={() => userPermission === 'W' && setShowSublevelForm(!showSublevelForm)} 
                className="ml-add-btn"
                disabled={userPermission === 'R'}
                style={{
                  opacity: userPermission === 'R' ? 0.5 : 1,
                  cursor: userPermission === 'R' ? 'not-allowed' : 'pointer'
                }}
                title={userPermission === 'R' ? 'Você tem apenas permissão de leitura' : ''}
              >
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
                  <label>Descrição</label>
                  <textarea
                    value={sublevelDesc}
                    onChange={(e) => setSublevelDesc(e.target.value)}
                  />
                  {sublevelErrors.description && <span className="ml-error">{sublevelErrors.description}</span>}
                </div>
                <div className="ml-field">
                  <label>Data de Início</label>
                  <input
                    type="date"
                    value={sublevelStart}
                    onChange={(e) => setSublevelStart(e.target.value)}
                  />
                </div>
                <div className="ml-field">
                  <label>Data de Fim</label>
                  <input
                    type="date"
                    value={sublevelEnd}
                    onChange={(e) => setSublevelEnd(e.target.value)}
                  />
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
                <>
                  {/* Barra de ações de seleção múltipla */}
                  {userPermission === 'W' && sublevels.length > 0 && (
                    <div className="ml-selection-toolbar">
                      <button 
                        className="ml-btn-selection-toggle"
                        onClick={() => {
                          setSelectionMode(!selectionMode);
                          setSelectedSublevels(new Set());
                        }}
                        title={selectionMode ? "Cancelar modo seleção" : "Ativar modo seleção múltipla"}
                      >
                        {selectionMode ? '✕' : '☑️'}
                      </button>
                      
                      {selectionMode && (
                        <>
                          <button 
                            className="ml-btn ml-btn-secondary"
                            onClick={toggleSelectAll}
                          >
                            {selectedSublevels.size === sublevels.length ? '☐' : '☑️'} {selectedSublevels.size}/{sublevels.length}
                          </button>
                          
                          {selectedSublevels.size > 0 && (
                            <button 
                              className="ml-btn ml-btn-danger"
                              onClick={handleDeleteSelectedSublevels}
                              disabled={loading}
                            >
                              🗑️ Apagar {selectedSublevels.size} Selecionado(s)
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  
                  {/* Não Concluídos e Visíveis */}
                  {visibleNotCompleted.length > 0 && (
                    <>
                      <h3 className="ml-sublevels-header">📋 Não Concluídos</h3>
                      <p className="ml-reorder-hint">
                        Arraste para reordenar. {reorderingSublevels ? "A guardar ordem..." : ""}
                      </p>
                      <div className="ml-sublist">
                        {visibleNotCompleted.map((sub) => (
                          <div
                            key={sub.id}
                            className={`ml-item ${draggingSublevelId === sub.id ? 'ml-item-dragging' : ''} ${dragOverSublevelId === sub.id ? 'ml-item-drop-target' : ''} ${selectedSublevels.has(sub.id) ? 'ml-item-selected' : ''}`}
                            draggable={!selectionMode}
                            onDragStart={() => !selectionMode && setDraggingSublevelId(sub.id)}
                            onDragOver={(e) => e.preventDefault()}
                            onDragEnter={() => !selectionMode && setDragOverSublevelId(sub.id)}
                            onDrop={() => !selectionMode && handleDropOnSublevel(sub.id)}
                            onDragEnd={handleDragEndSublevel}
                          >
                            {selectionMode && (
                              <div className="ml-checkbox-container">
                                <input 
                                  type="checkbox" 
                                  checked={selectedSublevels.has(sub.id)}
                                  onChange={() => toggleSublevelSelection(sub.id)}
                                  className="ml-selection-checkbox"
                                />
                              </div>
                            )}
                            {!selectionMode && <div className="ml-drag-handle" title="Arraste para reordenar">⋮⋮</div>}
                            <div 
                              className="ml-item-info"
                              onClick={() => !selectionMode && navigate(`/works/${sub.id}/levels`)}
                              style={{ cursor: selectionMode ? 'default' : 'pointer' }}
                            >
                              <h3>{sub.name}</h3>
                              <p>{sub.description}</p>
                              {sub.childrenCount > 0 && (
                                <p className="ml-sublevel-ratio">
                                  ✓ {sub.completedChildren}/{sub.childrenCount} níveis concluídos
                                </p>
                              )}
                            </div>
                            <div className="ml-item-actions">
                              <button 
                                onClick={() => userPermission === 'W' && handleDeleteSublevel(sub.id)} 
                                className="ml-btn-delete" 
                                title={userPermission === 'R' ? 'Você tem apenas permissão de leitura' : 'Ocultar'}
                                disabled={userPermission === 'R'}
                                style={{
                                  opacity: userPermission === 'R' ? 0.5 : 1,
                                  cursor: userPermission === 'R' ? 'not-allowed' : 'pointer'
                                }}
                              >
                                👁️
                              </button>
                              <button 
                                onClick={() => userPermission === 'W' && handleRemoveSublevel(sub.id)} 
                                className="ml-btn-remove" 
                                title={userPermission === 'R' ? 'Você tem apenas permissão de leitura' : 'Remover permanentemente'}
                                disabled={userPermission === 'R'}
                                style={{
                                  opacity: userPermission === 'R' ? 0.5 : 1,
                                  cursor: userPermission === 'R' ? 'not-allowed' : 'pointer'
                                }}
                              >
                                🗑️
                              </button>
                              <button 
                                onClick={() => userPermission === 'W' && handleToggleComplete(sub.id, sub.status === 'completed')} 
                                className={sub.status === 'completed' ? "ml-btn-completed" : "ml-btn-incomplete"}
                                title={userPermission === 'R' ? 'Você tem apenas permissão de leitura' : (sub.status !== 'completed' && sub.childrenCount > 0 && sub.completedChildren < sub.childrenCount ? "Encerre todos os filhos antes" : (sub.status === 'completed' ? "Marcar como não concluído" : "Marcar como concluído"))}
                                disabled={userPermission === 'R' || (sub.status !== 'completed' && sub.childrenCount > 0 && sub.completedChildren < sub.childrenCount)}
                                style={{
                                  opacity: (userPermission === 'R' || (sub.status !== 'completed' && sub.childrenCount > 0 && sub.completedChildren < sub.childrenCount)) ? 0.5 : 1,
                                  cursor: (userPermission === 'R' || (sub.status !== 'completed' && sub.childrenCount > 0 && sub.completedChildren < sub.childrenCount)) ? 'not-allowed' : 'pointer'
                                }}
                              >
                                {sub.status === 'completed' ? "✓" : "○"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Concluídos e Visíveis */}
                  {visibleCompleted.length > 0 && (
                    <>
                      <h3 className="ml-sublevels-header">✅ Concluídos</h3>
                      <div className="ml-sublist">
                        {visibleCompleted.map((sub) => (
                          <div 
                            key={sub.id} 
                            className={`ml-item ml-item-completed ${selectedSublevels.has(sub.id) ? 'ml-item-selected' : ''}`}
                            onClick={() => !selectionMode && navigate(`/works/${sub.id}/levels`)}
                            style={{ cursor: selectionMode ? 'default' : 'pointer' }}
                          >
                            {selectionMode && (
                              <div className="ml-checkbox-container">
                                <input 
                                  type="checkbox" 
                                  checked={selectedSublevels.has(sub.id)}
                                  onChange={() => toggleSublevelSelection(sub.id)}
                                  className="ml-selection-checkbox"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            )}
                            <div className="ml-item-info">
                              <h3>{sub.name} <span className="ml-completed-badge">✓</span></h3>
                              <p>{sub.description}</p>
                              {sub.childrenCount > 0 && (
                                <p className="ml-sublevel-ratio">
                                  ✓ {sub.completedChildren}/{sub.childrenCount} níveis concluídos
                                </p>
                              )}
                            </div>
                            <div className="ml-item-actions" onClick={(e) => e.stopPropagation()}>
                              <button 
                                onClick={() => userPermission === 'W' && handleDeleteSublevel(sub.id)} 
                                className="ml-btn-delete" 
                                title={userPermission === 'R' ? 'Você tem apenas permissão de leitura' : 'Ocultar'}
                                disabled={userPermission === 'R'}
                                style={{
                                  opacity: userPermission === 'R' ? 0.5 : 1,
                                  cursor: userPermission === 'R' ? 'not-allowed' : 'pointer'
                                }}
                              >
                                👁️
                              </button>
                              <button 
                                onClick={() => userPermission === 'W' && handleRemoveSublevel(sub.id)} 
                                className="ml-btn-remove" 
                                title={userPermission === 'R' ? 'Você tem apenas permissão de leitura' : 'Remover permanentemente'}
                                disabled={userPermission === 'R'}
                                style={{
                                  opacity: userPermission === 'R' ? 0.5 : 1,
                                  cursor: userPermission === 'R' ? 'not-allowed' : 'pointer'
                                }}
                              >
                                🗑️
                              </button>
                              <button 
                                onClick={() => userPermission === 'W' && handleToggleComplete(sub.id, sub.status === 'completed')} 
                                className={sub.status === 'completed' ? "ml-btn-completed" : "ml-btn-incomplete"}
                                title={userPermission === 'R' ? 'Você tem apenas permissão de leitura' : (sub.status !== 'completed' && sub.childrenCount > 0 && sub.completedChildren < sub.childrenCount ? "Encerre todos os filhos antes" : (sub.status === 'completed' ? "Marcar como não concluído" : "Marcar como concluído"))}
                                disabled={userPermission === 'R' || (sub.status !== 'completed' && sub.childrenCount > 0 && sub.completedChildren < sub.childrenCount)}
                                style={{
                                  opacity: (userPermission === 'R' || (sub.status !== 'completed' && sub.childrenCount > 0 && sub.completedChildren < sub.childrenCount)) ? 0.5 : 1,
                                  cursor: (userPermission === 'R' || (sub.status !== 'completed' && sub.childrenCount > 0 && sub.completedChildren < sub.childrenCount)) ? 'not-allowed' : 'pointer'
                                }}
                              >
                                {sub.status === 'completed' ? "✓" : "○"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Ocultos */}
                  {hiddenSublevels.length > 0 && (
                    <>
                      <h3 className="ml-sublevels-header ml-sublevels-header-hidden">👻 Ocultos</h3>
                      <div className="ml-sublist ml-sublist-hidden">
                        {hiddenSublevels.map((sub) => (
                          <div 
                            key={sub.id} 
                            className={`ml-item ml-item-hidden ${selectedSublevels.has(sub.id) ? 'ml-item-selected' : ''}`}
                            onClick={() => !selectionMode && navigate(`/works/${sub.id}/levels`)}
                            style={{ cursor: selectionMode ? 'default' : 'pointer' }}
                          >
                            {selectionMode && (
                              <div className="ml-checkbox-container">
                                <input 
                                  type="checkbox" 
                                  checked={selectedSublevels.has(sub.id)}
                                  onChange={() => toggleSublevelSelection(sub.id)}
                                  className="ml-selection-checkbox"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            )}
                            <div className="ml-item-info">
                              <h3>{sub.name}</h3>
                              <p>{sub.description}</p>
                              {sub.childrenCount > 0 && (
                                <p className="ml-sublevel-ratio">
                                  ✓ {sub.completedChildren}/{sub.childrenCount} níveis concluídos
                                </p>
                              )}
                            </div>
                            <div className="ml-item-actions" onClick={(e) => e.stopPropagation()}>
                              <button 
                                onClick={() => userPermission === 'W' && handleShowSublevel(sub.id)} 
                                className="ml-btn-show" 
                                title={userPermission === 'R' ? 'Você tem apenas permissão de leitura' : 'Mostrar'}
                                disabled={userPermission === 'R'}
                                style={{
                                  opacity: userPermission === 'R' ? 0.5 : 1,
                                  cursor: userPermission === 'R' ? 'not-allowed' : 'pointer'
                                }}
                              >
                                👁️‍🗨️
                              </button>
                              <button 
                                onClick={() => userPermission === 'W' && handleRemoveSublevel(sub.id)} 
                                className="ml-btn-remove" 
                                title={userPermission === 'R' ? 'Você tem apenas permissão de leitura' : 'Remover permanentemente'}
                                disabled={userPermission === 'R'}
                                style={{
                                  opacity: userPermission === 'R' ? 0.5 : 1,
                                  cursor: userPermission === 'R' ? 'not-allowed' : 'pointer'
                                }}
                              >
                                🗑️
                              </button>
                              <button 
                                onClick={() => userPermission === 'W' && handleToggleComplete(sub.id, sub.status === 'completed')} 
                                className={sub.status === 'completed' ? "ml-btn-completed" : "ml-btn-incomplete"}
                                title={userPermission === 'R' ? 'Você tem apenas permissão de leitura' : (sub.status !== 'completed' && sub.childrenCount > 0 && sub.completedChildren < sub.childrenCount ? "Encerre todos os filhos antes" : (sub.status === 'completed' ? "Marcar como não concluído" : "Marcar como concluído"))}
                                disabled={userPermission === 'R' || (sub.status !== 'completed' && sub.childrenCount > 0 && sub.completedChildren < sub.childrenCount)}
                                style={{
                                  opacity: (userPermission === 'R' || (sub.status !== 'completed' && sub.childrenCount > 0 && sub.completedChildren < sub.childrenCount)) ? 0.5 : 1,
                                  cursor: (userPermission === 'R' || (sub.status !== 'completed' && sub.childrenCount > 0 && sub.completedChildren < sub.childrenCount)) ? 'not-allowed' : 'pointer'
                                }}
                              >
                                {sub.status === 'completed' ? "✓" : "○"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Criar Níveis via Template de Excel */}
            <div style={{ marginTop: "24px" }}>
              <h3 
                className="ml-sublevels-header" 
                onClick={() => setShowExcelImport(!showExcelImport)}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                {showExcelImport ? '▼' : '▶'} 📊 Criar Níveis via Template de Excel
              </h3>
              {showExcelImport && (
                <div className="ml-sublist" style={{ padding: '16px' }}>
                  <div className="ml-import-row" style={{ marginBottom: '12px' }}>
                    <button onClick={downloadHierarchyTemplate} className="ml-btn-secondary">
                      Descarregar template Excel
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="ml-btn-secondary"
                      disabled={importingHierarchy || userPermission === 'R'}
                      style={{
                        opacity: (importingHierarchy || userPermission === 'R') ? 0.5 : 1,
                        cursor: (importingHierarchy || userPermission === 'R') ? 'not-allowed' : 'pointer'
                      }}
                      title={userPermission === 'R' ? 'Você tem apenas permissão de leitura' : ''}
                    >
                      {importingHierarchy ? "A importar..." : "Importar hierarquia via Excel"}
                    </button>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      style={{ display: "none" }}
                      ref={fileInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) parseHierarchyFile(file);
                      }}
                    />
                  </div>
                  <div className="ml-help-box">
                    <p style={{ marginBottom: "8px" }}>
                      <strong>Como usar Excel:</strong> 1) Descarrega o template 2) Preenche <em>Path</em> com hierarquia (ex.: Fase 1/Fundação/Betonagem) 3) Importa para criar automaticamente
                    </p>
                    <p style={{ marginBottom: "0", fontSize: "0.9rem", color: "#475569" }}>
                      <strong>Colunas:</strong> Path (obrigatória) | Description (opcional) | Start Date / End Date (YYYY-MM-DD, opcional)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== TAB: TODOS OS ANEXOS ========== */}
        {activeTab === "allContents" && (
          <div className="ml-tab-content">
            <div className="ml-section-header">
              <h2>Todos os Anexos da Obra</h2>
              <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  value={contentsSearch}
                  onChange={(e) => {
                    setContentsSearch(e.target.value);
                    setContentsOffset(0);
                  }}
                  style={{padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db'}}
                />
              </div>
            </div>

            {/* Sub-tabs */}
            <div style={{display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px'}}>
              <button
                onClick={() => { setContentsFilter('all'); setContentsOffset(0); }}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  background: contentsFilter === 'all' ? '#4f46e5' : '#f3f4f6',
                  color: contentsFilter === 'all' ? 'white' : '#374151',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Tudo ({(allContents.counts.materials || 0) + (allContents.counts.photos || 0) + (allContents.counts.documents || 0)})
              </button>
              <button
                onClick={() => { setContentsFilter('materials'); setContentsOffset(0); }}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  background: contentsFilter === 'materials' ? '#4f46e5' : '#f3f4f6',
                  color: contentsFilter === 'materials' ? 'white' : '#374151',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Materiais ({allContents.counts.materials || 0})
              </button>
              <button
                onClick={() => { setContentsFilter('photos'); setContentsOffset(0); }}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  background: contentsFilter === 'photos' ? '#4f46e5' : '#f3f4f6',
                  color: contentsFilter === 'photos' ? 'white' : '#374151',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Fotos ({allContents.counts.photos || 0})
              </button>
              <button
                onClick={() => { setContentsFilter('documents'); setContentsOffset(0); }}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  background: contentsFilter === 'documents' ? '#4f46e5' : '#f3f4f6',
                  color: contentsFilter === 'documents' ? 'white' : '#374151',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Documentos ({allContents.counts.documents || 0})
              </button>
            </div>

            {contentsLoading && contentsOffset === 0 ? (
              <div style={{textAlign: 'center', padding: '32px', color: '#6b7280'}}>A carregar...</div>
            ) : (
              <>
                {/* Render Materiais */}
                {(contentsFilter === 'all' || contentsFilter === 'materials') && allContents.materials.length > 0 && (
                  <div style={{marginBottom: '24px'}}>
                    <h3 style={{fontSize: '1.2rem', marginBottom: '12px'}}>📦 Materiais</h3>
                    <table className="ml-table">
                      <thead>
                        <tr>
                          <th>Descrição</th>
                          <th>Tipo</th>
                          <th>Quantidade</th>
                          <th>Nível</th>
                          <th>Criado</th>
                          <th>Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allContents.materials.map(m => (
                          <tr key={m.id}>
                            <td>{m.description}</td>
                            <td>{m.type || '—'}</td>
                            <td>{m.quantity}</td>
                            <td style={{fontSize: '0.85rem', color: '#6b7280'}}>{m.levelPath}</td>
                            <td>{new Date(m.createdAt).toLocaleDateString('pt-PT')}</td>
                            <td>
                              <Link
                                to={`/works/${m.levelId}/levels?tab=materials`}
                                style={{
                                  display: 'inline-block',
                                  padding: '4px 8px',
                                  background: '#e0e7ff',
                                  color: '#4338ca',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '0.85rem',
                                  textDecoration: 'none'
                                }}
                              >
                                Ir →
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Render Fotos */}
                {(contentsFilter === 'all' || contentsFilter === 'photos') && allContents.photos.length > 0 && (
                  <div style={{marginBottom: '24px'}}>
                    <h3 style={{fontSize: '1.2rem', marginBottom: '12px'}}>📸 Fotos</h3>
                    <table className="ml-table">
                      <thead>
                        <tr>
                          <th>Tipo</th>
                          <th>Descrição</th>
                          <th>Nível</th>
                          <th>Criado</th>
                          <th>Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allContents.photos.map(p => (
                          <tr key={p.id}>
                            <td>{p.type === 'before' ? 'Antes' : p.type === 'inprogress' ? 'Em progresso' : p.type === 'completed' ? 'Concluído' : p.type === 'issue' ? 'Problema' : p.type}</td>
                            <td>{p.description || '—'}</td>
                            <td style={{fontSize: '0.85rem', color: '#6b7280'}}>{p.levelPath}</td>
                            <td>{new Date(p.createdAt).toLocaleDateString('pt-PT')}</td>
                            <td>
                              <Link
                                to={`/works/${p.levelId}/levels?tab=photos`}
                                style={{
                                  display: 'inline-block',
                                  padding: '4px 8px',
                                  background: '#e0e7ff',
                                  color: '#4338ca',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '0.85rem',
                                  textDecoration: 'none'
                                }}
                              >
                                Ir →
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Render Documentos */}
                {(contentsFilter === 'all' || contentsFilter === 'documents') && allContents.documents.length > 0 && (
                  <div style={{marginBottom: '24px'}}>
                    <h3 style={{fontSize: '1.2rem', marginBottom: '12px'}}>📄 Documentos</h3>
                    <table className="ml-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Tipo</th>
                          <th>Nível</th>
                          <th>Criado</th>
                          <th>Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allContents.documents.map(d => (
                          <tr key={d.id}>
                            <td>{d.name}</td>
                            <td>{d.type || '—'}</td>
                            <td style={{fontSize: '0.85rem', color: '#6b7280'}}>{d.levelPath}</td>
                            <td>{new Date(d.createdAt).toLocaleDateString('pt-PT')}</td>
                            <td>
                              <Link
                                to={`/works/${d.levelId}/levels?tab=documents`}
                                style={{
                                  display: 'inline-block',
                                  padding: '4px 8px',
                                  background: '#e0e7ff',
                                  color: '#4338ca',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '0.85rem',
                                  textDecoration: 'none'
                                }}
                              >
                                Ir →
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {!contentsLoading && allContents.materials.length === 0 && allContents.photos.length === 0 && allContents.documents.length === 0 && (
                  <div style={{textAlign: 'center', padding: '32px', color: '#6b7280'}}>
                    Nenhum anexo encontrado.
                  </div>
                )}

                {/* Load More Button */}
                {!contentsLoading && (allContents.materials.length > 0 || allContents.photos.length > 0 || allContents.documents.length > 0) && (
                  <div style={{textAlign: 'center', marginTop: '16px'}}>
                    <button
                      onClick={() => setContentsOffset(prev => prev + 50)}
                      disabled={contentsLoading}
                      style={{
                        padding: '8px 16px',
                        background: '#f3f4f6',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      {contentsLoading ? 'A carregar...' : 'Carregar mais'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ========== TAB: MATERIAIS ========== */}
        {activeTab === "materials" && (
          <div className="ml-tab-content">
            <div className="ml-section-header">
              <h2>Materiais</h2>
              <button 
                onClick={() => userPermissionMaterials === 'W' && setShowMaterialForm(!showMaterialForm)}
                disabled={userPermissionMaterials === 'R'}
                style={{
                  opacity: userPermissionMaterials === 'R' ? 0.5 : 1,
                  cursor: userPermissionMaterials === 'R' ? 'not-allowed' : 'pointer'
                }}
                title={userPermissionMaterials === 'R' ? 'Você tem apenas permissão de leitura' : ''}
                className="ml-add-btn"
              >
                {showMaterialForm ? "Cancelar" : "+ Adicionar Material"}
              </button>
            </div>

            {showMaterialForm && (
              <form onSubmit={handleCreateMaterial} className="ml-form">
                <div className="ml-status-row">
                  <div className="ml-field">
                    <label>Entrega</label>
                    <div className="ml-radio-group">
                      {[{v:'Not requested',l:'Não pedido'},{v:'Requested',l:'Pedido'},{v:'Delivered',l:'Entregue'}].map(({v,l}) => (
                        <label key={v} className="ml-radio">
                          <input
                            type="radio"
                            value={v}
                            checked={materialDeliveryStatus === v}
                            onChange={(e) => setMaterialDeliveryStatus(e.target.value)}
                          />
                          {l}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="ml-field">
                    <label>Montagem</label>
                    <div className="ml-radio-group">
                      {[{v:'Not started',l:'Não iniciado'},{v:'Started',l:'Iniciado'},{v:'Finished',l:'Terminado'}].map(({v,l}) => (
                        <label key={v} className="ml-radio">
                          <input
                            type="radio"
                            value={v}
                            checked={materialAssemblyStatus === v}
                            onChange={(e) => setMaterialAssemblyStatus(e.target.value)}
                          />
                          {l}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="ml-field">
                  <label>Descrição *</label>
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
                </div>
                <div className="ml-row">
                  <div className="ml-field">
                    <label>Marca (opcional)</label>
                    <input
                      type="text"
                      value={materialBrand}
                      onChange={(e) => setMaterialBrand(e.target.value)}
                    />
                  </div>
                  <div className="ml-field">
                    <label>Fabricante (opcional)</label>
                    <input
                      type="text"
                      value={materialManufacturer}
                      onChange={(e) => setMaterialManufacturer(e.target.value)}
                    />
                  </div>
                  <div className="ml-field">
                    <label>Tipo (opcional)</label>
                    <input
                      type="text"
                      value={materialType}
                      onChange={(e) => setMaterialType(e.target.value)}
                    />
                  </div>
                </div>
                  <div className="ml-row">
                    <div className="ml-field">
                      <label>Valor Estimado (€) (opcional)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={materialEstimated}
                        onChange={(e) => setMaterialEstimated(e.target.value)}
                      />
                    </div>
                    <div className="ml-field">
                      <label>Valor Real (€) (opcional)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={materialReal}
                        onChange={(e) => setMaterialReal(e.target.value)}
                      />
                    </div>
                  </div>
                <div className="ml-field">
                  <label>Foto do Material (opcional)</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setMaterialPhotoFile(e.target.files[0])}
                      ref={materialPhotoInputRef}
                      style={{ flex: 1 }}
                    />
                    {materialPhotoFile && <span style={{ color: '#10b981', fontSize: '0.9rem' }}>✓ {materialPhotoFile.name}</span>}
                  </div>
                </div>
                {materialErrors.submit && <div className="ml-error">{materialErrors.submit}</div>}
                <button type="submit" className="ml-btn" disabled={loading}>
                  {loading ? "A criar..." : "Criar Material"}
                </button>
              </form>
            )}

            <div className="ml-field" style={{ marginBottom: '16px', maxWidth: '300px' }}>
              <label>Filtrar por Tipo</label>
              <select 
                value={materialTypeFilter} 
                onChange={(e) => setMaterialTypeFilter(e.target.value)}
                className="ml-select"
              >
                <option value="">-- Todos os tipos --</option>
                {[...new Set(materials.map(m => m.type).filter(Boolean))].sort().map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="ml-list">
              {materials.length === 0 ? (
                <p className="ml-empty">Nenhum material encontrado.</p>
              ) : (
                materials
                  .filter(m => !materialTypeFilter || m.type === materialTypeFilter)
                  .map((mat) => (
                  <div key={mat.id} className="ml-item">
                    {editingMaterial?.id === mat.id ? (
                      <div className="ml-edit-material">
                        <div className="ml-status-row">
                          <div className="ml-field">
                            <label>Entrega</label>
                            <div className="ml-radio-group">
                              {[{v:'Not requested',l:'Não pedido'},{v:'Requested',l:'Pedido'},{v:'Delivered',l:'Entregue'}].map(({v,l}) => (
                                <label key={v} className="ml-radio">
                                  <input
                                    type="radio"
                                    value={v}
                                    checked={editingMaterial.deliveryStatus === v}
                                    onChange={(e) => setEditingMaterial({...editingMaterial, deliveryStatus: e.target.value})}
                                  />
                                  {l}
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="ml-field">
                            <label>Montagem</label>
                            <div className="ml-radio-group">
                              {[{v:'Not started',l:'Não iniciado'},{v:'Started',l:'Iniciado'},{v:'Finished',l:'Terminado'}].map(({v,l}) => (
                                <label key={v} className="ml-radio">
                                  <input
                                    type="radio"
                                    value={v}
                                    checked={editingMaterial.assemblyStatus === v}
                                    onChange={(e) => setEditingMaterial({...editingMaterial, assemblyStatus: e.target.value})}
                                  />
                                  {l}
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
                            <label>Marca (opcional)</label>
                            <input
                              type="text"
                              value={editingMaterial.brand || ''}
                              onChange={(e) => setEditingMaterial({...editingMaterial, brand: e.target.value})}
                            />
                          </div>
                          <div className="ml-field">
                            <label>Fabricante (opcional)</label>
                            <input
                              type="text"
                              value={editingMaterial.manufacturer || ''}
                              onChange={(e) => setEditingMaterial({...editingMaterial, manufacturer: e.target.value})}
                            />
                          </div>
                          <div className="ml-field">
                            <label>Tipo (opcional)</label>
                            <input
                              type="text"
                              value={editingMaterial.type || ''}
                              onChange={(e) => setEditingMaterial({...editingMaterial, type: e.target.value})}
                            />
                          </div>
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
                        </div>
                        <div className="ml-row">
                          <div className="ml-field">
                            <label>Valor Estimado (€) (opcional)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editingMaterial.estimatedValue || ''}
                              onChange={(e) => setEditingMaterial({...editingMaterial, estimatedValue: e.target.value})}
                            />
                          </div>
                          <div className="ml-field">
                            <label>Valor Real (€) (opcional)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editingMaterial.realValue || ''}
                              onChange={(e) => setEditingMaterial({...editingMaterial, realValue: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="ml-field">
                          <label>Foto do Material (opcional)</label>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexDirection: 'column' }}>
                            {editingMaterial.photoUrl && (
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <img 
                                  src={editingMaterial.photoUrl} 
                                  alt="Material" 
                                  style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer' }}
                                  onClick={() => setSelectedPhoto(editingMaterial.photoUrl)}
                                  title="Clica para ampliar"
                                />
                                <button 
                                  type="button"
                                  onClick={() => setEditingMaterial({...editingMaterial, photoUrl: null})}
                                  className="ml-btn-delete"
                                  title="Remover foto"
                                >
                                  🗑️
                                </button>
                              </div>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => setEditingMaterial({...editingMaterial, photoFile: e.target.files[0]})}
                              style={{ flex: 1, minWidth: '100%' }}
                            />
                            {editingMaterial.photoFile && <span style={{ color: '#10b981', fontSize: '0.9rem' }}>✓ Novo arquivo: {editingMaterial.photoFile.name}</span>}
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
                          {mat.photoUrl && (
                            <div style={{ marginBottom: '8px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                              <img 
                                src={mat.photoUrl} 
                                alt={mat.description}
                                style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer', flexShrink: 0 }}
                                onClick={() => setSelectedPhoto(mat.photoUrl)}
                                title="Clica para ampliar"
                              />
                              <div style={{ flex: 1 }}>
                                <div className="ml-status-badges">
                                  <span className="ml-badge">Entrega: {
                                    {
                                      'Not requested': 'Não pedido',
                                      'Requested': 'Pedido',
                                      'Delivered': 'Entregue'
                                    }[mat.deliveryStatus] || mat.deliveryStatus || 'Não pedido'
                                  }</span>
                                  <span className="ml-badge">Montagem: {
                                    {
                                      'Not started': 'Não iniciado',
                                      'Started': 'Iniciado',
                                      'Finished': 'Terminado'
                                    }[mat.assemblyStatus] || mat.assemblyStatus || 'Não iniciado'
                                  }</span>
                                </div>
                                <h3 style={{ margin: '4px 0 0 0' }}>{mat.description}</h3>
                              </div>
                            </div>
                          )}
                          {!mat.photoUrl && (
                            <>
                              <div className="ml-status-badges">
                                <span className="ml-badge">Entrega: {
                                  {
                                    'Not requested': 'Não pedido',
                                    'Requested': 'Pedido',
                                  'Delivered': 'Entregue'
                                }[mat.deliveryStatus] || mat.deliveryStatus || 'Não pedido'
                              }</span>
                              <span className="ml-badge">Montagem: {
                                {
                                  'Not started': 'Não iniciado',
                                  'Started': 'Iniciado',
                                  'Finished': 'Terminado'
                                }[mat.assemblyStatus] || mat.assemblyStatus || 'Não iniciado'
                              }</span>
                              </div>
                              <h3>{mat.description}</h3>
                              <p>Quantidade: {mat.quantity}</p>
                            </>
                          )}
                          {(mat.brand || mat.manufacturer || mat.type) && (
                            <p>
                              {mat.brand && <span>Marca: {mat.brand} </span>}
                              {mat.manufacturer && <span>• Fabricante: {mat.manufacturer} </span>}
                              {mat.type && <span>• Tipo: {mat.type}</span>}
                            </p>
                          )}
                        </div>
                        <div className="ml-item-actions">
                          <button
                            onClick={() => setEditingMaterial({
                              ...mat,
                              deliveryStatus: mat.deliveryStatus || "Not requested",
                              assemblyStatus: mat.assemblyStatus || "Not started",
                              brand: mat.brand || "",
                              manufacturer: mat.manufacturer || "",
                              type: mat.type || "",
                            })}
                            className="ml-btn-view"
                          >
                            Editar
                          </button>
                          <button onClick={() => handleDeleteMaterial(mat.id)} className="ml-btn-delete" title="Deletar">🗑️</button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Criar Materiais via Template de Excel */}
            <div style={{ marginTop: "24px" }}>
              <h3 
                className="ml-sublevels-header" 
                onClick={() => setShowExcelImportMaterials(!showExcelImportMaterials)}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                {showExcelImportMaterials ? '▼' : '▶'} 📊 Criar Materiais via Template de Excel
              </h3>
              {showExcelImportMaterials && (
                <div className="ml-sublist" style={{ padding: '16px' }}>
                  <div className="ml-import-row" style={{ marginBottom: '12px' }}>
                    <button onClick={downloadMaterialsTemplate} className="ml-btn-secondary">
                      Descarregar template Excel
                    </button>
                    <button
                      onClick={() => userPermissionMaterials === 'W' && materialFileInputRef.current?.click()}
                      className="ml-btn-secondary"
                      disabled={importingMaterials || userPermissionMaterials === 'R'}
                      style={{
                        opacity: userPermissionMaterials === 'R' ? 0.5 : 1,
                        cursor: userPermissionMaterials === 'R' ? 'not-allowed' : 'pointer'
                      }}
                      title={userPermissionMaterials === 'R' ? 'Você tem apenas permissão de leitura' : ''}
                    >
                      {importingMaterials ? "A importar..." : "Importar materiais via Excel"}
                    </button>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      style={{ display: "none" }}
                      ref={materialFileInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) parseMaterialsFile(file);
                      }}
                    />
                  </div>
                  <div className="ml-help-box">
                    <p style={{ marginBottom: "8px" }}>
                      <strong>Como usar Excel:</strong> 1) Descarrega o template 2) Preenche Description, Quantity, Unit e opcionais (Brand, etc.) 3) Importa para criar automaticamente
                    </p>
                    <p style={{ marginBottom: "0", fontSize: "0.9rem", color: "#475569" }}>
                      <strong>Obrigatórias:</strong> Description, Quantity | <strong>Opcionais:</strong> Unit, Brand, Manufacturer, Type, Valores, Status
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== TAB: NOTAS ========== */}
        {activeTab === "notes" && (
          <div className="ml-tab-content">
            <div className="ml-section-header">
              <h2>Notas</h2>
            </div>

            <form className="ml-form" onSubmit={handleSaveNotes}>
              <div className="ml-field">
                <label>Notas do nível</label>
                <textarea
                  rows="5"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                />
                {noteErrors.text && <span className="ml-error">{noteErrors.text}</span>}
              </div>
              {noteErrors.submit && <div className="ml-error">{noteErrors.submit}</div>}
              <button
                type="submit"
                className="ml-btn"
                disabled={userPermissionNotes === 'R' || loading}
                style={{
                  opacity: userPermissionNotes === 'R' ? 0.5 : 1,
                  cursor: userPermissionNotes === 'R' ? 'not-allowed' : 'pointer'
                }}
                title={userPermissionNotes === 'R' ? 'Você tem apenas permissão de leitura' : ''}
              >
                {loading ? "A guardar..." : "Guardar Notas"}
              </button>
            </form>
          </div>
        )}

        {/* ========== TAB: FOTOGRAFIAS ========== */}
        {activeTab === "photos" && (
          <div className="ml-tab-content">
            <div className="ml-section-header">
              <h2>Fotografias</h2>
              <button
                onClick={() => setShowPhotoForm(!showPhotoForm)}
                className="ml-add-btn"
              >
                {showPhotoForm ? "Cancelar" : "+ Adicionar Foto"}
              </button>
            </div>

            {showPhotoForm && (
              <form onSubmit={handleCreatePhoto} className="ml-form">
                <div className="ml-field">
                  <label>Tipo de Foto</label>
                  <select value={photoType} onChange={(e) => setPhotoType(e.target.value)}>
                    <option value="issue">Inconformidade</option>
                    <option value="others">Outras</option>
                  </select>
                </div>
                <div className="ml-field">
                  <label>Visibilidade</label>
                  <div className="ml-toggle-group">
                    <button
                      type="button"
                      className={`ml-toggle-btn ${photoRole === 'B' ? 'active' : ''}`}
                      onClick={() => setPhotoRole('B')}
                    >
                      Backend (B)
                    </button>
                    <button
                      type="button"
                      className={`ml-toggle-btn ${photoRole === 'C' ? 'active' : ''}`}
                      onClick={() => setPhotoRole('C')}
                    >
                      Cliente (C)
                    </button>
                  </div>
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
                  <label>Observações (opcional)</label>
                  <textarea
                    rows="3"
                    value={photoDesc}
                    onChange={(e) => setPhotoDesc(e.target.value)}
                    placeholder="Adicione observações sobre a foto..."
                  />
                </div>
                {photoErrors.submit && <div className="ml-error">{photoErrors.submit}</div>}
                <button type="submit" className="ml-btn" disabled={loading}>
                  {loading ? "A enviar..." : "Enviar Foto"}
                </button>
              </form>
            )}

            <div className="ml-photo-sections">
              {['issue','others'].map(section => (
                <div key={section} className="ml-photo-section">
                  <h3 className="ml-photo-section-title">
                    {section === 'issue' ? 'Inconformidades' : 'Outras'}
                  </h3>
                  <div className="ml-photo-grid">
                    {photos.filter(p => p.type === section).length === 0 ? (
                      <p className="ml-empty">Sem fotos nesta secção.</p>
                    ) : (
                      photos.filter(p => p.type === section).map(photo => (
                        <div key={photo.id} className="ml-photo-card">
                          <img 
                            src={photo.url} 
                            alt={"Foto"} 
                            className="ml-photo-img" 
                            onClick={() => setSelectedPhoto(photo.url)}
                            style={{cursor: 'pointer'}}
                          />
                          <div className="ml-photo-actions">
                            <button
                              onClick={() => userPermissionPhotos === 'W' && handleTogglePhotoRole(photo.id, photo.role || 'B')}
                              disabled={userPermissionPhotos === 'R'}
                              className="ml-btn-toggle-role"
                              title={userPermissionPhotos === 'R' ? 'Você tem apenas permissão de leitura' : (photo.role === 'C' ? 'Cliente (clique para Backend)' : 'Backend (clique para Cliente)')}
                              style={{
                                opacity: userPermissionPhotos === 'R' ? 0.5 : 1,
                                cursor: userPermissionPhotos === 'R' ? 'not-allowed' : 'pointer'
                              }}
                            >
                              {photo.role === 'C' ? '👤' : '🏢'}
                            </button>
                            <button
                              onClick={() => userPermissionPhotos === 'W' && handleDeletePhoto(photo.id)}
                              disabled={userPermissionPhotos === 'R'}
                              className="ml-btn-delete-photo"
                              style={{
                                opacity: userPermissionPhotos === 'R' ? 0.5 : 1,
                                cursor: userPermissionPhotos === 'R' ? 'not-allowed' : 'pointer'
                              }}
                              title={userPermissionPhotos === 'R' ? 'Você tem apenas permissão de leitura' : ''}
                            >
                              🗑️
                            </button>
                          </div>
                          {photo.observacoes && (
                            <div className="ml-photo-info">
                              <p><strong>Observações:</strong> {photo.observacoes}</p>
                            </div>
                          )}
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
              <button
                onClick={() => {
                  console.log('Document button clicked, permission:', userPermissionDocuments);
                  setShowDocumentForm(!showDocumentForm);
                }}
                disabled={userPermissionDocuments !== 'W'}
                style={{
                  opacity: userPermissionDocuments !== 'W' ? 0.5 : 1,
                  cursor: userPermissionDocuments !== 'W' ? 'not-allowed' : 'pointer'
                }}
                title={userPermissionDocuments !== 'W' ? 'Você precisa de permissão de escrita' : ''}
                className="ml-add-btn"
              >
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
                      <button onClick={() => handleDeleteDocument(doc.id)} className="ml-btn-delete" title="Deletar">🗑️</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Conteúdo da Equipa removido — usar página /works/:id/equipa */}
      </div>
      </div>

      {/* Photo Preview Modal */}
      {selectedPhoto && (
        <div className="ml-modal-overlay" onClick={() => setSelectedPhoto(null)}>
          <div className="ml-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="ml-modal-close" onClick={() => setSelectedPhoto(null)}>✕</button>
            <img src={selectedPhoto} alt="Preview" className="ml-modal-img" />
          </div>
        </div>
      )}

      {/* Notification Modal */}
      {modal.type && (
        <div className="ml-modal-overlay" onClick={() => setModal({ ...modal, type: null })}>
          <div className="ml-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="ml-modal-title" style={{
              color: modal.type === 'error' ? '#dc2626' : modal.type === 'success' ? '#059669' : '#1e293b'
            }}>
              {modal.type === 'error' && '❌ '}
              {modal.type === 'success' && '✓ '}
              {modal.title}
            </h2>
            <p className="ml-modal-message">{modal.message}</p>
            <div className="ml-modal-actions">
              {modal.type !== 'confirm' && (
                <button 
                  className="ml-modal-btn ml-modal-btn-confirm"
                  style={{
                    background: modal.type === 'error' ? '#dc2626' : '#059669'
                  }}
                  onClick={() => {
                    if (modal.onConfirm) modal.onConfirm();
                    setModal({ ...modal, type: null });
                  }}
                >
                  OK
                </button>
              )}
              {modal.type === 'confirm' && (
                <>
                  <button 
                    className="ml-modal-btn ml-modal-btn-cancel"
                    onClick={() => setModal({ ...modal, type: null })}
                  >
                    Cancelar
                  </button>
                  <button 
                    className="ml-modal-btn ml-modal-btn-danger"
                    onClick={() => {
                      if (modal.onConfirm) modal.onConfirm();
                      setModal({ ...modal, type: null });
                    }}
                  >
                    Confirmar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        * {
          box-sizing: border-box;
        }
        .ml-bg {
          min-height: 100vh;
          background: #f0fdf9;
          padding: 16px;
          overflow-x: hidden;
        }
        .ml-layout {
          width: 100%;
          max-width: 100%;
          margin: 0;
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 16px;
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
          box-shadow: 0 1px 8px rgba(1, 163, 131, 0.08);
          padding: 16px;
          border: 1px solid #d1fae5;
          max-width: 100%;
          overflow-x: hidden;
        }
        .ml-tree-panel h3 {
          margin-bottom: 12px;
          font-size: 1.1rem;
          color: #01a383;
          font-weight: 600;
        }
        .ml-tree-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .ml-tree-item button {
          width: 100%;
          text-align: left;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 4px 8px;
          cursor: pointer;
          color: #374151;
          font-size: 0.9rem;
          transition: all 0.2s ease;
        }
        .ml-tree-item button:hover {
          background: #d1fae5;
          border-color: #01a383;
        }
        .ml-tree-item.ml-tree-child button {
          padding-left: 16px;
        }
        .ml-tree-item.ml-tree-current button {
          background: #d1fae5;
          border-color: #01a383;
          color: #01a383;
          font-weight: 700;
        }
        .ml-tree-children-title {
          margin-top: 4px;
          margin-bottom: 2px;
          font-size: 0.8rem;
          color: #6b7280;
        }
        .ml-container {
          width: 100%;
          max-width: 100%;
          margin: 0;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 1px 8px rgba(1, 163, 131, 0.08);
          padding: 24px;
          overflow-x: hidden;
        }
        .ml-header {
          margin-bottom: 32px;
        }
        .ml-header-title-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }
        .ml-header-actions {
          display: flex;
          gap: 10px;
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
          color: #01a383;
          margin-bottom: 8px;
        }
        .ml-breadcrumb-link {
          background: none;
          border: none;
          color: #01a383;
          font-size: 2rem;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
          text-decoration: underline;
          transition: color 0.2s;
        }
        .ml-breadcrumb-link:hover {
          color: #018568;
        }
        .ml-breadcrumb-current {
          color: #1e293b;
        }
        .ml-edit-btn {
          background: #d1fae5;
          color: #01a383;
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 600;
          margin-top: 12px;
          transition: all 0.2s ease;
        }
        .ml-edit-btn:hover {
          background: #a7f3d0;
        }
        .ml-complete-btn {
          background: #dcfce7;
          color: #16a34a;
          border: none;
          border-radius: 6px;
          padding: 10px 18px;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 600;
          margin-top: 12px;
          margin-left: 12px;
          transition: background 0.2s;
        }
        .ml-complete-btn:hover {
          background: #bbf7d0;
        }
        .ml-uncomplete-btn {
          background: #fed7aa;
          color: #b45309;
          border: none;
          border-radius: 6px;
          padding: 10px 18px;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 600;
          margin-top: 12px;
          margin-left: 12px;
          transition: background 0.2s;
        }
        .ml-uncomplete-btn:hover {
          background: #fdba74;
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
          max-width: 100%;
          overflow-x: auto;
        }
        .ml-tab {
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          padding: 12px 24px;
          font-size: 1rem;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .ml-tab:hover {
          color: #01a383;
        }
        .ml-tab-active {
          color: #01a383;
          border-bottom-color: #01a383;
        }
        .ml-tab-content {
          animation: fadeIn 0.3s;
          max-width: 100%;
          overflow-x: hidden;
        }
        .ml-notes-readonly {
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-left: 4px solid #9ca3af;
          border-radius: 10px;
          padding: 12px 16px;
          margin-bottom: 16px;
        }
        .ml-notes-readonly-header {
          font-weight: 600;
          color: #6b7280;
          margin-bottom: 6px;
          font-size: 0.95rem;
        }
        .ml-notes-readonly-body {
          white-space: pre-wrap;
          color: #4b5563;
          font-size: 0.95rem;
          line-height: 1.5;
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
          color: #01a383;
        }
        .ml-add-btn {
          background: #01a383;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .ml-add-btn:hover {
          background: #018568;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(1, 163, 131, 0.2);
        }
        .ml-import-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }
        .ml-btn-secondary {
          background: #e2e8f0;
          color: #0f172a;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 10px 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s, transform 0.2s;
        }
        .ml-btn-secondary:hover {
          background: #cbd5e1;
          transform: translateY(-1px);
        }
        .ml-help-box {
          background: #f0f9ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 14px 16px;
          margin: 0 auto 20px auto;
          max-width: 600px;
          color: #0f172a;
          line-height: 1.5;
          font-size: 0.95rem;
          text-align: center;
        }
        .ml-help-box strong {
          font-weight: 700;
        }
        .ml-help-box em {
          font-style: italic;
          color: #1e40af;
        }
        .ml-form {
          background: #fff;
          border-radius: 8px;
          padding: 24px;
          margin-bottom: 24px;
          border: 1px solid #e2e8f0;
          max-width: 100%;
          overflow-x: hidden;
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
          background: #01a383;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 8px;
        }
        .ml-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .ml-btn:hover:not(:disabled) {
          background: #018568;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(1, 163, 131, 0.2);
        }
        .ml-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
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
          background: #f9fafb;
          border-radius: 8px;
          padding: 8px 12px;
          border: 1px solid #e5e7eb;
          transition: all 0.2s ease;
        }
        .ml-drag-handle {
          width: 28px;
          text-align: center;
          margin-right: 10px;
          cursor: grab;
          color: #94a3b8;
          user-select: none;
          font-weight: 700;
          letter-spacing: 1px;
        }
        .ml-item-dragging {
          opacity: 0.75;
          border-color: #a7f3d0;
          box-shadow: 0 2px 10px rgba(1, 163, 131, 0.15);
        }
        .ml-item-drop-target {
          border-color: #38bdf8;
          box-shadow: 0 0 0 2px #bae6fd;
        }
        .ml-reorder-hint {
          margin: -6px 0 10px 0;
          color: #475569;
          font-size: 0.85rem;
        }
        .ml-item:hover {
          box-shadow: 0 2px 8px rgba(1, 163, 131, 0.12);
          border-color: #a7f3d0;
        }
        .ml-item-info {
          flex: 1;
        }
        .ml-item-info h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 2px;
          margin-top: 0;
        }
        .ml-item-info p {
          color: #64748b;
          font-size: 0.9rem;
          margin: 2px 0;
        }
        .ml-item-completed {
          opacity: 0.75;
          background: #f0fdf4;
        }
        .ml-sublist {
          margin-bottom: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .ml-sublist-hidden {
          opacity: 0.6;
        }
        .ml-item-hidden {
          background: #f5f5f5;
          border-color: #d4d4d8;
        }
        .ml-sublevels-header {
          font-size: 0.95rem;
          font-weight: 700;
          color: #01a383;
          margin-top: 12px;
          margin-bottom: 6px;
          padding: 4px 0;
          border-bottom: 2px solid #d1fae5;
        }
        .ml-sublevels-header-hidden {
          color: #94a3b8;
          border-bottom-color: #cbd5e1;
        }
        .ml-btn-show {
          padding: 4px 8px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.85rem;
          transition: background 0.2s;
          background: #dbeafe;
          color: #0284c7;
        }
        .ml-btn-show:hover {
          background: #bfdbfe;
        }
        .ml-sublevels-header {
          font-size: 1rem;
          font-weight: 700;
          color: #1e293b;
          margin-top: 24px;
          margin-bottom: 12px;
          padding: 8px 0;
          border-bottom: 2px solid #e2e8f0;
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
          gap: 4px;
        }
        .ml-btn-delete {
          padding: 4px 8px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.85rem;
          transition: background 0.2s;
          background: #fee2e2;
          color: #dc2626;
        }
        .ml-btn-delete:hover {
          background: #fecaca;
        }
        .ml-btn-remove {
          padding: 4px 8px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.85rem;
          transition: background 0.2s;
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }
        .ml-btn-remove:hover {
          background: #fee2e2;
          border-color: #fca5a5;
        }
        .ml-sublist {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }
        .ml-item-completed {
          opacity: 0.75;
        }
        .ml-btn-incomplete {
          background: #e2e8f0;
          color: #64748b;
          border: none;
          border-radius: 6px;
          padding: 4px 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.85rem;
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
          padding: 4px 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.85rem;
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
          font-size: 0.8rem;
          color: #16a34a;
          font-weight: 600;
          margin-top: 2px;
          margin-bottom: 0;
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
          background: #fff;
          color: #dc2626;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          width: 32px;
          height: 32px;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }
        .ml-btn-delete-photo:hover {
          background: #fee2e2;
          border-color: #dc2626;
        }
        .ml-photo-actions {
          position: absolute;
          top: 8px;
          left: 8px;
          right: 8px;
          display: flex;
          justify-content: space-between;
          z-index: 2;
          gap: 8px;
        }
        .ml-btn-toggle-role {
          background: #fff;
          color: #3b82f6;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          width: 32px;
          height: 32px;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }
        .ml-btn-toggle-role:hover {
          background: #eff6ff;
          border-color: #3b82f6;
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
        
        /* Toggle button group for role selection */
        .ml-toggle-group {
          display: flex;
          gap: 8px;
        }
        .ml-toggle-btn {
          flex: 1;
          padding: 8px 16px;
          border: 2px solid #cbd5e1;
          border-radius: 8px;
          background: #fff;
          color: #64748b;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }
        .ml-toggle-btn:hover {
          border-color: #94a3b8;
        }
        .ml-toggle-btn.active {
          border-color: #2563eb;
          background: #2563eb;
          color: #fff;
        }
        
        /* Photo badge showing role */
        .ml-photo-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(0,0,0,0.7);
          color: #fff;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: bold;
        }
        .ml-photo-card {
          position: relative;
        }
        
        /* Photo preview modal */
        .ml-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 40px 20px;
        }
        .ml-modal-content {
          position: relative;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          padding: 40px;
          max-width: 500px;
          width: 100%;
          min-width: 320px;
          animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .ml-modal-img {
          max-width: 100%;
          max-height: 90vh;
          display: block;
        }
        .ml-modal-close {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(0,0,0,0.7);
          color: #fff;
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          font-size: 1.2rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ml-modal-close:hover {
          background: #000;
        }

        /* Notification Modal Styles */
        .ml-modal-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 16px 0;
        }
        .ml-modal-message {
          color: #64748b;
          line-height: 1.7;
          margin: 0 0 32px 0;
          font-size: 1.05rem;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .ml-modal-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        .ml-modal-btn {
          padding: 12px 32px;
          border-radius: 8px;
          border: none;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 1rem;
          min-width: 200px;
        }
        .ml-modal-btn-cancel {
          background: #e2e8f0;
          color: #475569;
        }
        .ml-modal-btn-cancel:hover {
          background: #cbd5e1;
          transform: translateY(-2px);
        }
        .ml-modal-btn-confirm {
          background: #059669;
          color: white;
        }
        .ml-modal-btn-confirm:hover {
          background: #047857;
          transform: translateY(-2px);
        }
        .ml-modal-btn-danger {
          background: #dc2626;
          color: white;
        }
        .ml-modal-btn-danger:hover {
          background: #b91c1c;
          transform: translateY(-2px);
        }
        
        /* Fix form and field overflow */
        .ml-form {
          max-width: 100%;
          box-sizing: border-box;
        }
        .ml-field {
          max-width: 100%;
          box-sizing: border-box;
        }
        .ml-field input,
        .ml-field textarea,
        .ml-field select {
          max-width: 100%;
          box-sizing: border-box;
        }
        
        /* Estilos para tabela de anexos */
        .ml-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          background: #fff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .ml-table thead {
          background: #f8fafc;
        }
        .ml-table th {
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          color: #1e293b;
          font-size: 0.9rem;
          border-bottom: 2px solid #e2e8f0;
          white-space: nowrap;
        }
        .ml-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
          color: #475569;
          font-size: 0.9rem;
        }
        .ml-table tbody tr:hover {
          background: #f8fafc;
        }
        .ml-table tbody tr:last-child td {
          border-bottom: none;
        }

        /* Estilos para seleção múltipla de subníveis */
        .ml-selection-toolbar {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
          padding: 12px;
          background: #f8fafc;
          border-radius: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .ml-btn-selection-toggle {
          background: #01a383;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 6px 10px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          min-width: 40px;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .ml-btn-selection-toggle:hover {
          background: #009070;
          transform: scale(1.05);
        }
        .ml-checkbox-container {
          padding: 0 8px;
          display: flex;
          align-items: center;
        }
        .ml-selection-checkbox {
          width: 20px;
          height: 20px;
          cursor: pointer;
          accent-color: #01a383;
        }
        .ml-item-selected {
          background: #d1fae5 !important;
          border-color: #01a383 !important;
        }
        .ml-btn-danger {
          background: #ef4444;
          color: white;
        }
        .ml-btn-danger:hover {
          background: #dc2626;
        }
      `}</style>
    </div>
  );
}
