const { getConnection, sql } = require('../config/db');

class LevelUserService {
  async getByLevel(levelId) {
    const pool = await getConnection();
    const result = await pool.request()
      .input('levelId', sql.Int, parseInt(levelId))
      .query(`
        SELECT lu.id, lu.levelId, lu.userId, lu.createdAt,
               u.name, u.email, u.status, u.Car
        FROM LevelUser lu
        INNER JOIN [User] u ON u.id = lu.userId
        WHERE lu.levelId = @levelId
        ORDER BY u.name
      `);
    return result.recordset;
  }

  async add(levelId, userId) {
    const pool = await getConnection();
    const result = await pool.request()
      .input('levelId', sql.Int, parseInt(levelId))
      .input('userId', sql.Int, parseInt(userId))
      .query(`
        IF NOT EXISTS (SELECT 1 FROM LevelUser WHERE levelId = @levelId AND userId = @userId)
        BEGIN
          INSERT INTO LevelUser (levelId, userId)
          OUTPUT INSERTED.*
          VALUES (@levelId, @userId);
        END
        ELSE
        BEGIN
          SELECT * FROM LevelUser WHERE levelId = @levelId AND userId = @userId;
        END
      `);
    return result.recordset[0];
  }

  async remove(id) {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('DELETE FROM LevelUser OUTPUT DELETED.* WHERE id = @id');
    return result.recordset[0];
  }
}

module.exports = new LevelUserService();