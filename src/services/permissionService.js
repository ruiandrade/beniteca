const { getConnection, sql } = require('../config/db');

class PermissionService {
  async assignPermission(userId, levelId, objectType, permissionLevel) {
    const pool = await getConnection();
    // Use MERGE for upsert
    const mergeQuery = `
      MERGE [UserWorkPermission] AS target
      USING (SELECT @userId AS userId, @levelId AS levelId, @objectType AS objectType, @permissionLevel AS permissionLevel) AS source
      ON target.userId = source.userId AND target.levelId = source.levelId AND target.objectType = source.objectType
      WHEN MATCHED THEN
        UPDATE SET permissionLevel = source.permissionLevel, updatedAt = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT (userId, levelId, objectType, permissionLevel) VALUES (source.userId, source.levelId, source.objectType, source.permissionLevel);
    `;
    await pool.request()
      .input('userId', sql.Int, parseInt(userId))
      .input('levelId', sql.Int, parseInt(levelId))
      .input('objectType', sql.NVarChar, objectType)
      .input('permissionLevel', sql.NVarChar, permissionLevel)
      .query(mergeQuery);
    // Return the permission
    const result = await pool.request()
      .input('userId', sql.Int, parseInt(userId))
      .input('levelId', sql.Int, parseInt(levelId))
      .input('objectType', sql.NVarChar, objectType)
      .query('SELECT * FROM [UserWorkPermission] WHERE userId = @userId AND levelId = @levelId AND objectType = @objectType');
    return result.recordset[0];
  }

  async removePermission(userId, levelId, objectType) {
    const pool = await getConnection();
    const result = await pool.request()
      .input('userId', sql.Int, parseInt(userId))
      .input('levelId', sql.Int, parseInt(levelId))
      .input('objectType', sql.NVarChar, objectType)
      .query('DELETE FROM [UserWorkPermission] OUTPUT DELETED.* WHERE userId = @userId AND levelId = @levelId AND objectType = @objectType');
    return result.recordset;
  }

  async getPermissionsByUser(userId) {
    const pool = await getConnection();
    const query = `
      SELECT p.*, l.name as levelName
      FROM Permission p
      JOIN Level l ON p.levelId = l.id
      WHERE p.userId = @userId
    `;
    const result = await pool.request()
      .input('userId', sql.Int, parseInt(userId))
      .query(query);
    return result.recordset;
  }

  async getPermissionsByLevel(levelId) {
    const pool = await getConnection();
    const query = `
      SELECT uwp.userId, uwp.levelId, uwp.objectType, uwp.permissionLevel, u.name as userName, u.email as userEmail
      FROM [UserWorkPermission] uwp
      JOIN [User] u ON uwp.userId = u.id
      WHERE uwp.levelId = @levelId
      ORDER BY u.name ASC, uwp.objectType ASC
    `;
    const result = await pool.request()
      .input('levelId', sql.Int, parseInt(levelId))
      .query(query);
    return result.recordset;
  }

  /**
   * Get all works that a user has permission to access (using UserWorkPermission table)
   * @param {number} userId 
   * @returns {Promise<Array>}
   */
  async getUserWorks(userId) {
    try {
      const pool = await getConnection();
      const result = await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
          SELECT DISTINCT l.id, l.name, l.description, l.status, l.startDate, l.endDate, 
                 l.coverImage, l.constructionManagerId, l.createdAt, l.updatedAt,
                 cm.name as constructionManagerName,
                 cm.email as constructionManagerEmail,
                 (SELECT COUNT(*) FROM [Level] WHERE parentId = l.id) as childrenCount
          FROM [Level] l
          INNER JOIN [UserWorkPermission] uwp ON l.id = uwp.levelId
          LEFT JOIN [User] cm ON l.constructionManagerId = cm.id
          WHERE uwp.userId = @userId
            AND uwp.permissionLevel IN ('R', 'W')
          ORDER BY l.name ASC
        `);
      return result.recordset;
    } catch (err) {
      console.error('Erro ao obter obras do utilizador:', err);
      throw err;
    }
  }

  /**
   * Get all works for admin (all works)
   * @returns {Promise<Array>}
   */
  async getAllWorks() {
    try {
      const pool = await getConnection();
      const result = await pool.request()
        .query(`
          SELECT 
            l.id,
            l.name,
            l.description,
            l.status,
            l.startDate,
            l.endDate,
            l.coverImage,
            l.constructionManagerId,
            cm.name as constructionManagerName,
            cm.email as constructionManagerEmail,
            l.createdAt,
            l.updatedAt,
            COUNT(c.id) AS childrenCount
          FROM [Level] l
          LEFT JOIN [Level] c ON c.parentId = l.id
          LEFT JOIN [User] cm ON l.constructionManagerId = cm.id
          WHERE l.parentId IS NULL
          GROUP BY 
            l.id,
            l.name,
            l.description,
            l.status,
            l.startDate,
            l.endDate,
            l.coverImage,
            l.constructionManagerId,
            cm.name,
            cm.email,
            l.createdAt,
            l.updatedAt
          ORDER BY l.name ASC
        `);
      return result.recordset;
    } catch (err) {
      console.error('Erro ao obter todas as obras:', err);
      throw err;
    }
  }

  /**
   * Get user permissions for a specific work
   * @param {number} userId 
   * @param {number} levelId 
   * @returns {Promise<Object>}
   */
  async getUserWorkPermission(userId, levelId, objectType = 'LEVELS') {
    try {
      const pool = await getConnection();
      const result = await pool.request()
        .input('userId', sql.Int, userId)
        .input('levelId', sql.Int, levelId)
        .input('objectType', sql.VarChar, objectType)
        .query(`
          SELECT userId, levelId, objectType, permissionLevel
          FROM [UserWorkPermission]
          WHERE userId = @userId
            AND levelId = @levelId
            AND objectType = @objectType
        `);
      return result.recordset[0] || null;
    } catch (err) {
      console.error('Erro ao obter permissão do utilizador:', err);
      throw err;
    }
  }

  /**
   * Get users associated with a specific level/obra with their permissions
   * @param {number} levelId 
   * @returns {Promise<Array>}
   */
  async getUsersByLevelWithPermissions(levelId) {
    try {
      const pool = await getConnection();
      const result = await pool.request()
        .input('levelId', sql.Int, levelId)
        .query(`
          SELECT DISTINCT u.id, u.name, u.email, u.status, u.active
          FROM [User] u
          INNER JOIN [UserWorkPermission] uwp ON u.id = uwp.userId
          WHERE uwp.levelId = @levelId
          ORDER BY u.name ASC
        `);
      return result.recordset;
    } catch (err) {
      console.error('Erro ao obter utilizadores da obra:', err);
      throw err;
    }
  }
}

module.exports = new PermissionService();