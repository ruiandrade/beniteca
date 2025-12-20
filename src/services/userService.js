const sql = require('mssql');

const config = {
  server: 'beniteca.database.windows.net',
  port: 1433,
  database: 'free-sql-db-7083145',
  user: 'beniteca',
  password: 'Testing10',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  }
};

class UserService {
  async createUser(data) {
    try {
      await sql.connect(config);
      const result = await sql.query(`
        INSERT INTO [User] (email, name, status)
        OUTPUT INSERTED.*
        VALUES ('${data.email}', '${data.name}', '${data.status}')
      `);
      return result.recordset[0];
    } finally {
      sql.close();
    }
  }

  async getUsers() {
    try {
      await sql.connect(config);
      const result = await sql.query('SELECT * FROM [User] ORDER BY id');
      return result.recordset;
    } finally {
      sql.close();
    }
  }

  async getUserById(id) {
    try {
      await sql.connect(config);
      const result = await sql.query(`SELECT * FROM [User] WHERE id = ${id}`);
      return result.recordset[0];
    } finally {
      sql.close();
    }
  }

  async updateUser(id, data) {
    try {
      await sql.connect(config);
      let query = 'UPDATE [User] SET ';
      const updates = [];
      if (data.email) updates.push(`email = '${data.email}'`);
      if (data.name) updates.push(`name = '${data.name}'`);
      if (data.status) updates.push(`status = '${data.status}'`);
      query += updates.join(', ') + ` OUTPUT INSERTED.* WHERE id = ${id}`;
      const result = await sql.query(query);
      return result.recordset[0];
    } finally {
      sql.close();
    }
  }

  async deleteUser(id) {
    try {
      await sql.connect(config);
      await sql.query(`DELETE FROM [User] WHERE id = ${id}`);
    } finally {
      sql.close();
    }
  }
}

module.exports = new UserService();