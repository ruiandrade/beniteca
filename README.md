# Beniteca

Production-ready construction project management system ("obras") with hierarchical levels, materials tracking, document management, and photo uploads.

## 📚 Documentação Completa

- **[📖 Documentação do Sistema](docs/SYSTEM_DOCUMENTATION.md)**: Guia completo - arquitetura, base de dados, UI, permissões, fluxos
- **[⚡ Referência Rápida](docs/QUICK_REFERENCE.md)**: Cheat sheet - APIs, padrões, troubleshooting
- **[🔐 Segurança e Autenticação](docs/AUTH_SECURITY.md)**: JWT, token expiration, auto-logout
- **[📊 Importação de Hierarquia](docs/HIERARCHY_IMPORT.md)**: Import de estrutura desde Excel

## 🏗️ Features

- **Hierarchical Project Structure**: Unlimited depth levels and sublevels
- **Team Planning**: Daily worker allocation with morning/afternoon periods
- **Attendance Tracking**: Mark presence, observations, overtime hours
- **Materials Management**: Track materials with delivery and assembly status
- **Document Management**: Upload and organize project documents
- **Photo Management**: Organize photos by project phase (Before/During/After/Issues)
- **Granular Permissions**: Object-level access control per user per work
- **Reports & Dashboard**: KPIs, timelines, material ratios
- **Azure Integration**: SQL Database + Blob Storage
- **Responsive UI**: Desktop tables + mobile card layouts

## 🚀 Tech Stack

### Backend
- Node.js + Express
- Azure SQL Database
- Azure Blob Storage (@azure/storage-blob)
- Multer for file uploads

### Frontend
- React 19
- Vite
- React Router DOM
- Modern CSS

## 📁 Project Structure

```
├── src/
│   ├── controllers/      # Request handlers
│   ├── routes/          # API routes  
│   ├── services/        # Business logic + database operations
│   └── config/          # Database configuration
├── frontend/
│   ├── src/
│   │   ├── pages/       # React page components
│   │   └── App.jsx      # Main app + routing
│   └── dist/            # Production build (generated)
├── migrations/          # SQL migration scripts
├── docs/               # Complete documentation
│   ├── SYSTEM_DOCUMENTATION.md  # Full system guide
│   ├── QUICK_REFERENCE.md       # Quick reference
│   ├── AUTH_SECURITY.md         # Security guide
│   └── HIERARCHY_IMPORT.md      # Import guide
├── .env.example        # Environment template
├── DEPLOYMENT.md       # Full deployment guide
└── AZURE_CHECKLIST.md  # Step-by-step Azure setup
```

## 🛠️ Local Development Setup

### Prerequisites
- Node.js 18+ 
- Azure SQL Database
- Azure Storage Account

### 1. Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Configure Environment

Copy `env.example` to `.env` and update with your credentials:

```bash
cp env.example .env
```

Required environment variables:
- `DATABASE_URL` - Azure SQL connection string
- `AZURE_STORAGE_CONNECTION_STRING` - Azure Storage connection string
- `AZURE_STORAGE_ACCOUNT_NAME` - Storage account name
- `AZURE_STORAGE_ACCESS_KEY` - Storage access key

### 3. Run Development Servers

```bash
# Terminal 1: Start backend (port 3000)
npm run dev

# Terminal 2: Start frontend dev server (port 5173)
cd frontend
npm run dev
```

Access the app at: **http://localhost:5173**

The Vite dev server automatically proxies `/api` requests to the backend.

## 🌐 Azure Deployment

### Quick Deploy

```bash
# Build frontend for production
npm run build

# Deploy to Azure (requires Azure CLI)
az webapp up --name your-app-name --resource-group your-rg --runtime "NODE:18-lts"
```

### Automated Deployment

Set up GitHub Actions for automatic deployment:

1. Download publish profile from Azure Portal
2. Add as GitHub secret: `AZURE_WEBAPP_PUBLISH_PROFILE`
3. Update `.github/workflows/azure-deploy.yml` with your app name
4. Push to `main` branch → automatic deployment

### Detailed Guides

- 📖 [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment guide
- ✅ [AZURE_CHECKLIST.md](./AZURE_CHECKLIST.md) - Step-by-step Azure setup

## 🔑 Environment Configuration

### Local Development
Environment variables are loaded from `.env` file.

### Azure App Service  
Configure in Azure Portal → App Service → Configuration → Application Settings:

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | Set to `production` |
| `DATABASE_URL` | Azure SQL connection string |
| `AZURE_STORAGE_CONNECTION_STRING` | Blob storage connection |
| `AZURE_STORAGE_ACCOUNT_NAME` | Storage account name |
| `AZURE_STORAGE_ACCESS_KEY` | Storage access key |

**Important**: After adding settings, click Save and restart the app.

## 📦 Azure Blob Storage Setup

The application uses Azure Blob Storage for file uploads:

### Required Containers
1. `beniteca-photos` (Private)
2. `beniteca-documents` (Private)

### Authentication Method
- Connection String authentication
- SAS tokens generated server-side for secure file access
- Read-only tokens with 1-year validity

### Network Access
Ensure Azure App Service can reach the storage account:
- Allow Azure services in storage firewall
- Or add App Service outbound IPs to whitelist

## 🧪 Testing in Production

After deployment, test these features:

- ✅ Home page loads and displays existing obras
- ✅ Create new obra with cover image
- ✅ Navigate level hierarchy with breadcrumbs
- ✅ Add/edit/delete sublevels
- ✅ Add materials with delivery/assembly status
- ✅ Upload and view photos (Before/During/After)
- ✅ Upload and download documents
- ✅ Add notes to levels
- ✅ Use tree sidebar for navigation

## 🔍 API Endpoints
   npm run prisma:generate
   ```

4. Run migrations (after setting up DB):
   ```bash
   npm run prisma:migrate
   ```

5. Seed database (optional):
   ```bash
   npm run prisma:seed
   ```

6. Start the server:
   ```bash
   npm run dev  # Development
   NODE_ENV=test npm start  # Test
   NODE_ENV=production npm start  # Production
   ```

## API Endpoints

### Users
- `GET /users` - List all users
- `GET /users/:id` - Get user by ID
- `POST /users` - Create user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Levels (Projects)
- `GET /levels` - List all levels
- `GET /levels/:id` - Get level by ID
- `POST /levels` - Create level
- `PUT /levels/:id` - Update level
- `DELETE /levels/:id` - Delete level
- `POST /levels/:id/complete` - Mark level as completed

### Materials
- `GET /materials/level/:levelId` - Get materials by level
- `POST /materials` - Create material
- `PUT /materials/:id` - Update material
- `DELETE /materials/:id` - Delete material

### Photos
- `GET /photos/level/:levelId` - Get photos by level
- `POST /photos` - Create photo
- `PUT /photos/:id` - Update photo
- `DELETE /photos/:id` - Delete photo

### Permissions
- `POST /permissions/assign` - Assign permission
- `POST /permissions/remove` - Remove permission
- `GET /permissions/user/:userId` - Get permissions by user
- `GET /permissions/level/:levelId` - Get permissions by level

## Database Schema

See `prisma/schema.prisma` for the complete schema with relations.

Key models:
- User: email, name, status
- Level: hierarchical projects with parent-child relations
- Material: per level
- Photo: per level with Azure Blob URLs
- Permission: user-level access control

## Deployment

Ready for Azure App Service. Ensure environment variables are set in Azure.

## Notes

- Permissions and authentication logic placeholders are in place but need implementation based on your auth provider.
- Photo uploads to Azure Blob need implementation in services.
- Client read-only view API can be added as needed.
