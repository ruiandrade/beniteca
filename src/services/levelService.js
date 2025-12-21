const { getConnection, sql } = require('../config/db');

class LevelService {
  async createLevel(data) {
    const pool = await getConnection();
    // Check if parent exists if provided
    if (data.parentId) {
      const parentResult = await pool.request()
        .input('parentId', sql.Int, data.parentId)
        .query('SELECT id FROM Level WHERE id = @parentId');
      if (parentResult.recordset.length === 0) throw new Error('Parent level not found');
    }
    // Insert new level
    const insertQuery = `
      INSERT INTO Level (name, description, parentId, startDate, endDate, completed, notes, coverImage, constructionManagerId)
      OUTPUT INSERTED.*
      VALUES (@name, @description, @parentId, @startDate, @endDate, @completed, @notes, @coverImage, @constructionManagerId)
    `;
    const result = await pool.request()
      .input('name', sql.NVarChar, data.name)
      .input('description', sql.NVarChar, data.description)
      .input('parentId', sql.Int, data.parentId)
      .input('startDate', sql.DateTime, data.startDate)
      .input('endDate', sql.DateTime, data.endDate)
      .input('completed', sql.Bit, data.completed || false)
      .input('notes', sql.NVarChar, data.notes)
      .input('coverImage', sql.NVarChar, data.coverImage)
      .input('constructionManagerId', sql.Int, data.constructionManagerId)
      .query(insertQuery);
    return result.recordset[0];
  }

  async getLevels() {
    const pool = await getConnection();
    const query = `
      SELECT l.*, 
             p.name as parentName,
             cm.name as constructionManagerName,
             cm.email as constructionManagerEmail
      FROM Level l
      LEFT JOIN Level p ON l.parentId = p.id
      LEFT JOIN [User] cm ON l.constructionManagerId = cm.id
      ORDER BY l.id
    `;
    const result = await pool.request().query(query);
    // For includes like children, materials, etc., we'd need separate queries or complex JOINs
    // For simplicity, return basic info; can expand later
    return result.recordset;
  }

  async getLevelById(id) {
    const pool = await getConnection();
    const query = `
      SELECT l.*, 
             p.name as parentName,
             cm.name as constructionManagerName,
             cm.email as constructionManagerEmail
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
    const updateQuery = `
      UPDATE Level
      SET name = @name, description = @description, parentId = @parentId, 
          startDate = @startDate, endDate = @endDate, completed = @completed, 
          notes = @notes, coverImage = @coverImage, constructionManagerId = @constructionManagerId,
          updatedAt = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `;
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .input('name', sql.NVarChar, data.name)
      .input('description', sql.NVarChar, data.description)
      .input('parentId', sql.Int, data.parentId)
      .input('startDate', sql.DateTime, data.startDate)
      .input('endDate', sql.DateTime, data.endDate)
      .input('completed', sql.Bit, data.completed)
      .input('notes', sql.NVarChar, data.notes)
      .input('coverImage', sql.NVarChar, data.coverImage)
      .input('constructionManagerId', sql.Int, data.constructionManagerId)
      .query(updateQuery);
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
      .query('SELECT completed FROM Level WHERE parentId = @parentId');
    for (const child of childrenResult.recordset) {
      if (!child.completed) return false;
    }
    return true;
  }

  // Mark as completed
  async completeLevel(id) {
    if (!(await this.canCompleteLevel(id))) {
      throw new Error('Cannot complete level: children not completed');
    }
    return await this.updateLevel(id, { completed: true });
  }
}

module.exports = new LevelService();