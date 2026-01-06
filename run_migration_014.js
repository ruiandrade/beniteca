// Quick runner for migration 014 (add observacoes column and issue type to Photo)
const fs = require('fs');
const path = require('path');

// Load env like the server does
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
if (fs.existsSync(path.join(__dirname, envFile))) {
  require('dotenv').config({ path: envFile });
} else if (fs.existsSync(path.join(__dirname, '.env'))) {
  require('dotenv').config();
}

const { getConnection } = require('./src/config/db');

async function main() {
  const file = path.join(__dirname, 'migrations', '014_add_photo_observations_and_issue_type.sql');
  const sqlText = fs.readFileSync(file, 'utf8');
  const pool = await getConnection();
  await pool.request().batch(sqlText);
  console.log('Migration 014 executed successfully');
}

main().catch((err) => {
  console.error('Migration 014 failed:', err);
  process.exit(1);
});
