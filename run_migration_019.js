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

async function run() {
  try {
    const pool = await getConnection();
    console.log('Running migration 019: Change completed to status...');

    // Check if status column already exists
    const checkResult = await pool.request().query(`
      SELECT COL_LENGTH('[Level]', 'status') AS hasStatus
    `);
    
    if (checkResult.recordset[0].hasStatus !== null) {
      console.log('Status column already exists, skipping migration');
      process.exit(0);
    }

    // Add new status column
    await pool.request().query(`
      ALTER TABLE [Level] ADD status NVARCHAR(50) NULL;
    `);
    console.log('✓ Added status column');

    // Migrate existing data
    await pool.request().query(`
      UPDATE [Level] SET status = CASE WHEN completed = 1 THEN 'completed' ELSE 'active' END;
    `);
    console.log('✓ Migrated data from completed to status');

    // Make status NOT NULL
    await pool.request().query(`
      ALTER TABLE [Level] ALTER COLUMN status NVARCHAR(50) NOT NULL;
    `);
    console.log('✓ Made status NOT NULL');

    // Add default constraint
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.default_constraints WHERE name = 'DF_Level_Status')
      BEGIN
        ALTER TABLE [Level] ADD CONSTRAINT DF_Level_Status DEFAULT 'active' FOR status;
      END
    `);
    console.log('✓ Added default constraint');

    // Drop default constraint on completed before dropping column
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

    // Drop old completed column
    await pool.request().query(`
      ALTER TABLE [Level] DROP COLUMN completed;
    `);
    console.log('✓ Dropped completed column');

    console.log('Migration 019 completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration 019 failed:', err);
    process.exit(1);
  }
}

run();
