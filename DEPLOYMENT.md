# Azure Deployment Guide

This guide explains how to deploy the Beniteca application to Azure App Service while maintaining local development capability.

## Architecture Overview

- **Backend**: Node.js + Express serving API and static frontend
- **Frontend**: React + Vite (built to static files for production)
- **Database**: Azure SQL Database
- **Storage**: Azure Blob Storage (for photos and documents)

## Prerequisites

1. Azure account with active subscription
2. Azure SQL Database created and accessible
3. Azure Storage Account created with containers:
   - `beniteca-photos`
   - `beniteca-documents`
4. Azure App Service (Node.js runtime)

---

## Local Development Setup

### 1. Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your Azure credentials:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL`: Your Azure SQL connection string
- `AZURE_STORAGE_CONNECTION_STRING`: Your Azure Storage connection string
- `AZURE_STORAGE_ACCOUNT_NAME`: Your storage account name
- `AZURE_STORAGE_ACCESS_KEY`: Your storage access key

### 3. Run Local Development

```bash
# Terminal 1: Start backend (port 3000)
npm run dev

# Terminal 2: Start frontend dev server (port 5173)
cd frontend
npm run dev
```

Access the app at: `http://localhost:5173`

The Vite dev server proxies API calls to the backend automatically.

---

## Azure App Service Deployment

### 1. Build the Application

```bash
# This builds the frontend and prepares for production
npm run build
```

This creates `frontend/dist/` with the production-ready static files.

### 2. Configure Azure App Service

#### Application Settings (Environment Variables)

In Azure Portal → App Service → Configuration → Application settings, add:

| Name | Value | Notes |
|------|-------|-------|
| `NODE_ENV` | `production` | Tells the app to run in production mode |
| `PORT` | *Leave blank* | Azure sets this automatically |
| `DATABASE_URL` | `sqlserver://...` | Your Azure SQL connection string |
| `AZURE_STORAGE_CONNECTION_STRING` | `DefaultEndpointsProtocol=https;...` | Your storage connection string |
| `AZURE_STORAGE_ACCOUNT_NAME` | `beniteca` | Your storage account name |
| `AZURE_STORAGE_ACCESS_KEY` | `your-key-here` | Your storage access key |

⚠️ **Important**: Never commit these values to version control!

#### Startup Command

In Azure Portal → App Service → Configuration → General settings:

**Startup Command**: `node index.js`

### 3. Deploy Code

#### Option A: GitHub Actions (Recommended)

Azure can automatically deploy from your GitHub repository:

1. In Azure Portal → Deployment Center
2. Choose GitHub as source
3. Authorize and select your repository
4. Azure creates a workflow file automatically
5. Every push to main branch triggers deployment

#### Option B: VS Code Extension

1. Install "Azure App Service" extension
2. Right-click on `beniteca` folder
3. Select "Deploy to Web App..."
4. Choose your App Service

#### Option C: Azure CLI

```bash
az webapp up --name your-app-name --resource-group your-rg --runtime "NODE:18-lts"
```

### 4. Post-Deployment Steps

After deployment:

1. **Verify environment variables** are set in Azure Portal
2. **Check logs** in Azure Portal → Log stream
3. **Test the application** at `https://your-app-name.azurewebsites.net`

---

## How Azure Blob Storage Access Works

### Current Implementation

The application uses **Azure Storage Connection String** authentication:

```javascript
// src/services/blobService.js
const { BlobServiceClient } = require('@azure/storage-blob');
const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING
);
```

### Required Configuration for Azure

1. **Storage Account** must exist with:
   - Name: `beniteca` (or update `AZURE_STORAGE_ACCOUNT_NAME`)
   - Access tier: Hot (for frequently accessed files)
   - Containers:
     - `beniteca-photos` (private)
     - `beniteca-documents` (private)

2. **Connection String** includes:
   - Storage account name
   - Access key
   - Endpoint suffix (typically `core.windows.net`)

3. **Network Access**:
   - Ensure Azure App Service can reach the storage account
   - If storage has firewall rules, add App Service outbound IPs

4. **CORS** (if needed for direct browser uploads):
   - Configure in Storage Account → Resource Sharing (CORS)
   - Allow origins: your app domain

### SAS Token Generation

The app generates SAS (Shared Access Signature) URLs for blob access:
- **Read-only** permission
- **1-year validity** (configurable in `blobService.js`)
- Generated server-side for security

---

## Environment Comparison

| Aspect | Local Development | Azure Production |
|--------|------------------|------------------|
| Frontend | Vite dev server (5173) | Static files served by Express |
| Backend | Express (3000) | Express (dynamic port) |
| Env Variables | `.env` file | Azure App Service settings |
| Database | Azure SQL (same as prod) | Azure SQL |
| Storage | Azure Blob (same as prod) | Azure Blob |
| Build | No build needed | `npm run build` required |

---

## Troubleshooting

### "Cannot find module" errors in Azure

**Solution**: Ensure `package.json` dependencies (not devDependencies) include all runtime packages. Run `npm run deploy:azure` which installs and builds.

### 404 on React routes after refresh

**Solution**: Already handled! The app.js catch-all route serves `index.html` for SPA routing.

### Blob storage "Authentication failed"

**Solution**: 
1. Verify `AZURE_STORAGE_CONNECTION_STRING` is correctly set in Azure
2. Check connection string format includes `AccountKey`
3. Ensure storage account key hasn't been regenerated

### Database connection timeout

**Solution**:
1. Check Azure SQL firewall rules
2. Add "Allow Azure services" rule
3. Or add App Service outbound IPs to firewall

### Environment variables not loaded

**Solution**:
1. Azure doesn't use `.env` files - configure in portal
2. Restart App Service after changing settings
3. Check logs with `az webapp log tail --name your-app --resource-group your-rg`

---

## Security Best Practices

1. ✅ **Never commit `.env` files** - already in `.gitignore`
2. ✅ **Use connection strings** - secure credential storage
3. ✅ **Private blob containers** - not publicly accessible
4. ✅ **SAS tokens** - time-limited access to blobs
5. ⚠️ **Rotate keys regularly** - update in Azure portal and app settings
6. ⚠️ **Enable HTTPS only** - configure in Azure App Service
7. ⚠️ **Restrict CORS** - limit to your domain in production

---

## Continuous Development

After deploying to Azure, you can continue local development:

1. Keep working with `npm run dev` + `cd frontend && npm run dev`
2. Test changes locally before deploying
3. Azure deployment doesn't affect local `.env` configuration
4. Deploy updates with your chosen method (GitHub Actions, VS Code, etc.)

---

## Quick Commands Reference

```bash
# Local Development
npm install && cd frontend && npm install && cd ..
npm run dev                    # Start backend
cd frontend && npm run dev     # Start frontend

# Production Build
npm run build                  # Build frontend to dist/

# Azure Deployment Prep
npm run deploy:azure          # Install + build everything

# Testing Production Build Locally
NODE_ENV=production npm start  # Serves built frontend on port 3000
```

---

## Need Help?

- Azure App Service Docs: https://docs.microsoft.com/azure/app-service/
- Azure Blob Storage Docs: https://docs.microsoft.com/azure/storage/blobs/
- Azure SQL Database Docs: https://docs.microsoft.com/azure/sql-database/

