import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const navigate = useNavigate();
  const { login, user: authUser } = useAuth();

  useEffect(() => {
    // Carregar logo da empresa
    const fetchLogo = async () => {
      try {
        const response = await fetch('/api/logo');
        if (response.ok) {
          const data = await response.json();
          setLogoUrl(data.url);
        }
      } catch (err) {
        console.error('Erro ao carregar logo:', err);
      }
    };
    fetchLogo();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      // Redirect based on user role
      setTimeout(() => {
        const savedUser = JSON.parse(localStorage.getItem('authUser'));
        if (savedUser?.role === 'C') {
          navigate('/cliente');
        } else {
          navigate('/obras');
        }
      }, 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            {logoUrl && (
              <img src={logoUrl} alt="Beniteca Logo" className="login-logo-img" />
            )}
            <p className="login-subtitle">Sistema de Gestão de Obras</p>
          </div>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                required
                disabled={loading}
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'A autenticar...' : 'Entrar'}
            </button>
          </form>

          <div className="login-footer">
            <p className="login-help">
              Contacte o administrador para acesso
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .login-bg {
          min-height: 100vh;
          background: linear-gradient(135deg, #01a383 0%, #047857 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }
        .login-container {
          width: 100%;
          max-width: 400px;
        }
        .login-card {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(1, 163, 131, 0.25);
          padding: 48px 32px;
          border: 1px solid #d1fae5;
        }
        .login-header {
          text-align: center;
          margin-bottom: 32px;
        }
        .login-logo-img {
          max-width: 200px;
          height: auto;
          margin-bottom: 24px;
          display: block;
          margin-left: auto;
          margin-right: auto;
        }
        .login-title {
          font-size: 2.2rem;
          font-weight: 800;
          color: #01a383;
          margin: 0 0 8px;
          letter-spacing: -0.02em;
        }
        .login-subtitle {
          color: #047857;
          font-size: 1rem;
          margin: 0;
          font-weight: 500;
        }
        .login-error {
          background: #fee2e2;
          color: #b91c1c;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          border: 1px solid #fecaca;
          font-size: 0.9rem;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
        }
        .login-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .login-field label {
          font-weight: 600;
          color: #047857;
          font-size: 0.9rem;
        }
        .login-field input {
          padding: 12px;
          border: 2px solid #d1fae5;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .login-field input:focus {
          outline: none;
          border-color: #01a383;
          box-shadow: 0 0 0 3px rgba(1, 163, 131, 0.1);
        }
        .login-field input:disabled {
          background: #f0fdf9;
          cursor: not-allowed;
        }
        .login-btn {
          background: linear-gradient(135deg, #01a383 0%, #047857 100%);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 12px;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(1, 163, 131, 0.3);
        }
        .login-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .login-footer {
          text-align: center;
          border-top: 1px solid #d1fae5;
          padding-top: 16px;
        }
        .login-help {
          color: #047857;
          font-size: 0.85rem;
          margin: 0;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
