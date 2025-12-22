import React from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>📊 Analytics & Dashboard</h1>
        <p>Visão geral das suas obras e projetos</p>
      </div>
      
      <div className="dashboard-content">
        <p className="dashboard-placeholder">Em breve: estatísticas, gráficos e análises detalhadas</p>
      </div>

      <style>{`
        .dashboard-container {
          padding: 32px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .dashboard-header {
          margin-bottom: 32px;
        }
        .dashboard-header h1 {
          font-size: 2rem;
          color: #1e293b;
          margin-bottom: 8px;
        }
        .dashboard-header p {
          color: #64748b;
          font-size: 1.1rem;
        }
        .dashboard-content {
          background: #fff;
          border-radius: 12px;
          padding: 48px;
          text-align: center;
          box-shadow: 0 2px 16px rgba(0,0,0,0.05);
          border: 1px solid #e2e8f0;
        }
        .dashboard-placeholder {
          color: #94a3b8;
          font-size: 1.1rem;
        }
      `}</style>
    </div>
  );
}
