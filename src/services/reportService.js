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

    // 1. Get obra info
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
          l.siteDirectorId,
          cm.name as constructionManagerName,
          cm.email as constructionManagerEmail,
          sd.name as siteDirectorName,
          sd.email as siteDirectorEmail
        FROM [Level] l
        LEFT JOIN [User] cm ON l.constructionManagerId = cm.id
        LEFT JOIN [User] sd ON l.siteDirectorId = sd.id
        WHERE l.id = @obraId
      `);

    if (obraRes.recordset.length === 0) {
      throw new Error('Obra não encontrada');
    }

    const obra = obraRes.recordset[0];

    // 2. Get KPIs (leaf nodes only, at any depth)
    const kpisRes = await pool.request()
      .input('obraId', sql.Int, parseInt(obraId))
      .query(`
        WITH LevelHierarchy AS (
          SELECT l.id, l.status, 0 as depth
          FROM [Level] l
          WHERE l.id = @obraId

          UNION ALL

          SELECT l.id, l.status, lh.depth + 1
          FROM [Level] l
          INNER JOIN LevelHierarchy lh ON l.parentId = lh.id
          WHERE lh.depth < 10
        )
        SELECT 
          COUNT(*) as totalLeaves,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedLeaves
        FROM LevelHierarchy lh
        WHERE NOT EXISTS (SELECT 1 FROM [Level] WHERE parentId = lh.id)
      `);

    const kpisData = kpisRes.recordset[0] || { totalLeaves: 0, completedLeaves: 0 };

    // 3. Get direct children for hierarchy view (only 1 level deep)
    const hierarchyRes = await pool.request()
      .input('obraId', sql.Int, parseInt(obraId))
      .query(`
        SELECT 
          l.id,
          l.name,
          l.status,
          l.startDate,
          l.endDate,
          l.hidden,
          (SELECT COUNT(*) FROM [Level] WHERE parentId = l.id) as childCount
        FROM [Level] l
        WHERE l.parentId = @obraId OR l.id = @obraId
        ORDER BY l.[order], l.id
      `);

    const hierarchyNodes = hierarchyRes.recordset;

    // 4. Get team allocations (LevelUserDay) for the date range
    const teamRes = await pool.request()
      .input('obraId', sql.Int, parseInt(obraId))
      .input('fromDate', sql.Date, new Date(fromDate))
      .input('toDate', sql.Date, new Date(toDate))
      .query(`
        SELECT DISTINCT
          u.id as userId,
          u.name,
          u.email,
          lud.[day],
          lud.period
        FROM [LevelUserDay] lud
        INNER JOIN [User] u ON lud.userId = u.id
        WHERE lud.levelId = @obraId
          AND lud.[day] >= @fromDate
          AND lud.[day] <= @toDate
        ORDER BY u.name, lud.[day]
      `);

    const teamData = teamRes.recordset;

    // 5. Get materials in "Pedido" status
    const materialsRes = await pool.request()
      .input('obraId', sql.Int, parseInt(obraId))
      .query(`
        SELECT 
          m.id,
          m.name,
          m.brand,
          m.type,
          m.quantity,
          m.status,
          m.createdAt
        FROM [Material] m
        WHERE m.levelId = @obraId AND m.status = 'Pedido'
        ORDER BY m.createdAt DESC
      `);

    const materialsData = materialsRes.recordset;

    // 6. Get issue photos in date range
    const photosRes = await pool.request()
      .input('obraId', sql.Int, parseInt(obraId))
      .input('fromDate', sql.Date, new Date(fromDate))
      .input('toDate', sql.Date, new Date(toDate))
      .query(`
        SELECT 
          p.id,
          p.levelId,
          p.photoUrl,
          p.observations,
          p.createdAt,
          l.name as levelName
        FROM [Photo] p
        INNER JOIN [Level] l ON p.levelId = l.id
        WHERE p.type = 'issue'
          AND (l.id = @obraId OR l.parentId IN (
            SELECT id FROM [Level] WHERE parentId = @obraId
          ))
          AND p.createdAt >= @fromDate
          AND p.createdAt <= @toDate
        ORDER BY p.createdAt DESC
      `);

    const photosData = photosRes.recordset;

    // 7. Get completed tasks (leaf nodes only) updated in date range
    const tasksRes = await pool.request()
      .input('obraId', sql.Int, parseInt(obraId))
      .input('fromDate', sql.Date, new Date(fromDate))
      .input('toDate', sql.Date, new Date(toDate))
      .query(`
        WITH LevelHierarchy AS (
          SELECT l.id, l.name, l.status, l.updatedAt, 0 as depth
          FROM [Level] l
          WHERE l.id = @obraId

          UNION ALL

          SELECT l.id, l.name, l.status, l.updatedAt, lh.depth + 1
          FROM [Level] l
          INNER JOIN LevelHierarchy lh ON l.parentId = lh.id
          WHERE lh.depth < 10
        )
        SELECT 
          lh.id,
          lh.name,
          lh.status,
          lh.updatedAt
        FROM LevelHierarchy lh
        WHERE lh.status = 'completed'
          AND NOT EXISTS (SELECT 1 FROM [Level] WHERE parentId = lh.id)
          AND lh.updatedAt >= @fromDate
          AND lh.updatedAt <= @toDate
        ORDER BY lh.updatedAt DESC
      `);

    const completedTasks = tasksRes.recordset;

    // 8. Calculate current month/week statistics
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0);
    
    const startOfLastMonth = new Date(currentYear, currentMonth - 2, 1);
    const endOfLastMonth = new Date(currentYear, currentMonth - 1, 0);
    
    const getMonday = (date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(d.setDate(diff));
    };
    const startOfWeek = getMonday(today);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);

    const statsRes = await pool.request()
      .input('obraId', sql.Int, parseInt(obraId))
      .input('lastMonthStart', sql.Date, startOfLastMonth)
      .input('lastMonthEnd', sql.Date, endOfLastMonth)
      .input('currentMonthStart', sql.Date, startOfMonth)
      .input('currentMonthEnd', sql.Date, endOfMonth)
      .input('weekStart', sql.Date, startOfWeek)
      .input('weekEnd', sql.Date, endOfWeek)
      .query(`
        WITH LevelHierarchy AS (
          SELECT l.id, l.status, l.updatedAt, 0 as depth
          FROM [Level] l
          WHERE l.id = @obraId

          UNION ALL

          SELECT l.id, l.status, l.updatedAt, lh.depth + 1
          FROM [Level] l
          INNER JOIN LevelHierarchy lh ON l.parentId = lh.id
          WHERE lh.depth < 10
        ),
        LeafNodes AS (
          SELECT lh.id, lh.status, lh.updatedAt
          FROM LevelHierarchy lh
          WHERE NOT EXISTS (SELECT 1 FROM [Level] WHERE parentId = lh.id)
        )
        SELECT 
          SUM(CASE WHEN status = 'completed' AND updatedAt >= @lastMonthStart AND updatedAt <= @lastMonthEnd THEN 1 ELSE 0 END) as completedLastMonth,
          SUM(CASE WHEN status = 'completed' AND updatedAt >= @currentMonthStart AND updatedAt <= @currentMonthEnd THEN 1 ELSE 0 END) as completedCurrentMonth,
          SUM(CASE WHEN status = 'completed' AND updatedAt >= @weekStart AND updatedAt <= @weekEnd THEN 1 ELSE 0 END) as completedCurrentWeek
        FROM LeafNodes
      `);

    const statsData = statsRes.recordset[0] || { 
      completedLastMonth: 0, 
      completedCurrentMonth: 0, 
      completedCurrentWeek: 0 
    };

    return {
      obra,
      kpis: {
        totalTasks: kpisData.totalLeaves,
        completedTasks: kpisData.completedLeaves,
        pendingTasks: kpisData.totalLeaves - kpisData.completedLeaves
      },
      hierarchy: hierarchyNodes,
      team: teamData,
      materials: materialsData,
      issuePhotos: photosData,
      completedTasks,
      monthlyStats: {
        completedLastMonth: statsData.completedLastMonth,
        completedCurrentMonth: statsData.completedCurrentMonth,
        completedCurrentWeek: statsData.completedCurrentWeek,
        currentMonth: `${currentMonth}/${currentYear}`
      }
    };
  }
}

module.exports = new ReportService();
