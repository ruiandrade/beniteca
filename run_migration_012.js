// Quick runner for migration 012 (add brand/manufacturer/type to Material)
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
  const file = path.join(__dirname, 'migrations', '012_add_material_brand_manufacturer_type.sql');
  const sqlText = fs.readFileSync(file, 'utf8');
  const pool = await getConnection();
  await pool.request().batch(sqlText);
  console.log('Migration 012 executed successfully');
}

main().catch((err) => {
  console.error('Migration 012 failed:', err);
  process.exit(1);
});
