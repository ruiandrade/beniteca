// Direct migration runner for 011
const sql = require('mssql');
require('dotenv').config();

const fs = require('fs');
const path = require('path');

async function runMigration() {
  const config = {
    user: process.env.DB_USER || 'beniteca',
    password: process.env.DB_PASSWORD || 'Testing10',
    server: process.env.DB_SERVER || 'beniteca.database.windows.net',
    database: process.env.DB_NAME || 'free-sql-db-7083145',
    options: {
      encrypt: true,
      trustServerCertificate: true,
      connectTimeout: 30000,
      requestTimeout: 30000
    }
  };

  try {
    const pool = await sql.connect(config);
    console.log('✅ Conectado ao Azure SQL');

    const file = path.join(__dirname, 'migrations', '011_user_status_to_AOC.sql');
    const sqlText = fs.readFileSync(file, 'utf8');

    console.log('Executando migration 011...');
    await pool.request().batch(sqlText);

    console.log('✅ Migration 011 executada com sucesso!');
    console.log('O constraint foi atualizado para aceitar status: A (Admin), O (Other), C (Client)');
    
    await pool.close();
  } catch (err) {
    console.error('❌ Erro na migration:', err.message);
    process.exit(1);
  }
}

runMigration();
