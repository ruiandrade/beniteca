const { getConnection, sql } = require('../config/db');

class UserService {
  async createUser(data) {
    const pool = await getConnection();
    const result = await pool.request()
      .input('email', sql.NVarChar, data.email)
      .input('name', sql.NVarChar, data.name)
      .input('status', sql.NVarChar, data.status)
      .query(`
        INSERT INTO [User] (email, name, status)
        OUTPUT INSERTED.*
        VALUES (@email, @name, @status)
      `);
    return result.recordset[0];
  }

  async getUsers() {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM [User] ORDER BY id');
    return result.recordset;
  }

  async getUserById(id) {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('SELECT * FROM [User] WHERE id = @id');
    return result.recordset[0];
  }

  async updateUser(id, data) {
    const pool = await getConnection();
    const updates = [];
    const request = pool.request().input('id', sql.Int, parseInt(id));
    if (data.email) {
      updates.push('email = @email');
      request.input('email', sql.NVarChar, data.email);
    }
    if (data.name) {
      updates.push('name = @name');
      request.input('name', sql.NVarChar, data.name);
    }
    if (data.status) {
      updates.push('status = @status');
      request.input('status', sql.NVarChar, data.status);
    }
    if (updates.length === 0) throw new Error('No fields to update');
    const query = `UPDATE [User] SET ${updates.join(', ')}, updatedAt = GETDATE() OUTPUT INSERTED.* WHERE id = @id`;
    const result = await request.query(query);
    return result.recordset[0];
  }

  async deleteUser(id) {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('DELETE FROM [User] OUTPUT DELETED.* WHERE id = @id');
    return result.recordset[0];
  }
}

module.exports = new UserService();