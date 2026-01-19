import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function MyAccount() {
  const { user, changePassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!newPassword || newPassword.length < 6) {
      setError('A password deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As passwords não coincidem.');
      return;
    }
    try {
      setLoading(true);
      await changePassword(newPassword);
      setSuccess('Password alterada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Erro ao alterar password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="account-page" style={{ padding: '32px', maxWidth: 800, margin: '0 auto' }}>
      <style>{`
        .account-form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 12px;
        }
        .account-input {
          width: 100%;
          padding: 10px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 1rem;
        }
        .account-input:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }
      `}</style>
      <h1>👤 A minha conta</h1>
      <p style={{ color: '#6b7280' }}>Informações da sua conta e alteração de password.</p>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Informação do Utilizador</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
          <div style={{ color: '#6b7280' }}>Email</div>
          <div>{user?.email}</div>
          <div style={{ color: '#6b7280' }}>Nome</div>
          <div>{user?.name || '-'}</div>
          <div style={{ color: '#6b7280' }}>Role</div>
          <div>{user?.role === 'A' ? 'Admin' : user?.role === 'C' ? 'Cliente' : 'Utilizador'}</div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginTop: 24 }}>
        <h2 style={{ marginTop: 0 }}>Alterar Password</h2>
        {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8, marginBottom: 12 }}>{error}</div>}
        {success && <div style={{ background: '#dcfce7', color: '#166534', padding: 12, borderRadius: 8, marginBottom: 12 }}>{success}</div>}
        <form onSubmit={handleChangePassword}>
          <div className="account-form-grid">
            <div>
              <label>Nova Password</label>
              <input className="account-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div>
              <label>Confirmar Password</label>
              <input className="account-input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <button type="submit" disabled={loading} style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
              {loading ? 'A atualizar...' : 'Atualizar Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
