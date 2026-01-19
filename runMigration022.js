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

    console.log('Running migration 022: Add overtimeHours to LevelUserDay table...');

    // Check if column already exists
    const checkRes = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'LevelUserDay' AND COLUMN_NAME = 'overtimeHours'
    `);

    if (checkRes.recordset.length > 0) {
      console.log('✓ Column overtimeHours already exists. Skipping migration.');
      process.exit(0);
      return;
    }

    // Add overtimeHours column
    await pool.request().query(`
      ALTER TABLE LevelUserDay ADD overtimeHours DECIMAL(5,2) NULL DEFAULT 0;
    `);
    console.log('✓ Added overtimeHours column');

    console.log('Migration 022 completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration 022 failed:', err);
    process.exit(1);
  }
}

runMigration();
