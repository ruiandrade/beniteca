// Quick runner for migration 011 (update User status constraint to support Client)
const fs = require('fs');
const path = require('path');

const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
if (fs.existsSync(path.join(__dirname, envFile))) {
  require('dotenv').config({ path: envFile });
} else if (fs.existsSync(path.join(__dirname, '.env'))) {
  require('dotenv').config();
}

const { getConnection } = require('./src/config/db');

async function main() {
  const file = path.join(__dirname, 'migrations', '011_user_status_to_AOC.sql');
  const sqlText = fs.readFileSync(file, 'utf8');
  const pool = await getConnection();
  await pool.request().batch(sqlText);
  console.log('Migration 011 executed successfully');
}

main().catch((err) => {
  console.error('Migration 011 failed:', err);
  process.exit(1);
});
