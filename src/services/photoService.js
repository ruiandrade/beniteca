const { getConnection, sql } = require('../config/db');

class PhotoService {
  async createPhoto(data) {
    const pool = await getConnection();
    const insertQuery = `
      INSERT INTO Photo (levelId, type, url, role, observacoes)
      OUTPUT INSERTED.*
      VALUES (@levelId, @type, @url, @role, @observacoes)
    `;
    const result = await pool.request()
      .input('levelId', sql.Int, data.levelId)
      .input('type', sql.NVarChar, data.type)
      .input('url', sql.NVarChar, data.url)
      .input('role', sql.Char, data.role || 'B')
      .input('observacoes', sql.NVarChar, data.observacoes || null)
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
    
    // Build dynamic update based on provided fields
    const fields = [];
    const request = pool.request().input('id', sql.Int, parseInt(id));
    
    if (data.levelId !== undefined) {
      fields.push('levelId = @levelId');
      request.input('levelId', sql.Int, data.levelId);
    }
    if (data.type !== undefined) {
      fields.push('type = @type');
      request.input('type', sql.NVarChar, data.type);
    }
    if (data.url !== undefined) {
      fields.push('url = @url');
      request.input('url', sql.NVarChar, data.url);
    }
    if (data.role !== undefined) {
      fields.push('role = @role');
      request.input('role', sql.Char, data.role);
    }
    if (data.observacoes !== undefined) {
      fields.push('observacoes = @observacoes');
      request.input('observacoes', sql.NVarChar, data.observacoes);
    }
    
    if (fields.length === 0) {
      throw new Error('No fields to update');
    }
    
    fields.push('updatedAt = GETDATE()');
    
    const updateQuery = `
      UPDATE Photo
      SET ${fields.join(', ')}
      OUTPUT INSERTED.*
      WHERE id = @id
    `;
    
    const result = await request.query(updateQuery);
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