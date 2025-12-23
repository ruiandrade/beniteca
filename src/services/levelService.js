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

  async getLevels(filter = {}) {
    const pool = await getConnection();
    let query = `
      SELECT l.*, 
             p.name as parentName,
             cm.name as constructionManagerName,
             cm.email as constructionManagerEmail,
             (SELECT COUNT(*) FROM Level WHERE parentId = l.id) as childrenCount,
             (SELECT COUNT(*) FROM Level WHERE parentId = l.id AND completed = 1) as completedChildren
      FROM Level l
      LEFT JOIN Level p ON l.parentId = p.id
      LEFT JOIN [User] cm ON l.constructionManagerId = cm.id`;

    const req = pool.request();
    if (Object.prototype.hasOwnProperty.call(filter, 'parentId')) {
      if (filter.parentId === null || filter.parentId === 'null' || filter.parentId === '') {
        query += `\n      WHERE l.parentId IS NULL`;
      } else {
        query += `\n      WHERE l.parentId = @parentId`;
        req.input('parentId', sql.Int, parseInt(filter.parentId));
      }
    }
    query += `\n      ORDER BY l.id`;

    const result = await req.query(query);
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
             cm.email as constructionManagerEmail,
             (SELECT COUNT(*) FROM Level WHERE parentId = l.id) as childrenCount,
             (SELECT COUNT(*) FROM Level WHERE parentId = l.id AND completed = 1) as completedChildren
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
    if (data.completed !== undefined) {
      fields.push('completed = @completed');
      request.input('completed', sql.Bit, data.completed);
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
      request.input('constructionManagerId', sql.Int, data.constructionManagerId);
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