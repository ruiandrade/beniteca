const { getConnection, sql } = require('../config/db');

class DocumentService {
  async createDocument(data) {
    const pool = await getConnection();
    const insertQuery = `
      INSERT INTO Document (levelId, type, url, fileName)
      OUTPUT INSERTED.*
      VALUES (@levelId, @type, @url, @fileName)
    `;
    const result = await pool.request()
      .input('levelId', sql.Int, data.levelId)
      .input('type', sql.NVarChar, data.type || null)
      .input('url', sql.NVarChar, data.url)
      .input('fileName', sql.NVarChar, data.fileName || null)
      .query(insertQuery);
    return result.recordset[0];
  }

  async getDocumentsByLevel(levelId) {
    const pool = await getConnection();
    const result = await pool.request()
      .input('levelId', sql.Int, parseInt(levelId))
      .query('SELECT * FROM Document WHERE levelId = @levelId ORDER BY createdAt DESC');
    return result.recordset;
  }

  async updateDocument(id, data) {
    const pool = await getConnection();
    const updateQuery = `
      UPDATE Document
      SET type = @type, url = @url, fileName = @fileName, updatedAt = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `;
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .input('type', sql.NVarChar, data.type || null)
      .input('url', sql.NVarChar, data.url)
      .input('fileName', sql.NVarChar, data.fileName || null)
      .query(updateQuery);
    return result.recordset[0];
  }

  async deleteDocument(id) {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('DELETE FROM Document OUTPUT DELETED.* WHERE id = @id');
    return result.recordset[0];
  }
}

module.exports = new DocumentService();
