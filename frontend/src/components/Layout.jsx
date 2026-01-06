import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const res = await fetch('/api/logo');
        const data = await res.json();
        setLogoUrl(data.url);
      } catch (error) {
        console.error('Failed to load logo:', error);
      }
    };
    fetchLogo();
  }, []);

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
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Beniteca Logo" 
                className="logo"
                onError={(e) => {
                  console.error('Logo failed to load');
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <h2 style={{ color: '#01a383', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Beniteca</h2>
            )}
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
          <NavLink to="/planeamento-global" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            📅 Planeamento Global
          </NavLink>
          <NavLink to="/presencas" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            📋 Presenças
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
          background: #f0fdf9;
        }
        .hamburger {
          display: none;
          position: fixed;
          top: 16px;
          left: 16px;
          z-index: 1001;
          background: #01a383;
          color: #fff;
          border: none;
          border-radius: 8px;
          width: 44px;
          height: 44px;
          font-size: 1.5rem;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(1, 163, 131, 0.2);
          transition: all 0.2s ease;
        }
        .hamburger:hover {
          background: #018568;
          transform: translateY(-1px);
        }
        .sidebar {
          width: 260px;
          background: #fff;
          color: #1f2937;
          display: flex;
          flex-direction: column;
          position: fixed;
          height: 100vh;
          overflow-y: auto;
          z-index: 1000;
          transition: transform 0.3s ease;
          border-right: 1px solid #d1fae5;
          box-shadow: 2px 0 12px rgba(1, 163, 131, 0.06);
        }
        .sidebar-header {
          padding: 24px 20px;
          border-bottom: 1px solid #d1fae5;
          background: linear-gradient(135deg, #d1fae5 0%, #f0fdf9 100%);
        }
        .header-top {
          margin-bottom: 12px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .logo {
          width: 100%;
          max-width: 180px;
          height: auto;
          object-fit: contain;
        }
        .sidebar-header h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
          color: #01a383;
        }
        .user-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-top: 12px;
          border-top: 1px solid #a7f3d0;
        }
        .user-name {
          font-size: 0.875rem;
          color: #047857;
          font-weight: 500;
        }
        .logout-btn {
          background: #fee2e2;
          color: #dc2626;
          border: none;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .logout-btn:hover {
          background: #fecaca;
          transform: translateY(-1px);
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
          color: #6b7280;
          text-decoration: none;
          font-size: 1rem;
          font-weight: 500;
          transition: all 0.2s ease;
          border-left: 3px solid transparent;
        }
        .nav-link:hover {
          background: #f0fdf9;
          color: #01a383;
          border-left-color: #a7f3d0;
        }
        .nav-link.active {
          background: #d1fae5;
          color: #01a383;
          border-left-color: #01a383;
          font-weight: 600;
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
