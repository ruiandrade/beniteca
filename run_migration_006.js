// Quick runner for migration 006 (add hidden column to sublevels)
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
  const file = path.join(__dirname, 'migrations', '006_add_hidden_to_sublevels.sql');
  const sqlText = fs.readFileSync(file, 'utf8');
  const pool = await getConnection();
  await pool.request().batch(sqlText);
  console.log('Migration 006 executed successfully');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
