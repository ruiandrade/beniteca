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
      SELECT p.*, u.name as userName, u.email as userEmail
      FROM Permission p
      JOIN [User] u ON p.userId = u.id
      WHERE p.levelId = @levelId
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
          SELECT DISTINCT l.id, l.name, l.description, l.completed, l.startDate, l.endDate, 
                 l.coverImage, l.constructionManagerId, l.createdAt, l.updatedAt,
                 (SELECT COUNT(*) FROM [Level] WHERE parentId = l.id) as childrenCount
          FROM [Level] l
          INNER JOIN [UserWorkPermission] uwp ON l.id = uwp.levelId
          WHERE uwp.userId = @userId
            AND uwp.objectType = 'LEVELS'
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
          SELECT id, name, description, completed, startDate, endDate, 
                 coverImage, constructionManagerId, createdAt, updatedAt,
                 (SELECT COUNT(*) FROM [Level] WHERE parentId = [Level].id) as childrenCount
          FROM [Level]
          WHERE parentId IS NULL
          ORDER BY name ASC
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
  async getUserWorkPermission(userId, levelId) {
    try {
      const pool = await getConnection();
      const result = await pool.request()
        .input('userId', sql.Int, userId)
        .input('levelId', sql.Int, levelId)
        .query(`
          SELECT userId, levelId, objectType, permissionLevel
          FROM [UserWorkPermission]
          WHERE userId = @userId
            AND levelId = @levelId
            AND objectType = 'LEVELS'
        `);
      return result.recordset[0] || null;
    } catch (err) {
      console.error('Erro ao obter permissão do utilizador:', err);
      throw err;
    }
  }
}

module.exports = new PermissionService();