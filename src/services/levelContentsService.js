const { getConnection, sql } = require('../config/db');

class LevelContentsService {
  /**
   * Get all materials, photos, and documents from a level and all its descendants
   * @param {number} rootId - The root level ID
   * @param {object} filters - { types: ['materials','photos','documents'], q: string, from: date, to: date, limit: number, offset: number }
   * @returns {Promise<object>} - { materials: [], photos: [], documents: [], counts: {}, page: {} }
   */
  async getContents(rootId, filters = {}) {
    const pool = await getConnection();
    const types = filters.types || ['materials', 'photos', 'documents'];
    const searchTerm = filters.q || '';
    const limit = parseInt(filters.limit) || 50;
    const offset = parseInt(filters.offset) || 0;

    // Build CTE to get all descendant levels with their paths
    const treeCTE = `
      WITH LevelTree AS (
        SELECT id, name, parentId, CAST(name AS NVARCHAR(MAX)) AS path
        FROM [Level]
        WHERE id = @rootId
        UNION ALL
        SELECT l.id, l.name, l.parentId, CAST(t.path + ' / ' + l.name AS NVARCHAR(MAX))
        FROM [Level] l
        INNER JOIN LevelTree t ON l.parentId = t.id
      )
    `;

    const result = {
      materials: [],
      photos: [],
      documents: [],
      counts: { materials: 0, photos: 0, documents: 0 },
      page: { limit, offset, total: 0 }
    };

    // Get materials
    if (types.includes('materials')) {
      const materialsQuery = `
        ${treeCTE}
        SELECT 
          m.id, m.description, m.brand, m.manufacturer, m.type, m.quantity, 
          m.estimatedValue, m.realValue, m.createdAt, m.levelId,
          t.path AS levelPath
        FROM Material m
        INNER JOIN LevelTree t ON m.levelId = t.id
        ${searchTerm ? "WHERE m.description LIKE @search OR m.brand LIKE @search OR m.manufacturer LIKE @search" : ""}
        ORDER BY m.createdAt DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `;

      const countQuery = `
        ${treeCTE}
        SELECT COUNT(*) AS total
        FROM Material m
        INNER JOIN LevelTree t ON m.levelId = t.id
        ${searchTerm ? "WHERE m.description LIKE @search OR m.brand LIKE @search OR m.manufacturer LIKE @search" : ""}
      `;

      const req = pool.request()
        .input('rootId', sql.Int, parseInt(rootId))
        .input('limit', sql.Int, limit)
        .input('offset', sql.Int, offset);
      
      if (searchTerm) {
        req.input('search', sql.NVarChar, `%${searchTerm}%`);
      }

      const materialsResult = await req.query(materialsQuery);
      result.materials = materialsResult.recordset;

      const countReq = pool.request().input('rootId', sql.Int, parseInt(rootId));
      if (searchTerm) countReq.input('search', sql.NVarChar, `%${searchTerm}%`);
      const countResult = await countReq.query(countQuery);
      result.counts.materials = countResult.recordset[0].total;
    }

    // Get photos
    if (types.includes('photos')) {
      const photosQuery = `
        ${treeCTE}
        SELECT 
          p.id, p.type, p.url, p.observacoes AS description, p.role, p.createdAt, p.levelId,
          t.path AS levelPath
        FROM Photo p
        INNER JOIN LevelTree t ON p.levelId = t.id
        ${searchTerm ? "WHERE p.observacoes LIKE @search" : ""}
        ORDER BY p.createdAt DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `;

      const countQuery = `
        ${treeCTE}
        SELECT COUNT(*) AS total
        FROM Photo p
        INNER JOIN LevelTree t ON p.levelId = t.id
        ${searchTerm ? "WHERE p.observacoes LIKE @search" : ""}
      `;

      const req = pool.request()
        .input('rootId', sql.Int, parseInt(rootId))
        .input('limit', sql.Int, limit)
        .input('offset', sql.Int, offset);
      
      if (searchTerm) {
        req.input('search', sql.NVarChar, `%${searchTerm}%`);
      }

      const photosResult = await req.query(photosQuery);
      result.photos = photosResult.recordset;

      const countReq = pool.request().input('rootId', sql.Int, parseInt(rootId));
      if (searchTerm) countReq.input('search', sql.NVarChar, `%${searchTerm}%`);
      const countResult = await countReq.query(countQuery);
      result.counts.photos = countResult.recordset[0].total;
    }

    // Get documents
    if (types.includes('documents')) {
      const documentsQuery = `
        ${treeCTE}
        SELECT 
          d.id, d.fileName AS name, d.url, d.type, d.createdAt, d.levelId,
          t.path AS levelPath
        FROM Document d
        INNER JOIN LevelTree t ON d.levelId = t.id
        ${searchTerm ? "WHERE d.fileName LIKE @search" : ""}
        ORDER BY d.createdAt DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `;

      const countQuery = `
        ${treeCTE}
        SELECT COUNT(*) AS total
        FROM Document d
        INNER JOIN LevelTree t ON d.levelId = t.id
        ${searchTerm ? "WHERE d.fileName LIKE @search" : ""}
      `;

      const req = pool.request()
        .input('rootId', sql.Int, parseInt(rootId))
        .input('limit', sql.Int, limit)
        .input('offset', sql.Int, offset);
      
      if (searchTerm) {
        req.input('search', sql.NVarChar, `%${searchTerm}%`);
      }

      const documentsResult = await req.query(documentsQuery);
      result.documents = documentsResult.recordset;

      const countReq = pool.request().input('rootId', sql.Int, parseInt(rootId));
      if (searchTerm) countReq.input('search', sql.NVarChar, `%${searchTerm}%`);
      const countResult = await countReq.query(countQuery);
      result.counts.documents = countResult.recordset[0].total;
    }

    result.page.total = result.counts.materials + result.counts.photos + result.counts.documents;

    return result;
  }
}

module.exports = new LevelContentsService();
