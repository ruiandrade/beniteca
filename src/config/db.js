// Configuration for Azure SQL integration.

const sql = require('mssql');

const config = {
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  server: process.env.DB_SERVER || '',
  database: process.env.DB_NAME || '',
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

let pool = null;

const getConnection = async () => {
  try {
    if (pool && pool.connected) return pool;
    pool = await sql.connect(config);
    console.log('Conectado ao Azure SQL ✅');
    return pool;
  } catch (err) {
    console.log('Erro na conexão SQL:', err);
    // Propagate error to be handled per-request by controllers/services
    throw err;
  }
};

module.exports = {
  sql,
  getConnection
};
