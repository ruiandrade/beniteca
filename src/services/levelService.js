const { getConnection, sql } = require('../config/db');

class LevelService {
  // Compute next [order] value for siblings under the same parent
  async getNextOrderValue(pool, parentId, tx = null) {
    const request = tx ? new sql.Request(tx) : pool.request();
    let query;
    if (parentId === null || parentId === undefined || parentId === 'null') {
      query = 'SELECT ISNULL(MAX([order]), 0) + 1 as nextOrder FROM Level WHERE parentId IS NULL';
    } else {
      query = 'SELECT ISNULL(MAX([order]), 0) + 1 as nextOrder FROM Level WHERE parentId = @parentId';
      request.input('parentId', sql.Int, parseInt(parentId));
    }
    const result = await request.query(query);
    return result.recordset[0].nextOrder || 1;
  }

  async createLevel(data) {
    const pool = await getConnection();
    const parentId = (data.parentId === undefined || data.parentId === null || data.parentId === 'null')
      ? null
      : parseInt(data.parentId);
    const constructionManagerId = data.constructionManagerId ? parseInt(data.constructionManagerId) : null;
    const siteDirectorId = data.siteDirectorId ? parseInt(data.siteDirectorId) : null;
    const createdBy = data.createdBy ? parseInt(data.createdBy) : null;
    console.log('📝 SERVICE - createLevel - createdBy value:', createdBy, 'from data.createdBy:', data.createdBy);
    // Check if parent exists if provided
    if (parentId) {
      const parentResult = await pool.request()
        .input('parentId', sql.Int, parentId)
        .query('SELECT id FROM Level WHERE id = @parentId');
      if (parentResult.recordset.length === 0) throw new Error('Parent level not found');
    }
    const orderValue = data.order !== undefined ? data.order : await this.getNextOrderValue(pool, parentId);
    // Insert new level
    const insertQuery = `
      INSERT INTO Level (name, description, parentId, startDate, endDate, status, notes, coverImage, constructionManagerId, siteDirectorId, [order], createdBy)
      OUTPUT INSERTED.*
      VALUES (@name, @description, @parentId, @startDate, @endDate, @status, @notes, @coverImage, @constructionManagerId, @siteDirectorId, @order, @createdBy)
    `;
    const result = await pool.request()
      .input('name', sql.NVarChar, data.name)
      .input('description', sql.NVarChar, data.description)
      .input('parentId', sql.Int, parentId)
      .input('startDate', sql.DateTime, data.startDate)
      .input('endDate', sql.DateTime, data.endDate)
      .input('status', sql.NVarChar, data.status || 'active')
      .input('notes', sql.NVarChar, data.notes)
      .input('coverImage', sql.NVarChar, data.coverImage)
      .input('constructionManagerId', sql.Int, constructionManagerId)
      .input('siteDirectorId', sql.Int, siteDirectorId)
      .input('order', sql.Int, orderValue)
      .input('createdBy', sql.Int, createdBy)
      .query(insertQuery);
    return result.recordset[0];
  }

