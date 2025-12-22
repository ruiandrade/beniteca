const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const path = require('path');

const app = express();

// Enable CORS (more permissive in development, can be restricted in production)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory (for legacy assets if any)
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/', routes);

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
