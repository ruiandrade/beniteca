const sql = require('mssql');

const config = {
  server: 'beniteca.database.windows.net',
  port: 1433,
  database: 'free-sql-db-7083145',
  user: 'beniteca',
  password: 'Testing10',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    hostNameInCertificate: '*.database.windows.net',
    loginTimeout: 30
  }
};

sql.connect(config).then(() => {
  console.log('Connected');
  sql.close();
}).catch(err => {
  console.log('Error', err);
});