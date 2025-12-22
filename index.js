// Load environment variables
// In Azure App Service, NODE_ENV is typically set to 'production'
// and environment variables are configured through the portal
if (process.env.NODE_ENV !== 'production') {
  // Local development: try environment-specific .env file first, then fall back to .env
  const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
  const fs = require('fs');
  const path = require('path');
  
  if (fs.existsSync(path.join(__dirname, envFile))) {
    require('dotenv').config({ path: envFile });
    console.log(`Loaded environment from ${envFile}`);
  } else {
    require('dotenv').config();
    console.log('Loaded environment from .env');
  }
} else {
  // Production: Azure App Service provides environment variables
  console.log('Running in production - using Azure App Service environment variables');
}

const app = require('./src/app');

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`📊 Database: ${process.env.DATABASE_URL ? 'Connected' : '⚠️  Not configured'}`);
  console.log(`📦 Blob Storage: ${process.env.AZURE_STORAGE_CONNECTION_STRING ? 'Connected' : '⚠️  Not configured'}`);
});