  async createHierarchy(data) {
    // data = { root: {...}, templates: [{name, count, children: [{name, count, ...}]}] }
    const pool = await getConnection();
    const tx = new sql.Transaction(pool);
    await tx.begin();

    try {
      // Create root level
      const rootReq = new sql.Request(tx);
      const rootOrder = data.root && data.root.order !== undefined
        ? data.root.order
        : await this.getNextOrderValue(pool, null, tx);

      const rootResult = await rootReq
        .input('name', sql.NVarChar, data.root.name)
        .input('description', sql.NVarChar, data.root.description)
        .input('startDate', sql.DateTime, data.root.startDate)
        .input('endDate', sql.DateTime, data.root.endDate)
        .input('status', sql.NVarChar, data.root.status || 'active')
        .input('notes', sql.NVarChar, data.root.notes)
        .input('coverImage', sql.NVarChar, data.root.coverImage)
        .input('constructionManagerId', sql.Int, data.root.constructionManagerId ? parseInt(data.root.constructionManagerId) : null)
        .input('siteDirectorId', sql.Int, data.root.siteDirectorId ? parseInt(data.root.siteDirectorId) : null)
        .input('order', sql.Int, rootOrder)
        .input('createdBy', sql.Int, data.root.createdBy ? parseInt(data.root.createdBy) : null)
        .query(`
          INSERT INTO Level (name, description, parentId, startDate, endDate, status, notes, coverImage, constructionManagerId, siteDirectorId, [order], createdBy)
          OUTPUT INSERTED.*
          VALUES (@name, @description, NULL, @startDate, @endDate, @status, @notes, @coverImage, @constructionManagerId, @siteDirectorId, @order, @createdBy)
        `);
      
      const rootId = rootResult.recordset[0].id;

      // Recursively create children from templates
      const createChildren = async (parentId, templates) => {
        for (const template of templates) {
          for (let i = 1; i <= template.count; i++) {
            const childName = `${template.name} ${i}`;
            const childOrder = await this.getNextOrderValue(pool, parentId, tx);
            const childReq = new sql.Request(tx);
            const childResult = await childReq
              .input('name', sql.NVarChar, childName)
              .input('description', sql.NVarChar, '')
              .input('parentId', sql.Int, parentId)
              .input('startDate', sql.DateTime, data.root.startDate)
              .input('endDate', sql.DateTime, data.root.endDate)
              .input('status', sql.NVarChar, 'active')
              .input('order', sql.Int, childOrder)
              .input('createdBy', sql.Int, data.root.createdBy ? parseInt(data.root.createdBy) : null)
              .query(`
                INSERT INTO Level (name, description, parentId, startDate, endDate, status, [order], createdBy)
                OUTPUT INSERTED.*
                VALUES (@name, @description, @parentId, @startDate, @endDate, @status, @order, @createdBy)
              `);
            
            const childId = childResult.recordset[0].id;
            
            // Create grandchildren if templates has children
            if (template.children && template.children.length > 0) {
              await createChildren(childId, template.children);
            }
          }
        }
      };

      await createChildren(rootId, data.templates);
      await tx.commit();

      return { id: rootId, message: 'Hierarquia criada com sucesso' };
    } catch (err) {
      await tx.rollback().catch(() => {});
      throw err;
    }
  }

  async createHierarchyFromExcel(data) {
    // data = { rootId: parentId, entries: [{path, description, startDate, endDate}, ...] }
    // This creates levels from a path-based structure with full transaction support
    const pool = await getConnection();
    const tx = new sql.Transaction(pool);
    await tx.begin();

    try {
      const pathMap = new Map();
      pathMap.set('__ROOT__', data.rootId);

      // Sort entries by depth to ensure parents are created first
      const sorted = data.entries.sort((a, b) => {
        const da = a.path.split('/').length;
        const db = b.path.split('/').length;
        return da - db;
      });

      for (const entry of sorted) {
        const parts = entry.path.split('/').map((p) => p.trim()).filter(Boolean);
        if (parts.length === 0) continue;

        const parentKey = parts.slice(0, -1).join('/') || '__ROOT__';
        const parentId = pathMap.get(parentKey);

        if (!parentId) {
          throw new Error(`Parent path não encontrado: ${parentKey}`);
        }

        const levelName = parts[parts.length - 1];
        const orderValue = await this.getNextOrderValue(pool, parentId, tx);

        const req = new sql.Request(tx);
        const result = await req
          .input('name', sql.NVarChar, levelName)
          .input('description', sql.NVarChar, entry.description || levelName)
          .input('parentId', sql.Int, parentId)
          .input('startDate', sql.DateTime, entry.startDate || null)
          .input('endDate', sql.DateTime, entry.endDate || null)
          .input('status', sql.NVarChar, 'active')
          .input('order', sql.Int, orderValue)
          .input('createdBy', sql.Int, data.createdBy ? parseInt(data.createdBy) : null)
          .query(`
            INSERT INTO Level (name, description, parentId, startDate, endDate, status, [order], createdBy)
            OUTPUT INSERTED.*
            VALUES (@name, @description, @parentId, @startDate, @endDate, @status, @order, @createdBy)
          `);

        const createdId = result.recordset[0].id;
        const currentKey = parts.join('/');
        pathMap.set(currentKey, createdId);
      }

      await tx.commit();
      return { message: 'Hierarquia criada com sucesso', count: sorted.length };
    } catch (err) {
      await tx.rollback().catch(() => {});
      throw err;
    }
  }

