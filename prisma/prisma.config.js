const { defineConfig } = require('prisma/config');

module.exports = defineConfig({
  schema: './schema.prisma',
  db: {
    url: "sqlserver://;server=beniteca.database.windows.net;user id=beniteca;password=Testing10;database=master;encrypt=true;trustServerCertificate=true",
  },
});