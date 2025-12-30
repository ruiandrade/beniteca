import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
        {menuOpen ? '✕' : '☰'}
      </button>
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="header-top">
            <h2>Beniteca</h2>
          </div>
          {user && (
            <div className="user-info">
              <div className="user-name">{user.name || user.email}</div>
              <button className="logout-btn" onClick={handleLogout}>Sair</button>
            </div>
          )}
        </div>
        <nav className="sidebar-nav" onClick={() => setMenuOpen(false)}>
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            📊 Dashboard
          </NavLink>
          <NavLink to="/obras" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            🏗️ As Minhas Obras
          </NavLink>
          <NavLink to="/archived" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            📦 Obras Arquivadas
          </NavLink>
          <NavLink to="/users" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            👥 Gerir Utilizadores
          </NavLink>
          <NavLink to="/permissions" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            🔐 Permissões
          </NavLink>
        </nav>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>

      <style>{`
        .layout {
          display: flex;
          min-height: 100vh;
          background: #f8fafc;
        }
        .hamburger {
          display: none;
          position: fixed;
          top: 16px;
          left: 16px;
          z-index: 1001;
          background: #1e293b;
          color: #fff;
          border: none;
          border-radius: 8px;
          width: 44px;
          height: 44px;
          font-size: 1.5rem;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .sidebar {
          width: 260px;
          background: #1e293b;
          color: #fff;
          display: flex;
          flex-direction: column;
          position: fixed;
          height: 100vh;
          overflow-y: auto;
          z-index: 1000;
          transition: transform 0.3s ease;
        }
        .sidebar-header {
          padding: 24px 20px;
          border-bottom: 1px solid #334155;
        }
        .header-top {
          margin-bottom: 12px;
        }
        .sidebar-header h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
          color: #fff;
        }
        .user-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-top: 12px;
          border-top: 1px solid #334155;
        }
        .user-name {
          font-size: 0.875rem;
          color: #cbd5e1;
          font-weight: 500;
        }
        .logout-btn {
          background: #ef4444;
          color: #fff;
          border: none;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .logout-btn:hover {
          background: #dc2626;
        }
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          padding: 16px 0;
        }
        .nav-link {
          display: flex;
          align-items: center;
          padding: 12px 20px;
          color: #cbd5e1;
          text-decoration: none;
          font-size: 1rem;
          font-weight: 500;
          transition: all 0.2s;
          border-left: 3px solid transparent;
        }
        .nav-link:hover {
          background: #334155;
          color: #fff;
        }
        .nav-link.active {
          background: #334155;
          color: #fff;
          border-left-color: #6366f1;
        }
        .main-content {
          margin-left: 260px;
          flex: 1;
          min-height: 100vh;
          width: calc(100% - 260px);
        }
        @media (max-width: 768px) {
          .hamburger {
            display: block;
          }
          .sidebar {
            transform: translateX(-100%);
          }
          .sidebar.open {
            transform: translateX(0);
          }
          .main-content {
            margin-left: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
