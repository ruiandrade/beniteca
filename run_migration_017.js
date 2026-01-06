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

    console.log('Running migration 017: Add siteDirectorId to Level...');

    await pool.request().query(`
      ALTER TABLE [Level] ADD siteDirectorId INT NULL;
    `);
    console.log('✓ Added siteDirectorId column');

    await pool.request().query(`
      ALTER TABLE [Level]
        ADD CONSTRAINT FK_Level_SiteDirector
        FOREIGN KEY (siteDirectorId) REFERENCES [User](id);
    `);
    console.log('✓ Added FK_Level_SiteDirector constraint');

    console.log('Migration 017 completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration 017 failed:', err);
    process.exit(1);
  }
}

runMigration();
