const sql = require('mssql');
const fs = require('fs');

const config = {
  server: 'beniteca.database.windows.net',
  port: 1433,
  database: 'free-sql-db-7083145',
  user: 'beniteca',
  password: 'Testing10',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  }
};

async function createTables() {
  try {
    await sql.connect(config);
    console.log('Connected to database');

    const sqlScript = fs.readFileSync('create_tables.sql', 'utf8');
    const queries = sqlScript.split(';').filter(q => q.trim().length > 0);

    for (const query of queries) {
      if (query.trim()) {
        await sql.query(query);
        console.log('Executed:', query.trim().substring(0, 50) + '...');
      }
    }

    console.log('All tables created successfully');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    sql.close();
  }
}

createTables();