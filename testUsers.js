require('dotenv').config({ path: '.env.development' });
const { getConnection } = require('./src/config/db');

async function testUsers() {
  try {
    const pool = await getConnection();
    console.log('✅ Conectado à base de dados');
    
    const result = await pool.request().query('SELECT id, email, name, status FROM [User]');
    console.log('\n📋 Users na base de dados:', result.recordset.length);
    console.log(result.recordset);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
}

testUsers();
