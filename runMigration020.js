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

    console.log('Running migration 020: Add completedAt to Level table...');

    // Check if column already exists
    const checkRes = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Level' AND COLUMN_NAME = 'completedAt'
    `);

    if (checkRes.recordset.length > 0) {
      console.log('✓ Column completedAt already exists. Skipping migration.');
      process.exit(0);
      return;
    }

    // Add completedAt column
    await pool.request().query(`
      ALTER TABLE [Level] ADD completedAt DATETIME2 NULL;
    `);
    console.log('✓ Added completedAt column');

    // Populate completedAt for existing completed items with their updatedAt value
    await pool.request().query(`
      UPDATE [Level] SET completedAt = updatedAt WHERE status = 'completed';
    `);
    console.log('✓ Populated completedAt for existing completed items');

    console.log('Migration 020 completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration 020 failed:', err);
    process.exit(1);
  }
}

runMigration();
