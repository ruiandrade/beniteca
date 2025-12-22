# Architecture Overview

This document explains how the Beniteca application is structured and how it operates in different environments.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Local Development                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Browser (localhost:5173)                                    │
│       │                                                       │
│       │ /api/* requests                                      │
│       ↓                                                       │
│  Vite Dev Server (5173)                                      │
│       │                                                       │
│       │ Proxies to →                                         │
│       ↓                                                       │
│  Express Backend (3000) ──────┬──→ Azure SQL Database       │
│                                │                              │
│                                └──→ Azure Blob Storage       │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  Azure Production                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Browser (https://your-app.azurewebsites.net)               │
│       │                                                       │
│       ↓                                                       │
│  Azure App Service                                           │
│    ├── Express Backend                                       │
│    │   ├── /api/* → API Routes                              │
│    │   │     ├──→ Azure SQL Database                        │
│    │   │     └──→ Azure Blob Storage                        │
│    │   │                                                      │
│    │   └── /* → Serves static files from frontend/dist/     │
│    │                                                          │
│    └── Static Files (frontend/dist/)                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## How It Works

### Local Development Mode

**Starting the application:**
```bash
# Terminal 1: Backend
npm run dev
# Loads .env file, starts Express on port 3000

# Terminal 2: Frontend  
cd frontend && npm run dev
# Starts Vite dev server on port 5173
```

**Request flow:**
1. Browser loads React app from Vite (port 5173)
2. User interacts with UI
3. API calls go to `/api/*`
4. Vite proxy forwards to `localhost:3000`
5. Express handles API logic, talks to Azure services
6. Response flows back through proxy to browser

**Benefits:**
- ⚡ Hot Module Replacement (HMR)
- 🔍 React DevTools work perfectly
- 🐛 Easy debugging with source maps
- 💨 Fast iteration cycle

### Azure Production Mode

**Deployment process:**
```bash
npm run build
# 1. Installs frontend dependencies
# 2. Runs vite build → creates frontend/dist/
# 3. Includes everything needed for production
```

**Application startup:**
```javascript
// index.js loads environment from Azure App Settings
// Express starts on port assigned by Azure (usually 8080 or dynamic)
```

**Request flow:**
1. Browser loads app from `https://your-app.azurewebsites.net`
2. Azure routes request to Express
3. Express checks request path:
   - `/api/*` → Handled by API routes
   - `/uploads/*`, `/static/*` → Static file middleware
   - `/*` → Serves `frontend/dist/index.html` (SPA catch-all)
4. React app loads, makes API calls to same domain
5. No CORS issues (same origin)
6. Express handles API, talks to Azure services

**Benefits:**
- 📦 Single deployment artifact
- 🚀 No separate frontend hosting needed
- 🔒 Same-origin security
- 💰 Cost-effective (one App Service)

## Environment Variable Loading

### Local Development
```javascript
// index.js
if (process.env.NODE_ENV !== 'production') {
  // Tries .env.development first, falls back to .env
  require('dotenv').config({ path: '.env.development' });
}
```

**Priority:**
1. `.env.development` (if exists)
2. `.env` (fallback)
3. System environment variables (override)

### Azure Production
```javascript
// index.js
if (process.env.NODE_ENV === 'production') {
  // No dotenv loading - uses Azure App Settings
  console.log('Using Azure environment variables');
}
```

**All variables come from:**
- Azure Portal → App Service → Configuration → Application Settings
- Set through portal, CLI, or ARM templates
- Automatically injected as environment variables

## File Storage Architecture

### Blob Storage Containers

```
beniteca Storage Account
├── beniteca-photos/
│   └── <timestamp>-<levelId>-<type>-<filename>
│       Example: 1703262847123-5-durante-obra1.jpg
│
└── beniteca-documents/
    └── <timestamp>-<levelId>-document-<filename>
        Example: 1703262950456-5-document-contrato.pdf
```

### Upload Flow

**Local & Production (same code):**
1. Frontend: User selects file
2. Frontend: Creates FormData, renames file with metadata
3. Frontend: POST to `/api/upload?container=beniteca-photos`
4. Backend: Multer receives file in memory
5. Backend: BlobService uploads to specified container
6. Backend: Generates SAS URL (read-only, 1 year)
7. Backend: Returns SAS URL to frontend
8. Frontend: POST to `/api/photos` with URL + metadata
9. Database: Stores photo record with SAS URL

**Why this works in both environments:**
- Uses connection string (not local file paths)
- Blob storage accessible from anywhere
- Same Azure credentials in local `.env` and Azure settings

## Database Architecture

### Connection Method

Both environments use the same connection approach:

```javascript
// src/config/db.js
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};
```

**Or simplified:**
```javascript
// Alternative using DATABASE_URL
const DATABASE_URL = process.env.DATABASE_URL;
// sqlserver://user:pass@server:port/database?options
```

### Firewall Configuration

Azure SQL must allow:
- ✅ "Allow Azure services and resources to access this server"
- ✅ Your local IP (for development)
- ✅ Azure App Service outbound IPs (automatic if "Allow Azure services" is enabled)

## Routing Strategy

### Development (Vite proxy)
```javascript
// frontend/vite.config.js
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
};
```

- `/api/levels` → proxied to → `http://localhost:3000/levels`

### Production (Express catch-all)
```javascript
// src/app.js
if (process.env.NODE_ENV === 'production') {
  // Serve static React build
  app.use(express.static('frontend/dist'));
  
  // SPA routing - after API routes
  app.get('*', (req, res) => {
    res.sendFile('frontend/dist/index.html');
  });
}
```

- `/api/levels` → API route handler
- `/works/5/levels` → Serves index.html → React Router handles
- `/static/image.png` → Serves from dist folder

## Build Process

### Development Build
Not needed - Vite serves files from source

### Production Build
```bash
npm run build:frontend
# ↓
cd frontend && npm install && npm run build
# ↓
vite build
# ↓
Creates frontend/dist/ with:
  - index.html (entry point)
  - assets/*.js (bundled code)
  - assets/*.css (bundled styles)
  - Optimized, minified, tree-shaken
```

**Optimization features:**
- Code splitting
- Tree shaking (removes unused code)
- Minification
- Asset hashing (cache busting)
- Gzip pre-compression

## Deployment Options

### 1. GitHub Actions (Recommended)
```yaml
# .github/workflows/azure-deploy.yml
- Build frontend
- Upload artifact
- Deploy to Azure App Service
```

**Triggers:** Push to main branch
**Duration:** ~2-3 minutes
**Advantages:** Automated, logged, rollback support

### 2. Azure CLI
```bash
az webapp up --name app-name --resource-group rg --runtime "NODE:18-lts"
```

**When:** Quick manual deployment
**Advantages:** Simple, one command

### 3. VS Code Extension
Right-click → Deploy to Web App

**When:** During development iterations
**Advantages:** GUI, easy to use

### 4. Azure DevOps Pipelines
Full CI/CD with testing, approval gates

**When:** Enterprise environments
**Advantages:** Advanced workflows, compliance

## Security Considerations

### Credentials Storage
- ❌ Never in code
- ❌ Never in git
- ✅ Local: `.env` files (gitignored)
- ✅ Azure: App Service Application Settings

### Blob Storage Security
- Private containers (not public)
- SAS tokens with expiration
- Read-only permissions
- Server-side generation (never expose storage key)

### Database Security
- Encrypted connections (encrypt=true)
- Firewall restrictions
- Strong passwords
- Connection string includes credentials (keep secret)

### Network Security
- HTTPS only in Azure (enforced)
- CORS configured appropriately
- No exposed admin endpoints
- SQL injection prevention (parameterized queries)

## Performance Characteristics

### Local Development
- Frontend: Instant HMR updates
- Backend: Nodemon auto-restart
- Database: Azure SQL (cloud)
- Storage: Azure Blob (cloud)

### Azure Production
- Frontend: CDN-cacheable static files
- Backend: Auto-scaled based on load
- Database: Azure SQL (same instance)
- Storage: Azure Blob (globally distributed)

**Optimization opportunities:**
- Enable Application Insights
- Configure CDN for static assets
- Set up Azure Front Door
- Implement Redis cache for API responses

## Monitoring & Debugging

### Local Development
- Console.log in browser DevTools
- Node.js logs in terminal
- React DevTools
- Network tab for API calls

### Azure Production
- Application Insights (telemetry)
- Log stream in portal
- Kudu debug console
- Application logs stored in file system

**Enable detailed logging:**
```javascript
// index.js
console.log('✅ Server running on port', PORT);
console.log('📊 Database:', process.env.DATABASE_URL ? 'Connected' : '⚠️ Not configured');
console.log('📦 Blob Storage:', process.env.AZURE_STORAGE_CONNECTION_STRING ? 'Connected' : '⚠️ Not configured');
```

## Scaling Considerations

### Current Setup (Good for development & small production)
- Single App Service instance
- Serverless SQL (auto-scales)
- Standard blob storage

### Future Scaling (When traffic grows)
- **App Service**: Scale out (multiple instances)
- **Database**: Upgrade tier or use read replicas
- **Blob Storage**: Enable CDN
- **Caching**: Add Redis for API responses
- **Load Balancing**: Azure Front Door or Application Gateway

---

## Key Takeaways

1. **Same Azure Resources**: Both dev and prod use same database and blob storage
2. **Different Serving**: Dev uses Vite proxy, prod uses Express static serving
3. **Environment Variables**: Dev uses `.env`, prod uses Azure settings
4. **Single Codebase**: No environment-specific code branches needed
5. **Seamless Development**: Changes in dev work in prod without modification

