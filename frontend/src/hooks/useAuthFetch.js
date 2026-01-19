import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Hook customizado para fazer fetch com tratamento automático de token expirado
 */
export function useAuthFetch() {
  const { token, logout } = useContext(AuthContext);

  const authFetch = async (url, options = {}) => {
    // Adicionar Authorization header se houver token
    const headers = {
      ...options.headers,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Se token expirou, fazer logout automático
    if (response.status === 401) {
      logout('expired');
      throw new Error('Token expirado');
    }

    return response;
  };

  return authFetch;
}
