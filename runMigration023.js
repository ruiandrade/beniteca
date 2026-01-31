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

async function runMigration() {
  try {
    const pool = await getConnection();

    console.log('Running migration 023: Add createdBy and closedBy to Level table...');

    // Check if columns already exist
    const checkCreatedBy = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Level' AND COLUMN_NAME = 'createdBy'
    `);

    const checkClosedBy = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Level' AND COLUMN_NAME = 'closedBy'
    `);

    if (checkCreatedBy.recordset.length > 0 && checkClosedBy.recordset.length > 0) {
      console.log('✓ Columns createdBy and closedBy already exist. Skipping migration.');
      process.exit(0);
      return;
    }

    // Add createdBy column if it doesn't exist
    if (checkCreatedBy.recordset.length === 0) {
      await pool.request().query(`
        ALTER TABLE [Level] ADD createdBy INT NULL;
      `);
      console.log('✓ Added createdBy column');
      
      // Add foreign key constraint
      await pool.request().query(`
        ALTER TABLE [Level] ADD CONSTRAINT FK_Level_CreatedBy FOREIGN KEY (createdBy) REFERENCES [User](id);
      `);
      console.log('✓ Added FK_Level_CreatedBy foreign key constraint');
    }

    // Add closedBy column if it doesn't exist
    if (checkClosedBy.recordset.length === 0) {
      await pool.request().query(`
        ALTER TABLE [Level] ADD closedBy INT NULL;
      `);
      console.log('✓ Added closedBy column');
      
      // Add foreign key constraint
      await pool.request().query(`
        ALTER TABLE [Level] ADD CONSTRAINT FK_Level_ClosedBy FOREIGN KEY (closedBy) REFERENCES [User](id);
      `);
      console.log('✓ Added FK_Level_ClosedBy foreign key constraint');
    }

    console.log('Migration 023 completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration 023 failed:', err);
    process.exit(1);
  }
}

runMigration();
