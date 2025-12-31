// Direct test to see current constraint
const sql = require('mssql');
require('dotenv').config();

async function test() {
  const config = {
    user: process.env.DB_USER || 'beniteca',
    password: process.env.DB_PASSWORD || 'Testing10',
    server: process.env.DB_SERVER || 'beniteca.database.windows.net',
    database: process.env.DB_NAME || 'free-sql-db-7083145',
    options: {
      encrypt: true,
      trustServerCertificate: true
    }
  };

  try {
    const pool = await sql.connect(config);
    console.log('✅ Connected');

    // First check if constraint exists
    const checkConstraint = await pool.request().query(`
      SELECT CONSTRAINT_NAME, TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
      WHERE TABLE_NAME = 'User'
    `);
    
    console.log('Constraints found:');
    console.log(checkConstraint.recordset);

    // Now drop the constraint
    console.log('\nDropping CK_User_Status_AO...');
    await pool.request().query(`
      IF EXISTS (
        SELECT * FROM sys.check_constraints 
        WHERE name = 'CK_User_Status_AO'
      )
      BEGIN
        ALTER TABLE [dbo].[User] DROP CONSTRAINT CK_User_Status_AO;
        PRINT 'Constraint dropped';
      END
    `);

    // Add new constraint
    console.log('Adding CK_User_Status_AOC...');
    await pool.request().query(`
      ALTER TABLE [dbo].[User]
      ADD CONSTRAINT CK_User_Status_AOC CHECK (status IN ('A','O','C'))
    `);

    console.log('✅ Migration successful!');
    await pool.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

test();
