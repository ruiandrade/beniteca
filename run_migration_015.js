const sql = require('mssql');
const { getConnection } = require('./src/config/db');

async function runMigration() {
  try {
    const pool = await getConnection();
    
    console.log('Running migration 015: Update Photo type constraint...');
    
    // Drop existing constraint
    await pool.request().query(`
      ALTER TABLE Photo DROP CONSTRAINT CK_Photo_Type;
    `);
    console.log('✓ Dropped old constraint CK_Photo_Type');
    
    // Add new constraint with only 'issue' and 'others'
    await pool.request().query(`
      ALTER TABLE Photo ADD CONSTRAINT CK_Photo_Type CHECK (type IN ('issue', 'others'));
    `);
    console.log('✓ Created new constraint CK_Photo_Type with values: issue, others');
    
    console.log('Migration 015 completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration 015 failed:', err);
    process.exit(1);
  }
}

runMigration();
