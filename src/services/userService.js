const { getConnection, sql } = require('../config/db');

class UserService {
  async createUser(data) {
    const pool = await getConnection();
    const result = await pool.request()
      .input('email', sql.NVarChar, data.email)
      .input('name', sql.NVarChar, data.name)
      .input('status', sql.NVarChar, data.status)
      .input('active', sql.Bit, data.active === undefined ? true : !!data.active)
      .query(`
        INSERT INTO [User] (email, name, status, active)
        OUTPUT INSERTED.*
        VALUES (@email, @name, @status, @active)
      `);
    return result.recordset[0];
  }

  async getUsers(filter = {}) {
    const pool = await getConnection();
    let query = 'SELECT * FROM [User]';
    const req = pool.request();
    const clauses = [];
    if (filter.active !== undefined) {
      clauses.push('active = @active');
      req.input('active', sql.Bit, filter.active === true || filter.active === '1' || filter.active === 1 || filter.active === 'true');
    }
    if (clauses.length) query += ' WHERE ' + clauses.join(' AND ');
    query += ' ORDER BY name ASC, id ASC';
    const result = await req.query(query);
    return result.recordset;
  }

  async getUserByEmail(email) {
    const pool = await getConnection();
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT TOP 1 * FROM [User] WHERE email = @email');
    return result.recordset[0];
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
    if (data.active !== undefined) {
      updates.push('active = @active');
      request.input('active', sql.Bit, !!data.active);
    }
    if (data.passwordHash !== undefined) {
      updates.push('passwordHash = @passwordHash');
      request.input('passwordHash', sql.NVarChar, data.passwordHash);
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