const bcrypt = require('bcryptjs');
const { getConnection, sql } = require('./src/config/db');

async function createAdmin() {
  try {
    const pool = await getConnection();
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    const result = await pool.request()
      .input('email', sql.VarChar, 'admin@test.com')
      .input('name', sql.VarChar, 'Admin Test')
      .input('status', sql.Char(1), 'A')
      .input('passwordHash', sql.VarChar(255), passwordHash)
      .query(`
        INSERT INTO [User] (email, name, status, role, passwordHash) 
        OUTPUT INSERTED.* 
        VALUES (@email, @name, @status, 'A', @passwordHash)
      `);
    
    console.log('Created user:', result.recordset[0]);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

createAdmin();
