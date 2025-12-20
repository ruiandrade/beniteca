const poolPromise = require('./db');

async function testConnection() {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT TOP 1 * FROM Users');
    console.log(result.recordset);
  } catch (err) {
    console.error(err);
  }
}

testConnection();
