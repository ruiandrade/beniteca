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
    console.log('Running migration 018: Add active to User...');

    await pool.request().query(`
      IF COL_LENGTH('[User]', 'active') IS NULL
      BEGIN
        ALTER TABLE [User] ADD active BIT NOT NULL CONSTRAINT DF_User_Active DEFAULT 1;
      END
    `);
    console.log('✓ Ensured active column exists with default');

    await pool.request().query(`
      UPDATE [User] SET active = 1 WHERE active IS NULL;
    `);
    console.log('✓ Backfilled active values');

    console.log('Migration 018 completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration 018 failed:', err);
    process.exit(1);
  }
}

run();
