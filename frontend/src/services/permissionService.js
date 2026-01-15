/**
 * ============================================================
 * Report Service - Fetch report data and planning allocations
 * ============================================================
 */

export const fetchReportData = async (token, obraId, startDate, endDate) => {
  try {
    const response = await fetch(
      `/api/reports/${obraId}?fromDate=${startDate}&toDate=${endDate}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      }
    );
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`HTTP ${response.status}: ${errData.error || response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching report data:', error);
    throw error;
  }
};

export const fetchPlanningAllocations = async (token) => {
  try {
    // TODO: Planning allocations endpoint not yet implemented in backend
    // For now, return empty array to allow reports to work
    return [];
  } catch (error) {
    console.error('Error fetching planning allocations:', error);
    return [];
  }
};

/**
 * ============================================================
 * Permission Service - Get works and user permissions
 * ============================================================
 */

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
      let errorMessage = response.statusText || 'Erro ao obter obras';
      try {
        const data = await response.json();
        if (data?.error) errorMessage = data.error;
      } catch (_) {
        // ignore JSON parse errors; fall back to statusText
      }

      const err = new Error(`Erro ao obter obras: ${errorMessage}`);
      err.status = response.status;
      throw err;
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
