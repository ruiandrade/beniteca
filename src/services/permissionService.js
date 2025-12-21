const { getConnection, sql } = require('../config/db');

class PermissionService {
  async assignPermission(userId, levelId, permission) {
    const pool = await getConnection();
    // Use MERGE for upsert
    const mergeQuery = `
      MERGE Permission AS target
      USING (SELECT @userId AS userId, @levelId AS levelId, @permission AS permission) AS source
      ON target.userId = source.userId AND target.levelId = source.levelId
      WHEN MATCHED THEN
        UPDATE SET permission = source.permission, updatedAt = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT (userId, levelId, permission) VALUES (source.userId, source.levelId, source.permission);
    `;
    await pool.request()
      .input('userId', sql.Int, parseInt(userId))
      .input('levelId', sql.Int, parseInt(levelId))
      .input('permission', sql.NVarChar, permission)
      .query(mergeQuery);
    // Return the permission
    const result = await pool.request()
      .input('userId', sql.Int, parseInt(userId))
      .input('levelId', sql.Int, parseInt(levelId))
      .query('SELECT * FROM Permission WHERE userId = @userId AND levelId = @levelId');
    return result.recordset[0];
  }

  async removePermission(userId, levelId) {
    const pool = await getConnection();
    const result = await pool.request()
      .input('userId', sql.Int, parseInt(userId))
      .input('levelId', sql.Int, parseInt(levelId))
      .query('DELETE FROM Permission OUTPUT DELETED.* WHERE userId = @userId AND levelId = @levelId');
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
}

module.exports = new PermissionService();