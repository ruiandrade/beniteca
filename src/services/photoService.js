const { getConnection, sql } = require('../config/db');

class PhotoService {
  async createPhoto(data) {
    const pool = await getConnection();
    const insertQuery = `
      INSERT INTO Photo (levelId, type, url)
      OUTPUT INSERTED.*
      VALUES (@levelId, @type, @url)
    `;
    const result = await pool.request()
      .input('levelId', sql.Int, data.levelId)
      .input('type', sql.NVarChar, data.type)
      .input('url', sql.NVarChar, data.url)
      .query(insertQuery);
    return result.recordset[0];
  }

  async getPhotosByLevel(levelId) {
    const pool = await getConnection();
    const result = await pool.request()
      .input('levelId', sql.Int, parseInt(levelId))
      .query('SELECT * FROM Photo WHERE levelId = @levelId ORDER BY id');
    return result.recordset;
  }

  async updatePhoto(id, data) {
    const pool = await getConnection();
    const updateQuery = `
      UPDATE Photo
      SET levelId = @levelId, type = @type, url = @url, updatedAt = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `;
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .input('levelId', sql.Int, data.levelId)
      .input('type', sql.NVarChar, data.type)
      .input('url', sql.NVarChar, data.url)
      .query(updateQuery);
    return result.recordset[0];
  }

  async deletePhoto(id) {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('DELETE FROM Photo OUTPUT DELETED.* WHERE id = @id');
    return result.recordset[0];
  }
}

module.exports = new PhotoService();