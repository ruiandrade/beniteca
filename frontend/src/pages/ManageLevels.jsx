import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

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
  const [materialErrors, setMaterialErrors] = useState({});

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
  const [photoType, setPhotoType] = useState("inicio");
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
  const [editErrors, setEditErrors] = useState({});

  // Estado para mover level (mudar parentId)
  const [moveMode, setMoveMode] = useState(false);
  const [newParentId, setNewParentId] = useState("");
  const [levelTree, setLevelTree] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [moveErrors, setMoveErrors] = useState({});

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
        // Set default dates for sublevel form
        setSublevelStart(data.startDate ? data.startDate.split('T')[0] : "");
        setSublevelEnd(data.endDate ? data.endDate.split('T')[0] : "");
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

  // Equipa-related fetches removed; handled in Equipa page

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
          startDate: sublevelStart || null,
          endDate: sublevelEnd || null,
        }),
      });
      if (!res.ok) throw new Error("Erro ao criar subnível");
      await fetchSublevels();
      setSublevelName("");
      setSublevelDesc("");
      setSublevelCover(null);
      setSublevelStart(work?.startDate ? work.startDate.split('T')[0] : "");
      setSublevelEnd(work?.endDate ? work.endDate.split('T')[0] : "");
      setShowSublevelForm(false);
      setSublevelErrors({});
    } catch (err) {
      setSublevelErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSublevel = async (sublevelId) => {
    if (!confirm("Tem certeza que deseja ocultar este subnível? Pode ser mostrado novamente a qualquer momento.")) return;
    try {
      const res = await fetch(`/api/levels/${sublevelId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: true }),
      });
      if (res.ok) await fetchSublevels();
    } catch (err) {
      alert("Erro ao ocultar subnível");
    }
  };

  const handleShowSublevel = async (sublevelId) => {
    try {
      const res = await fetch(`/api/levels/${sublevelId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: false }),
      });
      if (res.ok) await fetchSublevels();
    } catch (err) {
      alert("Erro ao mostrar subnível");
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
      if (res.ok) {
        // If completing the main work level, refresh its state
        if (sublevelId == id) {
          await fetchWork();
        }
        await fetchSublevels();
      }
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
          brand: materialBrand || null,
          manufacturer: materialManufacturer || null,
          type: materialType || null,
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
      setMaterialBrand("");
      setMaterialManufacturer("");
      setMaterialType("");
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
        alert("O ficheiro está vazio ou sem coluna Path");
        return;
      }

      const pathMap = new Map();
      // Root corresponds to current level id
      pathMap.set("__ROOT__", parseInt(id, 10));

      const sorted = entries.sort((a, b) => {
        const da = a.path.split("/").length;
        const db = b.path.split("/").length;
        return da - db;
      });

      for (const entry of sorted) {
        const parts = entry.path.split("/").map((p) => p.trim()).filter(Boolean);
        if (parts.length === 0) continue;
        const parentKey = parts.slice(0, -1).join("/") || "__ROOT__";
        const parentId = pathMap.get(parentKey);
        if (!parentId) {
          throw new Error(`Parent path não encontrado: ${parentKey}`);
        }

        const res = await fetch("/api/levels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: parts[parts.length - 1],
            description: entry.description || parts[parts.length - 1],
            parentId,
            startDate: entry.startDate || null,
            endDate: entry.endDate || null,
          }),
        });
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(`Erro ao criar nível ${entry.path}: ${msg}`);
        }
        const created = await res.json();
        const currentKey = parts.join("/");
        pathMap.set(currentKey, created.id);
      }

      await fetchSublevels();
      alert("Hierarquia criada com sucesso!");
    } catch (err) {
      alert(`Erro ao importar hierarquia: ${err.message}`);
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
        alert("O ficheiro está vazio ou sem colunas obrigatórias");
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
      alert(`${materials.length} material(is) criado(s) com sucesso!`);
    } catch (err) {
      alert(`Erro ao importar materiais: ${err.message}`);
    } finally {
      setImportingMaterials(false);
      if (materialFileInputRef.current) materialFileInputRef.current.value = "";
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
          brand: mat.brand || null,
          manufacturer: mat.manufacturer || null,
          type: mat.type || null,
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

  // Equipa-related handlers removed; handled in Equipa page

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
          role: photoRole,
          levelId: id,
        }),
      });
      if (!res.ok) throw new Error("Erro ao criar foto");
      await fetchPhotos();
      setPhotoFile(null);
      setPhotoType("inicio");
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
    if (!confirm("Tem certeza que deseja deletar esta foto?")) return;
    try {
      const res = await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
      if (res.ok) await fetchPhotos();
    } catch (err) {
      alert("Erro ao deletar foto");
    }
  };

  const handleTogglePhotoRole = async (photoId, currentRole) => {
    const newRole = currentRole === 'B' ? 'C' : 'B';
    try {
      const res = await fetch(`/api/photos/${photoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) await fetchPhotos();
      else alert("Erro ao alterar visibilidade");
    } catch (err) {
      alert("Erro ao alterar visibilidade: " + err.message);
    }
  };

  const handleUpdateLevel = async () => {
    const errors = {};
    if (!editName.trim()) errors.name = "Nome é obrigatório";
    if (!editDesc.trim()) errors.description = "Descrição é obrigatória";

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
      };
      if (coverUrl) payload.coverImage = coverUrl;

      const res = await fetch(`/api/levels/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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

  const buildLevelTree = async () => {
    try {
      // Encontrar a obra mãe (top-level parent) do nível atual
      let topLevelParent = work;
      
      while (topLevelParent.parentId !== null && topLevelParent.parentId !== undefined) {
        const parentRes = await fetch(`/api/levels/${topLevelParent.parentId}`);
        if (!parentRes.ok) break;
        topLevelParent = await parentRes.json();
      }

      // Recursivamente construir árvore com filhos
      const buildTreeNode = async (levelId) => {
        const levelRes = await fetch(`/api/levels/${levelId}`);
        if (!levelRes.ok) return null;
        const levelData = await levelRes.json();

        const childrenRes = await fetch(`/api/levels?parentId=${levelId}`);
        const children = childrenRes.ok ? await childrenRes.json() : [];

        const childNodes = [];
        for (const child of children) {
          const childNode = await buildTreeNode(child.id);
          if (childNode) childNodes.push(childNode);
        }

        return {
          id: levelData.id,
          name: levelData.name,
          children: childNodes
        };
      };

      // Obter descendentes do level atual para excluir
      const getDescendantIds = async (levelId) => {
        const res = await fetch(`/api/levels?parentId=${levelId}`);
        if (!res.ok) return [];
        const subs = await res.json();
        let ids = subs.map(s => s.id);
        for (const sub of subs) {
          const deeper = await getDescendantIds(sub.id);
          ids = [...ids, ...deeper];
        }
        return ids;
      };

      const descendantIds = await getDescendantIds(id);

      // Filtrar a árvore para remover o nível atual e seus descendentes
      const filterTree = (node) => {
        if (node.id === parseInt(id) || descendantIds.includes(node.id)) {
          return null;
        }
        return {
          ...node,
          children: node.children.map(filterTree).filter(Boolean)
        };
      };

      const tree = await buildTreeNode(topLevelParent.id);
      const filteredTree = filterTree(tree);
      
      setLevelTree(filteredTree);
      setExpandedNodes(new Set([filteredTree.id])); // Expandir raiz por padrão
    } catch (err) {
      console.error('Erro ao construir árvore:', err);
      setMoveErrors({ fetch: err.message });
    }
  };

  const handleMoveLevel = async () => {
    const errors = {};
    if (!newParentId) {
      errors.parent = "Selecione um nível de destino";
    }

    setMoveErrors(errors);
    if (Object.keys(errors).length > 0) return;

    if (!confirm(`Tem certeza que deseja mover este nível? Toda a hierarquia descendente será movida junto.`)) {
      return;
    }

    setLoading(true);
    try {
      const payload = {
        parentId: parseInt(newParentId)
      };

      const res = await fetch(`/api/levels/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) throw new Error("Erro ao mover nível");
      
      await fetchWork();
      await buildBreadcrumb();
      setMoveMode(false);
      setNewParentId('');
      setMoveErrors({});
      
      // Redirecionar para o nível movido
      window.location.reload();
    } catch (err) {
      setMoveErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMoveMode = async () => {
    setMoveMode(true);
    await buildLevelTree();
  };

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const renderTreeNode = (node, depth = 0) => {
    if (!node) return null;
    
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = newParentId === node.id.toString();

    return (
      <div key={node.id} style={{ marginLeft: `${depth * 20}px` }}>
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px',
            cursor: 'pointer',
            background: isSelected ? '#dbeafe' : 'transparent',
            borderRadius: '6px',
            marginBottom: '4px',
            border: isSelected ? '2px solid #3b82f6' : '2px solid transparent'
          }}
        >
          {hasChildren && (
            <span 
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              style={{
                marginRight: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                userSelect: 'none',
                width: '20px'
              }}
            >
              {isExpanded ? '−' : '+'}
            </span>
          )}
          {!hasChildren && <span style={{ marginRight: '8px', width: '20px' }}></span>}
          <span 
            onClick={() => setNewParentId(node.id.toString())}
            style={{ flex: 1 }}
          >
            {node.name}
          </span>
        </div>
        {isExpanded && hasChildren && (
          <div>
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
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
            <div className="ml-header-actions">
              {work && (
                <button 
                  onClick={() => handleToggleComplete(work.id, work.completed)} 
                  className={work.completed ? "ml-btn-completed" : "ml-btn-incomplete"}
                  title={work.completed ? "Marcar como não concluído" : "Marcar como concluído"}
                >
                  {work.completed ? "✓" : "○"}
                </button>
              )}
            </div>
          </div>
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
              {editErrors.submit && <div className="ml-error">{editErrors.submit}</div>}
              <button type="button" onClick={handleUpdateLevel} className="ml-btn" disabled={loading}>
                {loading ? "A guardar..." : "Guardar Alterações"}
              </button>
            </form>
          </div>
        )}

        {work && work.parentId !== undefined && (
          <div style={{ marginTop: '16px', marginBottom: '16px' }}>
            <button 
              onClick={() => moveMode ? setMoveMode(false) : handleOpenMoveMode()} 
              className="ml-move-btn"
              style={{
                background: moveMode ? '#f87171' : '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              {moveMode ? "Cancelar Movimento" : "↕️ Mover na Hierarquia"}
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
                {levelTree ? renderTreeNode(levelTree) : <p>A carregar árvore...</p>}
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

        <div className="ml-tabs">
          <button
            className={activeTab === "sublevels" ? "ml-tab ml-tab-active" : "ml-tab"}
            onClick={() => setActiveTab("sublevels")}
            title="Subníveis"
          >
            🏗️
          </button>
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
            <div className="ml-section-header">
              <h2>Subníveis</h2>
              <button onClick={() => setShowSublevelForm(!showSublevelForm)} className="ml-add-btn">
                {showSublevelForm ? "Cancelar" : "+ Adicionar Subnível"}
              </button>
            </div>

            <div className="ml-import-row">
              <button onClick={downloadHierarchyTemplate} className="ml-btn-secondary">
                Descarregar template Excel
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="ml-btn-secondary"
                disabled={importingHierarchy}
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
                  {/* Não Concluídos e Visíveis */}
                  {sublevels.filter(s => !s.completed && !s.hidden).length > 0 && (
                    <>
                      <h3 className="ml-sublevels-header">📋 Não Concluídos</h3>
                      <div className="ml-sublist">
                        {sublevels.filter(s => !s.completed && !s.hidden).map((sub) => (
                          <div key={sub.id} className="ml-item">
                            <div 
                              className="ml-item-info"
                              onClick={() => navigate(`/works/${sub.id}/levels`)}
                              style={{ cursor: 'pointer' }}
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
                              <button onClick={() => handleDeleteSublevel(sub.id)} className="ml-btn-delete" title="Ocultar">👁️</button>
                              <button 
                                onClick={() => handleToggleComplete(sub.id, sub.completed)} 
                                className={sub.completed ? "ml-btn-completed" : "ml-btn-incomplete"}
                                title={sub.completed ? "Marcar como não concluído" : "Marcar como concluído"}
                              >
                                {sub.completed ? "✓" : "○"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Concluídos e Visíveis */}
                  {sublevels.filter(s => s.completed && !s.hidden).length > 0 && (
                    <>
                      <h3 className="ml-sublevels-header">✅ Concluídos</h3>
                      <div className="ml-sublist">
                        {sublevels.filter(s => s.completed && !s.hidden).map((sub) => (
                          <div key={sub.id} className="ml-item ml-item-completed">
                            <div 
                              className="ml-item-info"
                              onClick={() => navigate(`/works/${sub.id}/levels`)}
                              style={{ cursor: 'pointer' }}
                            >
                              <h3>{sub.name} <span className="ml-completed-badge">✓</span></h3>
                              <p>{sub.description}</p>
                              {sub.childrenCount > 0 && (
                                <p className="ml-sublevel-ratio">
                                  ✓ {sub.completedChildren}/{sub.childrenCount} níveis concluídos
                                </p>
                              )}
                            </div>
                            <div className="ml-item-actions">
                              <button onClick={() => handleDeleteSublevel(sub.id)} className="ml-btn-delete" title="Ocultar">👁️</button>
                              <button 
                                onClick={() => handleToggleComplete(sub.id, sub.completed)} 
                                className={sub.completed ? "ml-btn-completed" : "ml-btn-incomplete"}
                                title={sub.completed ? "Marcar como não concluído" : "Marcar como concluído"}
                              >
                                {sub.completed ? "✓" : "○"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Ocultos */}
                  {sublevels.filter(s => s.hidden).length > 0 && (
                    <>
                      <h3 className="ml-sublevels-header ml-sublevels-header-hidden">👻 Ocultos</h3>
                      <div className="ml-sublist ml-sublist-hidden">
                        {sublevels.filter(s => s.hidden).map((sub) => (
                          <div key={sub.id} className="ml-item ml-item-hidden">
                            <div 
                              className="ml-item-info"
                              onClick={() => navigate(`/works/${sub.id}/levels`)}
                              style={{ cursor: 'pointer' }}
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
                              <button onClick={() => handleShowSublevel(sub.id)} className="ml-btn-show" title="Mostrar">👁️‍🗨️</button>
                              <button 
                                onClick={() => handleToggleComplete(sub.id, sub.completed)} 
                                className={sub.completed ? "ml-btn-completed" : "ml-btn-incomplete"}
                                title={sub.completed ? "Marcar como não concluído" : "Marcar como concluído"}
                              >
                                {sub.completed ? "✓" : "○"}
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

            <div className="ml-import-row">
              <button onClick={downloadMaterialsTemplate} className="ml-btn-secondary">
                Descarregar template Excel
              </button>
              <button
                onClick={() => materialFileInputRef.current?.click()}
                className="ml-btn-secondary"
                disabled={importingMaterials}
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
                          <p>Quantidade: {mat.quantity}</p>
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
          </div>
        )}

        {/* ========== TAB: NOTAS ========== */}
        {activeTab === "notes" && (
          <div className="ml-tab-content">
            <div className="ml-section-header">
              <h2>Notas</h2>
            </div>

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
                          <img 
                            src={photo.url} 
                            alt={"Foto"} 
                            className="ml-photo-img" 
                            onClick={() => setSelectedPhoto(photo.url)}
                            style={{cursor: 'pointer'}}
                          />
                          <div className="ml-photo-actions">
                            <button
                              onClick={() => handleTogglePhotoRole(photo.id, photo.role || 'B')}
                              className="ml-btn-toggle-role"
                              title={photo.role === 'C' ? 'Cliente (clique para Backend)' : 'Backend (clique para Cliente)'}
                            >
                              {photo.role === 'C' ? '👤' : '🏢'}
                            </button>
                            <button onClick={() => handleDeletePhoto(photo.id)} className="ml-btn-delete-photo">🗑️</button>
                          </div>
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
        .ml-item-info {
          flex: 1;
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
        .ml-item-completed {
          opacity: 0.75;
          background: #f0fdf4;
        }
        .ml-sublist {
          margin-bottom: 20px;
        }
        .ml-sublist-hidden {
          opacity: 0.6;
        }
        .ml-item-hidden {
          background: #f5f5f5;
          border-color: #d4d4d8;
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
        .ml-sublevels-header-hidden {
          color: #94a3b8;
          border-bottom-color: #cbd5e1;
        }
        .ml-btn-show {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.9rem;
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
          gap: 8px;
        }
        .ml-btn-delete {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background 0.2s;
          background: #fee2e2;
          color: #dc2626;
        }
        .ml-btn-delete:hover {
          background: #fecaca;
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
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }
        .ml-modal-content {
          position: relative;
          max-width: 90vw;
          max-height: 90vh;
          background: #fff;
          border-radius: 8px;
          overflow: hidden;
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
      `}</style>
    </div>
  );
}
