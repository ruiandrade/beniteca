# Beniteca

Production-ready Node.js backend for managing construction projects ("obras") with hierarchical levels, strong database modelling, role-based access control, and clear separation between development, test, and production environments.

## Features

- Hierarchical project structure with unlimited depth
- User roles: Admin (A), Construction Manager (C), Write (W), Read-only (R)
- Permissions per level
- Materials and photos management
- Azure SQL Database integration
- Azure Blob Storage for photos
- Environment-based configuration

## Tech Stack

- Node.js + Express
- Prisma ORM with SQL Server
- Azure SQL Database
- Azure Blob Storage

## Project Structure

```
src/
  controllers/     # Request handlers
  routes/          # API routes
  services/        # Business logic
  lib/             # Utilities (Prisma client)
prisma/
  schema.prisma    # Database schema
  seed.js          # Seed data
.env.development   # Dev environment vars
.env.test          # Test environment vars
.env.production    # Prod environment vars
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   - Copy `.env.development` and update with your Azure SQL and Blob Storage credentials
   - For test/prod, update respective files

3. Generate Prisma client:
   ```bash
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