  async getLevels(filter = {}) {
    const pool = await getConnection();
    let query = `
         SELECT l.*, 
           p.name as parentName,
           cm.name as constructionManagerName,
           cm.email as constructionManagerEmail,
           sd.name as siteDirectorName,
           sd.email as siteDirectorEmail,
           (SELECT COUNT(*) FROM Level WHERE parentId = l.id) as childrenCount,
           (SELECT COUNT(*) FROM Level WHERE parentId = l.id AND status = 'completed') as completedChildren
          FROM Level l
          LEFT JOIN Level p ON l.parentId = p.id
          LEFT JOIN [User] cm ON l.constructionManagerId = cm.id
          LEFT JOIN [User] sd ON l.siteDirectorId = sd.id`;

    const req = pool.request();
    if (Object.prototype.hasOwnProperty.call(filter, 'parentId')) {
      if (filter.parentId === null || filter.parentId === 'null' || filter.parentId === '') {
        query += `\n      WHERE l.parentId IS NULL`;
      } else {
        query += `\n      WHERE l.parentId = @parentId`;
        req.input('parentId', sql.Int, parseInt(filter.parentId));
      }
    }
    query += `\n      ORDER BY ISNULL(l.[order], l.id), l.id`;

    const result = await req.query(query);
    // For includes like children, materials, etc., we'd need separate queries or complex JOINs
    // For simplicity, return basic info; can expand later
    return result.recordset;
  }

  // Helper: fetch direct children with counts
  async getLevelChildren(parentId) {
    const pool = await getConnection();
    const query = `
            SELECT l.*, 
              p.name as parentName,
              cm.name as constructionManagerName,
              cm.email as constructionManagerEmail,
              sd.name as siteDirectorName,
              sd.email as siteDirectorEmail,
              (SELECT COUNT(*) FROM Level WHERE parentId = l.id) as childrenCount,
              (SELECT COUNT(*) FROM Level WHERE parentId = l.id AND status = 'completed') as completedChildren
            FROM Level l
            LEFT JOIN Level p ON l.parentId = p.id
            LEFT JOIN [User] cm ON l.constructionManagerId = cm.id
            LEFT JOIN [User] sd ON l.siteDirectorId = sd.id
      WHERE l.parentId = @parentId
      ORDER BY ISNULL(l.[order], l.id), l.id
    `;
    const result = await (await getConnection()).request()
      .input('parentId', sql.Int, parseInt(parentId))
      .query(query);
    return result.recordset;
  }

  // Recursively build tree of levels
  async buildTree(parentId) {
    const children = await this.getLevelChildren(parentId);
    const nodes = [];
    for (const child of children) {
      const node = { ...child };
      node.children = await this.buildTree(child.id);
      nodes.push(node);
    }
    return nodes;
  }

  // Get full tree for a root level
  async getLevelTree(rootId) {
    const root = await this.getLevelById(rootId);
    if (!root) return null;
    const children = await this.buildTree(rootId);
    return { root, children };
  }

  async getLevelById(id) {
    const pool = await getConnection();
    const query = `
      SELECT l.*, 
             p.name as parentName,
             cm.name as constructionManagerName,
             cm.email as constructionManagerEmail,
             (SELECT COUNT(*) FROM Level WHERE parentId = l.id) as childrenCount,
             (SELECT COUNT(*) FROM Level WHERE parentId = l.id AND status = 'completed') as completedChildren
      FROM Level l
      LEFT JOIN Level p ON l.parentId = p.id
      LEFT JOIN [User] cm ON l.constructionManagerId = cm.id
      WHERE l.id = @id
    `;
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query(query);
    return result.recordset[0];
  }

