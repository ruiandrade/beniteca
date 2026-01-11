// Load env like the server does
const fs = require('fs');
const path = require('path');
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
if (fs.existsSync(path.join(__dirname, envFile))) {
  require('dotenv').config({ path: envFile });
} else if (fs.existsSync(path.join(__dirname, '.env'))) {
  require('dotenv').config();
}

const { getConnection } = require('./src/config/db');

async function completeMigration() {
  try {
    const pool = await getConnection();
    console.log('Conectado ao Azure SQL ✅');

    // Drop default constraint on completed
    await pool.request().query(`
      DECLARE @ConstraintName nvarchar(200)
      SELECT @ConstraintName = Name FROM sys.default_constraints 
      WHERE PARENT_OBJECT_ID = OBJECT_ID('[Level]') 
      AND PARENT_COLUMN_ID = (SELECT column_id FROM sys.columns 
                              WHERE NAME = N'completed' 
                              AND object_id = OBJECT_ID(N'[Level]'))
      IF @ConstraintName IS NOT NULL
        EXEC('ALTER TABLE [Level] DROP CONSTRAINT ' + @ConstraintName)
    `);
    console.log('✓ Dropped completed constraint');

    // Drop completed column
    await pool.request().query(`ALTER TABLE [Level] DROP COLUMN completed;`);
    console.log('✓ Dropped completed column');

    console.log('Migration 019 completed successfully! ✅');
    await pool.close();
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

completeMigration();
