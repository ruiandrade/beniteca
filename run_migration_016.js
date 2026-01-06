const sql = require('mssql');
const { getConnection } = require('./src/config/db');

async function runMigration() {
  try {
    const pool = await getConnection();
    
    console.log('Running migration 016: Add presence fields to LevelUserDay...');
    
    // Add appeared column
    await pool.request().query(`
      ALTER TABLE LevelUserDay ADD appeared NVARCHAR(3) NULL;
    `);
    console.log('✓ Added appeared column');
    
    // Add observations column
    await pool.request().query(`
      ALTER TABLE LevelUserDay ADD observations NVARCHAR(MAX) NULL;
    `);
    console.log('✓ Added observations column');
    
    // Add constraint
    await pool.request().query(`
      ALTER TABLE LevelUserDay ADD CONSTRAINT CK_LevelUserDay_Appeared CHECK (appeared IS NULL OR appeared IN ('yes', 'no'));
    `);
    console.log('✓ Added constraint for appeared values');
    
    console.log('Migration 016 completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration 016 failed:', err);
    process.exit(1);
  }
}

runMigration();
