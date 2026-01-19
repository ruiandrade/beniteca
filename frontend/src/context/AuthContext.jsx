import React, { createContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

const INACTIVITY_TIMEOUT = 4 * 60 * 60 * 1000; // 4 horas em millisegundos

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimerRef = useRef(null);
  const navigate = useNavigate();

  // Resetar timer de inatividade
  const resetInactivityTimer = () => {
    if (!token) return;
    
    // Limpar timer anterior
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    // Criar novo timer de 4 horas
    inactivityTimerRef.current = setTimeout(() => {
      logout('inactivity');
    }, INACTIVITY_TIMEOUT);
  };

  // Carregar token do localStorage ao iniciar
  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('authUser');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // Tracking de atividade do utilizador (mouse, keyboard, touch)
  useEffect(() => {
    if (!token) return;

    // Iniciar timer quando user autentica
    resetInactivityTimer();

    // Lista de eventos que indicam atividade
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      resetInactivityTimer();
    };

    // Adicionar listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Login falhou');
    }
    const data = await res.json();
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('authUser', JSON.stringify(data.user));
    
    // Iniciar tracking de inatividade após login
    resetInactivityTimer();
  };

  const logout = (reason = 'manual') => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    
    // Limpar timer de inatividade
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    
    // Mostrar mensagem se foi por inatividade ou token expirado
    if (reason === 'inactivity') {
      alert('Sessão terminada por inatividade (4 horas sem uso).');
    } else if (reason === 'expired') {
      alert('Token expirado. Por favor faça login novamente.');
    }
    
    navigate('/login');
  };

  const changePassword = async (newPassword) => {
    if (!token) throw new Error('Não autenticado');
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ newPassword })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Falha ao mudar password');
    }
  };

  const createUser = async (email, name, status, password) => {
    if (!token) throw new Error('Não autenticado');
    const res = await fetch('/api/auth/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ email, name, status, password })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Falha ao criar utilizador');
    }
    return await res.json();
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, changePassword, createUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
