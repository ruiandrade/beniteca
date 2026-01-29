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
    const obraIdNum = parseInt(obraId);

    // 1. Get obra info
    const obraRes = await pool.request()
      .input('obraId', sql.Int, obraIdNum)
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

    // 2. Get all levels in hierarchy to calculate KPIs (all descendants)
    const allLevelsRes = await pool.request()
      .input('obraId', sql.Int, obraIdNum)
      .query(`
        ;WITH LevelHierarchy AS (
          SELECT l.id, l.parentId, l.status, 0 as depth
          FROM [Level] l
          WHERE l.id = @obraId
          
          UNION ALL
          
          SELECT l.id, l.parentId, l.status, lh.depth + 1
          FROM [Level] l
          INNER JOIN LevelHierarchy lh ON l.parentId = lh.id
          WHERE lh.depth < 20
        )
        SELECT *
        FROM LevelHierarchy
        ORDER BY depth
      `);

    const allLevels = allLevelsRes.recordset;
    
    // Calculate KPIs: only count leaf nodes (levels with no children)
    const leafLevels = allLevels.filter(level => 
      !allLevels.some(l => l.parentId === level.id)
    );
    
    const totalTasks = leafLevels.length;
    const completedTasks = leafLevels.filter(l => l.status === 'completed').length;
    const pendingTasks = totalTasks - completedTasks;

    // 3. Get direct children for progress view with calculated progress - 3 levels deep
    const directChildrenRes = await pool.request()
      .input('obraId', sql.Int, obraIdNum)
      .query(`
        SELECT 
          l.id,
          l.name,
          l.status,
          l.startDate,
          l.endDate,
          l.hidden,
          l.[order],
          0 AS level
        FROM [Level] l
        WHERE l.parentId = @obraId
        ORDER BY l.[order], l.id
      `);

    const directChildren = directChildrenRes.recordset;
    
    // Function to get 3 levels of children for a given parent
    const getHierarchyLevels = async (parentId, depth = 0) => {
      if (depth >= 3) return [];
      
      const childRes = await pool.request()
        .input('parentId', sql.Int, parentId)
        .query(`
          SELECT 
            l.id,
            l.name,
            l.status,
            l.startDate,
            l.endDate,
            l.hidden,
            l.[order],
            ${depth + 1} AS level
          FROM [Level] l
          WHERE l.parentId = @parentId
          ORDER BY l.[order], l.id
        `);
      
      const children = childRes.recordset;
      const result = [...children];
      
      // Recursively get children of each child
      for (const child of children) {
        const grandchildren = await getHierarchyLevels(child.id, depth + 1);
        result.push(...grandchildren);
      }
      
      return result;
    };

    // Build hierarchical progress data with 3 levels
    const progressData = [];
    for (const child of directChildren) {
      const descendants = allLevels.filter(l => this.isDescendantOf(l, child, allLevels));
      const leafDescendants = descendants.filter(d => 
        !allLevels.some(l => l.parentId === d.id)
      );
      const completedDescendants = leafDescendants.filter(d => d.status === 'completed').length;
      const progressPercent = leafDescendants.length > 0 
        ? Math.round((completedDescendants / leafDescendants.length) * 100) 
        : 0;
      
      progressData.push({
        id: child.id,
        name: child.name,
        progressPercent,
        status: child.status,
        level: 1,
        children: []
      });

      // Get children (level 2)
      const level2Children = await getHierarchyLevels(child.id, 0);
      const level2ByParent = {};
      level2Children.filter(l => l.level === 1).forEach(l => {
        const descendants = allLevels.filter(d => this.isDescendantOf(d, l, allLevels));
        const leafDescendants = descendants.filter(d => 
          !allLevels.some(dl => dl.parentId === d.id)
        );
        const completedDescendants = leafDescendants.filter(d => d.status === 'completed').length;
        const progressPercent = leafDescendants.length > 0 
          ? Math.round((completedDescendants / leafDescendants.length) * 100) 
          : 0;
        
        progressData[progressData.length - 1].children.push({
          id: l.id,
          name: l.name,
          progressPercent,
          status: l.status,
          level: 2,
          children: []
        });
      });

      // Get grandchildren (level 3)
      for (const level2Item of progressData[progressData.length - 1].children) {
        const level3Children = await getHierarchyLevels(level2Item.id, 1);
        level3Children.filter(l => l.level === 2).forEach(l => {
          const descendants = allLevels.filter(d => this.isDescendantOf(d, l, allLevels));
          const leafDescendants = descendants.filter(d => 
            !allLevels.some(dl => dl.parentId === d.id)
          );
          const completedDescendants = leafDescendants.filter(d => d.status === 'completed').length;
          const progressPercent = leafDescendants.length > 0 
            ? Math.round((completedDescendants / leafDescendants.length) * 100) 
            : 0;
          
          level2Item.children.push({
            id: l.id,
            name: l.name,
            progressPercent,
            status: l.status,
            level: 3,
            children: []
          });
        });
      }
    }

    // 4. Get materials for the obra (direct children only, by levelId)
    const materialsRes = await pool.request()
      .input('obraId', sql.Int, obraIdNum)
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
        WHERE m.levelId IN (
          SELECT id FROM [Level] WHERE parentId = @obraId
        )
        ORDER BY m.createdAt DESC
      `);

    const materialsData = materialsRes.recordset;

    // 5. Get issue photos for the obra and its direct children only
    const photosRes = await pool.request()
      .input('obraId', sql.Int, obraIdNum)
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
        WHERE p.levelId IN (
          SELECT id FROM [Level] WHERE id = @obraId OR parentId = @obraId
        )
          AND p.type = 'issue'
          AND p.createdAt >= @fromDate
          AND p.createdAt <= @toDate
        ORDER BY p.createdAt DESC
      `);

    const photosData = photosRes.recordset;

    // 6. Get completed leaf node tasks (only tasks with no children) in date range
    const completedTasksListRes = await pool.request()
      .input('obraId', sql.Int, obraIdNum)
      .input('fromDate', sql.Date, new Date(fromDate))
      .input('toDate', sql.Date, new Date(toDate))
      .query(`
        ;WITH LevelHierarchy AS (
          SELECT l.id, l.parentId, l.name, l.status, l.completedAt, l.updatedAt, 0 as depth
          FROM [Level] l
          WHERE l.id = @obraId
          
          UNION ALL
          
          SELECT l.id, l.parentId, l.name, l.status, l.completedAt, l.updatedAt, lh.depth + 1
          FROM [Level] l
          INNER JOIN LevelHierarchy lh ON l.parentId = lh.id
          WHERE lh.depth < 20
        ),
        LeafNodes AS (
          SELECT lh.id, lh.name, lh.status, lh.completedAt, lh.updatedAt
          FROM LevelHierarchy lh
          WHERE NOT EXISTS (
            SELECT 1 FROM [Level] WHERE parentId = lh.id
          )
            AND lh.status = 'completed'
            AND lh.completedAt >= @fromDate
            AND lh.completedAt <= @toDate
        )
        SELECT * FROM LeafNodes
        ORDER BY completedAt DESC
      `);

    const completedTasksList = completedTasksListRes.recordset;

    // 7. Get ALL completed leaf node tasks (no date filter) for monthly/weekly/historical statistics
    // These stats should reflect the actual state from the beginning of time, not just the selected date range
    const allCompletedTasksRes = await pool.request()
      .input('obraId', sql.Int, obraIdNum)
      .query(`
        ;WITH LevelHierarchy AS (
          SELECT l.id, l.parentId, l.name, l.status, l.completedAt, l.updatedAt, 0 as depth
          FROM [Level] l
          WHERE l.id = @obraId
          
          UNION ALL
          
          SELECT l.id, l.parentId, l.name, l.status, l.completedAt, l.updatedAt, lh.depth + 1
          FROM [Level] l
          INNER JOIN LevelHierarchy lh ON l.parentId = lh.id
          WHERE lh.depth < 20
        ),
        LeafNodes AS (
          SELECT lh.id, lh.name, lh.status, lh.completedAt, lh.updatedAt
          FROM LevelHierarchy lh
          WHERE NOT EXISTS (
            SELECT 1 FROM [Level] WHERE parentId = lh.id
          )
            AND lh.status = 'completed'
        )
        SELECT * FROM LeafNodes
        ORDER BY completedAt DESC
      `);

    const allCompletedTasks = allCompletedTasksRes.recordset;

    // 8. Calculate monthly/weekly statistics based on ALL completed tasks
    // Stats are always relative to TODAY's month/week/year, regardless of the selected report date range
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

    // Calculate stats from allCompletedTasks using completedAt (not updatedAt)
    const completedLastMonth = allCompletedTasks.filter(t => {
      const date = new Date(t.completedAt || t.updatedAt); // fallback to updatedAt if completedAt is null
      return date >= startOfLastMonth && date <= endOfLastMonth;
    }).length;

    const completedCurrentMonth = allCompletedTasks.filter(t => {
      const date = new Date(t.completedAt || t.updatedAt);
      return date >= startOfMonth && date <= endOfMonth;
    }).length;

    const completedCurrentWeek = allCompletedTasks.filter(t => {
      const date = new Date(t.completedAt || t.updatedAt);
      return date >= startOfWeek && date <= endOfWeek;
    }).length;

    console.log(`📊 Report Stats for Obra ${obraIdNum}:`);
    console.log(`   Total All-Time Completed: ${allCompletedTasks.length}`);
    console.log(`   Last Month (${startOfLastMonth.toLocaleDateString()} - ${endOfLastMonth.toLocaleDateString()}): ${completedLastMonth}`);
    console.log(`   Current Month ${currentMonth}/${currentYear} (${startOfMonth.toLocaleDateString()} - ${endOfMonth.toLocaleDateString()}): ${completedCurrentMonth}`);
    console.log(`   Current Week (${startOfWeek.toLocaleDateString()} - ${endOfWeek.toLocaleDateString()}): ${completedCurrentWeek}`);
    console.log(`   Report Date Range: ${fromDate} - ${toDate}`);

    return {
      obra,
      monthlyStats: {
        completedLastMonth,
        completedCurrentMonth,
        completedCurrentWeek,
        currentMonth: `${currentMonth}/${currentYear}`
      },
      kpis: {
        totalTasks,
        completedTasks,
        pendingTasks
      },
      progress: progressData,
      materials: materialsData,
      issuePhotos: photosData,
      completedTasks: completedTasksList
    };
  }

  // Helper to check if a level is a descendant of another
  isDescendantOf(level, parent, allLevels) {
    let current = level;
    while (current) {
      if (current.parentId === parent.id) {
        return true;
      }
      current = allLevels.find(l => l.id === current.parentId);
    }
    return false;
  }
}

module.exports = new ReportService();
