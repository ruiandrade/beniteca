

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const constructionManagers = [
  { id: "1", name: "João Silva" },
  { id: "2", name: "Maria Costa" },
  { id: "3", name: "Carlos Pinto" },
];

export default function CreateWork() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState(null);
  const [constructionManagerId, setConstructionManagerId] = useState("");
  const [notes, setNotes] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [createdWorkId, setCreatedWorkId] = useState(null);
  const navigate = useNavigate();

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = "Nome é obrigatório";
    if (!description.trim()) newErrors.description = "Descrição é obrigatória";
    if (!coverImage) newErrors.coverImage = "Imagem de capa é obrigatória";
    if (!constructionManagerId) newErrors.constructionManagerId = "Responsável é obrigatório";
    if (!startDate) newErrors.startDate = "Data de início é obrigatória";
    if (!endDate) newErrors.endDate = "Data de fim é obrigatória";
    return newErrors;
  };

  const handleImageChange = (e) => {
    setCoverImage(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", coverImage);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Erro ao fazer upload da imagem");
      const { url: coverImageUrl } = await uploadRes.json();
      const workRes = await fetch("/api/levels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          coverImage: coverImageUrl,
          constructionManagerId,
          notes,
          startDate,
          endDate,
          parentId: null,
        }),
      });
      if (!workRes.ok) throw new Error("Erro ao criar obra");
      const created = await workRes.json();
      setCreatedWorkId(created.id);
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cw-bg">
      <form className="cw-form desktop" onSubmit={handleSubmit} noValidate>
        <div className="cw-header-row">
          <h2 className="cw-title">Criar Obra</h2>
          <button type="button" onClick={() => navigate("/obras")} className="cw-home-btn">
            ← Voltar às Obras
          </button>
        </div>
        <div className="cw-row">
          <div className="cw-field">
            <input type="text" id="cw-name" value={name} onChange={e => setName(e.target.value)} required className={name ? "has-value" : ""} />
            <label htmlFor="cw-name">Nome *</label>
            {errors.name && <span className="cw-error">{errors.name}</span>}
          </div>
        </div>
        <div className="cw-row">
          <div className="cw-field">
            <textarea id="cw-desc" value={description} onChange={e => setDescription(e.target.value)} required className={description ? "has-value" : ""} />
            <label htmlFor="cw-desc">Descrição *</label>
            {errors.description && <span className="cw-error">{errors.description}</span>}
          </div>
        </div>
        <div className="cw-row">
          <div className="cw-field">
            <input type="file" id="cw-img" accept="image/*" onChange={handleImageChange} />
            <label htmlFor="cw-img" className="cw-label-file">Imagem de Capa *</label>
            {errors.coverImage && <span className="cw-error">{errors.coverImage}</span>}
          </div>
        </div>
        <div className="cw-row cw-row-horizontal">
          <div className="cw-field cw-label-top cw-field-short">
            <label htmlFor="cw-manager" className="cw-label-top-label">Responsável de Obra *</label>
            <select id="cw-manager" value={constructionManagerId} onChange={e => setConstructionManagerId(e.target.value)} required>
              <option value="">Selecione o responsável...</option>
              {constructionManagers.map(mgr => (
                <option key={mgr.id} value={mgr.id}>{mgr.name}</option>
              ))}
            </select>
            {errors.constructionManagerId && <span className="cw-error">{errors.constructionManagerId}</span>}
          </div>
          <div className="cw-field cw-label-top cw-field-short">
            <label htmlFor="cw-start" className="cw-label-top-label">Data de Início *</label>
            <input type="date" id="cw-start" value={startDate} onChange={e => setStartDate(e.target.value)} required />
            {errors.startDate && <span className="cw-error">{errors.startDate}</span>}
          </div>
          <div className="cw-field cw-label-top cw-field-short">
            <label htmlFor="cw-end" className="cw-label-top-label">Data de Fim *</label>
            <input type="date" id="cw-end" value={endDate} onChange={e => setEndDate(e.target.value)} required />
            {errors.endDate && <span className="cw-error">{errors.endDate}</span>}
          </div>
        </div>
        <div className="cw-row">
          <div className="cw-field">
            <textarea id="cw-notes" value={notes} onChange={e => setNotes(e.target.value)} className={notes ? "has-value" : ""} />
            <label htmlFor="cw-notes">Notas</label>
          </div>
        </div>

        {errors.submit && <div className="cw-error cw-error-submit">{errors.submit}</div>}
        <button type="submit" className="cw-btn" disabled={loading}>{loading ? "A criar..." : "Criar Obra"}</button>
        {createdWorkId && (
          <div className="cw-success">
            <p>Obra criada com sucesso!</p>
            <button 
              type="button" 
              onClick={() => navigate(`/works/${createdWorkId}/levels`)} 
              className="cw-link-btn"
            >
              Ir para níveis desta obra →
            </button>
          </div>
        )}
      </form>
      <style>{`
                .cw-label-top {
                  display: flex;
                  flex-direction: column;
                  align-items: flex-start;
                }
                .cw-label-top-label {
                  font-size: 1rem;
                  color: #64748b;
                  font-weight: 500;
                  margin-bottom: 7px;
                  margin-left: 2px;
                }
        .cw-bg {
          min-height: 100vh;
          background: #f8fafc;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 40px;
        }
        .cw-form {
          background: #fff;
          border-radius: 18px;
          box-shadow: 0 4px 32px #0002;
          padding: 40px 48px 32px 48px;
          max-width: 800px;
          width: 100%;
          margin: 0 auto;
          position: relative;
        }
        @media (max-width: 900px) {
          .cw-form {
            max-width: 98vw;
            padding: 32px 8vw 24px 8vw;
          }
        }
        .cw-title {
          text-align: left;
          font-size: 2.2rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 32px;
        }
        .cw-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .cw-home-btn {
          background: #e2e8f0;
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          cursor: pointer;
          font-size: 0.95rem;
          transition: background 0.2s;
        }
        .cw-home-btn:hover {
          background: #cbd5e1;
        }
        .cw-row {
          margin-bottom: 24px;
          display: flex;
          gap: 32px;
        }
        .cw-row-horizontal {
          display: flex;
          gap: 32px;
          margin-bottom: 24px;
        }
        .cw-field-short {
          min-width: 180px;
          max-width: 240px;
        }
        .cw-row-2 {
          display: flex;
          gap: 32px;
        }
        .cw-field {
          position: relative;
          width: 100%;
          min-width: 220px;
        }
        .cw-field input[type="text"],
        .cw-field input[type="date"],
        .cw-field select,
        .cw-field textarea {
          width: 100%;
          padding: 16px 14px 16px 14px;
          border: 1.5px solid #cbd5e1;
          border-radius: 8px;
          font-size: 1.08rem;
          background: #f8fafc;
          outline: none;
          transition: border 0.2s;
          margin-top: 8px;
        }
        .cw-field input[type="file"] {
          margin-top: 8px;
        }
        .cw-field input:focus,
        .cw-field select:focus,
        .cw-field textarea:focus {
          border: 1.5px solid #6366f1;
        }
        .cw-field:not(.cw-label-top) label {
          position: absolute;
          left: 18px;
          top: 24px;
          color: #64748b;
          font-size: 1rem;
          pointer-events: none;
          background: transparent;
          transition: 0.2s;
        }
        .cw-field:not(.cw-label-top) input:focus + label,
        .cw-field:not(.cw-label-top) input.has-value + label,
        .cw-field:not(.cw-label-top) textarea:focus + label,
        .cw-field:not(.cw-label-top) textarea.has-value + label,
        .cw-field:not(.cw-label-top) select:focus + label,
        .cw-field:not(.cw-label-top) select.has-value + label {
          top: -12px;
          left: 12px;
          font-size: 0.92rem;
          color: #6366f1;
          background: #fff;
          padding: 0 6px;
        }
        .cw-label-file {
          position: static !important;
          display: block;
          margin-top: 8px;
          color: #64748b;
          font-size: 1rem;
        }
        .cw-error {
          color: #ef4444;
          font-size: 0.95rem;
          margin-top: 4px;
          display: block;
        }
        .cw-error-submit {
          text-align: center;
          margin-bottom: 10px;
        }
        .cw-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(90deg, #6366f1 0%, #2563eb 100%);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 1.1rem;
          font-weight: 700;
          margin-top: 10px;
          cursor: pointer;
          box-shadow: 0 2px 8px #6366f133;
          transition: background 0.2s, box-shadow 0.2s;
        }
        .cw-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .cw-btn:hover:not(:disabled) {
          background: linear-gradient(90deg, #2563eb 0%, #6366f1 100%);
          box-shadow: 0 4px 16px #6366f122;
        }
        .cw-success {
          margin-top: 24px;
          text-align: center;
        }
        .cw-link-btn {
          background: linear-gradient(90deg, #6366f1 0%, #2563eb 100%);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          font-size: 1.05rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 12px;
          transition: transform 0.2s;
        }
        .cw-link-btn:hover {
          transform: scale(1.05);
        }
      `}</style>
    </div>
  );
}