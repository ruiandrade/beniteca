const { getConnection, sql } = require('../config/db');

class ReportService {
  /**
   * Get report data for a work/obra in a date range
   * @param {number} obraId - The root level ID (obra)
   * @param {string} fromDate - ISO date string (YYYY-MM-DD)
   * @param {string} toDate - ISO date string (YYYY-MM-DD)
   * @returns {Promise<Object>} Report data
   */
  async getObraReport(obraId, fromDate, toDate) {
    const pool = await getConnection();

    // 1. Get obra info - test with simpler query first
    const obraRes = await pool.request()
      .input('obraId', sql.Int, parseInt(obraId))
      .query(`
        SELECT 
          l.id,
          l.name,
          l.description,
          l.startDate,
          l.endDate,
          l.status,
          l.coverImage,
          l.constructionManagerId,
          l.siteDirectorId
        FROM [Level] l
        WHERE l.id = @obraId
      `);

    if (obraRes.recordset.length === 0) {
      throw new Error('Obra não encontrada');
    }

    const obra = obraRes.recordset[0];

    // 2. Get direct children for hierarchy view (only 1 level deep)
    const hierarchyRes = await pool.request()
      .input('obraId', sql.Int, parseInt(obraId))
      .query(`
        SELECT 
          l.id,
          l.name,
          l.status,
          l.startDate,
          l.endDate,
          l.hidden
        FROM [Level] l
        WHERE l.parentId = @obraId OR l.id = @obraId
        ORDER BY l.[order], l.id
      `);

    const hierarchyNodes = hierarchyRes.recordset;

    // 3. Get materials that are pending or ordered (in delivery status)
    const materialsRes = await pool.request()
      .input('obraId', sql.Int, parseInt(obraId))
      .query(`
        SELECT 
          m.id,
          m.description,
          m.brand,
          m.manufacturer,
          m.type,
          m.quantity,
          m.estimatedValue,
          m.deliveryStatus,
          m.assemblyStatus,
          m.createdAt
        FROM [Material] m
        WHERE m.levelId = @obraId AND (m.deliveryStatus IS NOT NULL OR m.assemblyStatus IS NOT NULL)
        ORDER BY m.createdAt DESC
      `);

    const materialsData = materialsRes.recordset;

    // 4. Get issue photos in date range
    const photosRes = await pool.request()
      .input('obraId', sql.Int, parseInt(obraId))
      .input('fromDate', sql.Date, new Date(fromDate))
      .input('toDate', sql.Date, new Date(toDate))
      .query(`
        SELECT 
          p.id,
          p.levelId,
          p.url as photoUrl,
          p.observacoes as observations,
          p.createdAt
        FROM [Photo] p
        WHERE p.type = 'issue'
          AND p.createdAt >= @fromDate
          AND p.createdAt <= @toDate
        ORDER BY p.createdAt DESC
      `);

    const photosData = photosRes.recordset;

    // 5. Get completed tasks
    const completedTasksRes = await pool.request()
      .input('obraId', sql.Int, parseInt(obraId))
      .input('fromDate', sql.Date, new Date(fromDate))
      .input('toDate', sql.Date, new Date(toDate))
      .query(`
        SELECT 
          l.id,
          l.name,
          l.status,
          l.updatedAt
        FROM [Level] l
        WHERE l.status = 'completed'
          AND l.updatedAt >= @fromDate
          AND l.updatedAt <= @toDate
        ORDER BY l.updatedAt DESC
      `);

    const completedTasks = completedTasksRes.recordset;

    return {
      obra,
      kpis: {
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0
      },
      hierarchy: hierarchyNodes,
      team: [],
      materials: materialsData,
      issuePhotos: photosData,
      completedTasks,
      monthlyStats: {
        completedLastMonth: 0,
        completedCurrentMonth: 0,
        completedCurrentWeek: 0,
        currentMonth: '1/2025'
      }
    };
  }
}

module.exports = new ReportService();