  async updateLevel(id, data) {
    const pool = await getConnection();
    
    // Build dynamic update query based on provided fields
    const fields = [];
    const request = pool.request().input('id', sql.Int, parseInt(id));
    
    if (data.name !== undefined) {
      fields.push('name = @name');
      request.input('name', sql.NVarChar, data.name);
    }
    if (data.description !== undefined) {
      fields.push('description = @description');
      request.input('description', sql.NVarChar, data.description);
    }
    if (data.hasOwnProperty('parentId')) {
      fields.push('parentId = @parentId');
      request.input('parentId', sql.Int, data.parentId);
    }
    if (data.startDate !== undefined) {
      fields.push('startDate = @startDate');
      request.input('startDate', sql.DateTime, data.startDate);
    }
    if (data.endDate !== undefined) {
      fields.push('endDate = @endDate');
      request.input('endDate', sql.DateTime, data.endDate);
    }
    if (data.status !== undefined) {
      fields.push('status = @status');
      request.input('status', sql.NVarChar, data.status);
      // If status is changing to 'completed', set completedAt to now
      if (data.status === 'completed') {
        fields.push('completedAt = GETDATE()');
      }
    }
    if (data.notes !== undefined) {
      fields.push('notes = @notes');
      request.input('notes', sql.NVarChar, data.notes);
    }
    if (data.coverImage !== undefined) {
      fields.push('coverImage = @coverImage');
      request.input('coverImage', sql.NVarChar, data.coverImage);
    }
    if (data.constructionManagerId !== undefined) {
      fields.push('constructionManagerId = @constructionManagerId');
      request.input('constructionManagerId', sql.Int, data.constructionManagerId ? parseInt(data.constructionManagerId) : null);
    }
    if (data.siteDirectorId !== undefined) {
      fields.push('siteDirectorId = @siteDirectorId');
      request.input('siteDirectorId', sql.Int, data.siteDirectorId ? parseInt(data.siteDirectorId) : null);
    }
    if (data.hidden !== undefined) {
      fields.push('hidden = @hidden');
      request.input('hidden', sql.Bit, data.hidden);
    }
    if (data.order !== undefined) {
      fields.push('[order] = @order');
      request.input('order', sql.Int, data.order);
    }
    
    if (fields.length === 0) {
      throw new Error('No fields to update');
    }
    
    fields.push('updatedAt = GETDATE()');
    
    const updateQuery = `
      UPDATE Level
      SET ${fields.join(', ')}
      OUTPUT INSERTED.*
      WHERE id = @id
    `;
    
    const result = await request.query(updateQuery);
    return result.recordset[0];
  }

  async deleteLevel(id) {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('DELETE FROM Level OUTPUT DELETED.* WHERE id = @id');
    return result.recordset[0];
  }

  // Check if level can be completed
  async canCompleteLevel(id) {
    const level = await this.getLevelById(id);
    if (!level) return false;
    // All children must be completed - need to query children
    const pool = await getConnection();
    const childrenResult = await pool.request()
      .input('parentId', sql.Int, parseInt(id))
      .query('SELECT status FROM Level WHERE parentId = @parentId');
    for (const child of childrenResult.recordset) {
      if (child.status !== 'completed') return false;
    }
    return true;
  }

  // Mark as completed
  async completeLevel(id) {
    if (!(await this.canCompleteLevel(id))) {
      throw new Error('Cannot complete level: children not completed');
    }
    return await this.updateLevel(id, { status: 'completed' });
  }

  // Reorder direct children under a parent by orderedIds array
  async reorderLevels(parentId, orderedIds) {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      throw new Error('orderedIds array is required');
    }

    const normalizedParent = (parentId === undefined || parentId === null || parentId === 'null')
      ? null
      : parseInt(parentId);

    const pool = await getConnection();
    const tx = new sql.Transaction(pool);
    await tx.begin();

