/**
 * Get works accessible by current user
 */
export const getMyWorks = async (token) => {
  try {
    const response = await fetch(`/api/permissions/my-works`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erro ao obter obras: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erro em getMyWorks:', error);
    throw error;
  }
};

/**
 * Get user permission for a specific work
 */
export const getWorkPermission = async (token, levelId) => {
  try {
    const response = await fetch(`/api/permissions/work/${levelId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erro ao obter permissão: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erro em getWorkPermission:', error);
    throw error;
  }
};
