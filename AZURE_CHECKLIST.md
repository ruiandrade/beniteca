# Azure App Service Deployment Checklist

Use this checklist when deploying to Azure for the first time.

## ✅ Pre-Deployment Checklist

### 1. Azure Resources Created
- [ ] Azure SQL Database created
- [ ] Azure Storage Account created
  - [ ] Container `beniteca-photos` created (Private)
  - [ ] Container `beniteca-documents` created (Private)
- [ ] Azure App Service created (Node.js 18+ runtime)

### 2. Local Development Working
- [ ] Backend runs successfully on port 3000
- [ ] Frontend dev server runs on port 5173
- [ ] Can create/view obras, sublevels, materials
- [ ] Can upload photos and documents
- [ ] Database operations work correctly

### 3. Credentials Ready
- [ ] Azure SQL connection string
- [ ] Azure Storage connection string
- [ ] Azure Storage account name
- [ ] Azure Storage access key

---

## ✅ Azure App Service Configuration

### Application Settings (Environment Variables)

Go to: Azure Portal → Your App Service → Configuration → Application Settings

Add the following:

```
Name: NODE_ENV
Value: production

Name: DATABASE_URL
Value: sqlserver://YOUR_USER:YOUR_PASS@YOUR_SERVER.database.windows.net:1433/YOUR_DB?encrypt=true&trustServerCertificate=true

Name: AZURE_STORAGE_CONNECTION_STRING
Value: DefaultEndpointsProtocol=https;AccountName=YOUR_ACCOUNT;AccountKey=YOUR_KEY;EndpointSuffix=core.windows.net

Name: AZURE_STORAGE_ACCOUNT_NAME
Value: beniteca

Name: AZURE_STORAGE_ACCESS_KEY
Value: YOUR_STORAGE_KEY
```

**After adding all settings, click "Save" and restart the app.**

### General Settings

- Runtime: Node 18 LTS (or newer)
- Platform: 64 Bit
- Startup Command: `node index.js`

---

## ✅ Deployment Steps

### Option 1: Manual Deployment (First Time)

1. **Build the application locally:**
   ```bash
   cd /workspaces/beniteca
   npm install
   cd frontend
   npm install
   npm run build
   cd ..
   ```

2. **Deploy using Azure CLI:**
   ```bash
   az login
   az webapp up --name YOUR_APP_NAME --resource-group YOUR_RG --runtime "NODE:18-lts"
   ```

3. **Or deploy using VS Code:**
   - Install "Azure App Service" extension
   - Right-click project folder
   - Select "Deploy to Web App..."

### Option 2: GitHub Actions (Automated)

1. **Get publish profile:**
   - Azure Portal → Your App Service → Deployment Center
   - Download Publish Profile

2. **Add as GitHub secret:**
   - GitHub Repository → Settings → Secrets and variables → Actions
   - New repository secret
   - Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
   - Value: (paste entire XML content)

3. **Update workflow file:**
   - Edit `.github/workflows/azure-deploy.yml`
   - Change `AZURE_WEBAPP_NAME` to your app name
   - Commit and push to `main` branch

4. **Monitor deployment:**
   - GitHub → Actions tab
   - Watch the workflow run

---

## ✅ Post-Deployment Verification

### 1. Check Logs
Azure Portal → Your App Service → Log stream

Look for:
```
✅ Server running on port XXXX in production mode
📊 Database: Connected
📦 Blob Storage: Connected
```

### 2. Test the Application

Visit: `https://YOUR_APP_NAME.azurewebsites.net`

Test these features:
- [ ] Home page loads and shows existing obras
- [ ] Can create a new obra
- [ ] Can navigate into obra levels
- [ ] Can add sublevels
- [ ] Can add materials with delivery/assembly status
- [ ] Can add notes
- [ ] Can upload photos
- [ ] Can upload documents
- [ ] Breadcrumb navigation works
- [ ] Level tree sidebar works

### 3. Test Database Connection

Create a test obra and verify it appears in Azure SQL Database.

### 4. Test Blob Storage

Upload a photo or document and verify:
- File appears in Azure Storage container
- SAS URL allows viewing the file
- File can be deleted

---

## ✅ Troubleshooting

### Application Won't Start

**Check logs for errors:**
```bash
az webapp log tail --name YOUR_APP_NAME --resource-group YOUR_RG
```

**Common issues:**
- Missing environment variables → Check Application Settings
- Wrong startup command → Should be `node index.js`
- Build failed → Run `npm run build` locally first

### "Cannot connect to database"

- Check DATABASE_URL format is correct
- Verify Azure SQL firewall allows Azure services
- Test connection string locally first

### "Blob storage authentication failed"

- Verify AZURE_STORAGE_CONNECTION_STRING is complete
- Check storage account key hasn't been regenerated
- Ensure containers exist

### 404 on page refresh

- This should be handled automatically by web.config
- If still occurring, verify web.config was deployed

### Blank page / JavaScript errors

- Check browser console for errors
- Verify frontend was built (`frontend/dist` folder exists)
- Check that NODE_ENV is set to 'production'

---

## ✅ Security Checklist

- [ ] All sensitive data is in Application Settings, not in code
- [ ] `.env` files are in `.gitignore`
- [ ] HTTPS is enabled (Azure default)
- [ ] Blob containers are private
- [ ] SQL firewall is configured
- [ ] Consider enabling App Service Authentication for production

---

## ✅ Performance Optimization (Optional)

After successful deployment, consider:

- [ ] Enable Application Insights for monitoring
- [ ] Configure CDN for static assets
- [ ] Set up auto-scaling rules
- [ ] Configure backup strategy
- [ ] Set up staging slots for zero-downtime deployments

---

## Need Help?

1. Check the full [DEPLOYMENT.md](./DEPLOYMENT.md) guide
2. Review Azure App Service logs
3. Test the same operations locally first
4. Check Azure Service Health for any outages