    try {
      const normalizedIds = orderedIds.map((id) => parseInt(id));

      const existingReq = new sql.Request(tx);
      let existingQuery = 'SELECT id FROM Level WHERE ';
      if (normalizedParent === null) {
        existingQuery += 'parentId IS NULL';
      } else {
        existingQuery += 'parentId = @parentId';
        existingReq.input('parentId', sql.Int, normalizedParent);
      }
      const existing = await existingReq.query(existingQuery);
      const existingIds = new Set(existing.recordset.map((row) => row.id));

      const uniqueIds = new Set(normalizedIds);
      if (uniqueIds.size !== existingIds.size || normalizedIds.length !== existingIds.size) {
        throw new Error('orderedIds must include all direct children exactly once');
      }

      for (const levelId of normalizedIds) {
        if (!existingIds.has(levelId)) {
          throw new Error('One or more levels do not belong to the specified parent');
        }
      }

      let position = 1;
      for (const levelId of normalizedIds) {
        const updateReq = new sql.Request(tx);
        updateReq.input('order', sql.Int, position++);
        updateReq.input('id', sql.Int, levelId);
        if (normalizedParent === null) {
          await updateReq.query('UPDATE Level SET [order] = @order, updatedAt = GETDATE() WHERE id = @id AND parentId IS NULL');
        } else {
          updateReq.input('parentId', sql.Int, normalizedParent);
          await updateReq.query('UPDATE Level SET [order] = @order, updatedAt = GETDATE() WHERE id = @id AND parentId = @parentId');
        }
      }

      await tx.commit();
      return { success: true };
    } catch (err) {
      await tx.rollback().catch(() => {});
      throw err;
    }
  }

  async getHierarchyTree(rootId) {
    const pool = await getConnection();
    
    // SQL recursivo usando CTE (Common Table Expression) para buscar toda a hierarquia
    const query = `
      WITH HierarchyCTE AS (
        -- Anchor: o nó raiz
        SELECT 
          l.id,
          l.name,
          l.description,
          l.parentId,
          l.startDate,
          l.endDate,
          l.status,
          l.notes,
          l.coverImage,
          l.constructionManagerId,
          l.siteDirectorId,
          l.[order],
          l.hidden,
          l.createdAt,
          l.updatedAt,
          0 AS depth,
          CAST(l.id AS VARCHAR(MAX)) AS path
        FROM Level l
        WHERE l.id = @rootId
        
        UNION ALL
        
        -- Recursão: todos os descendentes
        SELECT 
          l.id,
          l.name,
          l.description,
          l.parentId,
          l.startDate,
          l.endDate,
          l.status,
          l.notes,
          l.coverImage,
          l.constructionManagerId,
          l.siteDirectorId,
          l.[order],
          l.hidden,
          l.createdAt,
          l.updatedAt,
          h.depth + 1,
          h.path + '/' + CAST(l.id AS VARCHAR(MAX))
        FROM Level l
        INNER JOIN HierarchyCTE h ON l.parentId = h.id
        WHERE h.depth < 10
      )
      SELECT 
        h.*,
        -- Verificar se tem filhos (se é nó folha ou não)
        CASE WHEN EXISTS (SELECT 1 FROM Level WHERE parentId = h.id) THEN 1 ELSE 0 END AS hasChildren
      FROM HierarchyCTE h
      ORDER BY h.path, h.[order]
    `;

    const result = await pool.request()
      .input('rootId', sql.Int, parseInt(rootId))
      .query(query);

    if (result.recordset.length === 0) {
      return null;
    }

    // Construir a árvore hierárquica a partir dos resultados flat
    const nodesMap = new Map();
    const rootNode = result.recordset[0];
    
    // Criar todos os nós
    result.recordset.forEach(row => {
      nodesMap.set(row.id, {
        level: {
          id: row.id,
          name: row.name,
          description: row.description,
          parentId: row.parentId,
          startDate: row.startDate,
          endDate: row.endDate,
          status: row.status,
          notes: row.notes,
          coverImage: row.coverImage,
          constructionManagerId: row.constructionManagerId,
          siteDirectorId: row.siteDirectorId,
          order: row.order,
          hidden: row.hidden,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        },
        children: [],
        depth: row.depth,
        hasChildren: row.hasChildren === 1,
        isLeaf: row.hasChildren === 0
      });
    });

    // Construir a árvore linkando pais e filhos
    result.recordset.forEach(row => {
      if (row.parentId && nodesMap.has(row.parentId)) {
        const parentNode = nodesMap.get(row.parentId);
        const childNode = nodesMap.get(row.id);
        parentNode.children.push(childNode);
      }
    });

    return nodesMap.get(rootNode.id);
  }

  // Calculate leaf nodes ratio for a level (recursive)
  async getLeafNodesRatio(levelId) {
    const pool = await getConnection();
    
    // Get all descendants using the same approach as reportService
    const allLevelsRes = await pool.request()
      .input('levelId', sql.Int, levelId)
      .query(`
        ;WITH LevelHierarchy AS (
          SELECT l.id, l.parentId, l.status, 0 as depth
          FROM [Level] l
          WHERE l.id = @levelId
          
          UNION ALL
          
          SELECT l.id, l.parentId, l.status, lh.depth + 1
          FROM [Level] l
          INNER JOIN LevelHierarchy lh ON l.parentId = lh.id
          WHERE lh.depth < 20 AND l.hidden = 0
        )
        SELECT *
        FROM LevelHierarchy
        ORDER BY depth
      `);

    const allLevels = allLevelsRes.recordset;
    
    // Filter to only leaf nodes (levels with no children)
    const leafLevels = allLevels.filter(level => 
      !allLevels.some(l => l.parentId === level.id)
    );
    
    const total = leafLevels.length;
    const completed = leafLevels.filter(l => l.status === 'completed').length;
    
    return {
      completed,
      total,
      ratio: total > 0 ? `${completed}/${total}` : '0/0'
    };
  }
}

module.exports = new LevelService();