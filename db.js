const sql = require('mssql');
require('dotenv').config();

console.log('DB_SERVER =', process.env.DB_SERVER);


const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true
  }
};

const poolPromise = sql.connect(config)
  .then(pool => {
    console.log('Conectado ao Azure SQL ✅');
    return pool;
  })
  .catch(err => console.log('Erro na conexão SQL:', err));

module.exports = poolPromise;
