const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const path = require('path');

const app = express();

// Enable CORS (more permissive in development, can be restricted in production)
app.use(cors());
// Increase body size limits to support large Excel hierarchy imports
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Serve static files from public directory (for legacy assets if any)
// Disable index so it doesn't take over '/' in production
app.use(express.static(path.join(__dirname, '../public'), { index: false }));
// Also expose under /public for direct access if needed
app.use('/public', express.static(path.join(__dirname, '../public')));

// API routes (mounted under /api for both dev and prod)
app.use('/api', routes);

// In production, serve the built frontend
if (process.env.NODE_ENV === 'production') {
  const frontendBuildPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendBuildPath));
  
  // Catch-all handler for SPA routing - must be after API routes
  app.use((req, res, next) => {
    // Only handle GET requests that are not API/static files
    if (req.method !== 'GET') return next();
    // If request already matched a static file, skip
    if (req.path.startsWith('/api')) return next();
    if (req.path.startsWith('/static')) return next();
    return res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

module.exports = app;
