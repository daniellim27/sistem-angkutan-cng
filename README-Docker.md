# Docker Setup for Angkutan System

This project now includes Docker Compose configuration for easy development and deployment.

## Prerequisites

- Docker Desktop installed and running
- Windows 10/11 with PowerShell or Command Prompt

## Quick Start

### Development Mode

1. **Start the system:**
   ```bash
   # Using batch file (Windows) - RECOMMENDED
   docker-start.bat
   
   # Or using Docker Compose directly
   docker-compose up --build -d
   ```

2. **Access the services:**
   - Backend API: http://localhost:3000
   - PostgreSQL: localhost:5432

3. **Login credentials (automatically created):**
   - Username: `admin`
   - Password: `awak1234`
   - Role: `admin`

4. **View logs:**
   ```bash
   # Using batch file
   docker-logs.bat
   
   # Or using Docker Compose
   docker-compose logs -f
   ```

5. **Stop the system:**
   ```bash
   # Using batch file
   docker-stop.bat
   
   # Or using Docker Compose
   docker-compose down
   ```

### Manual Admin Setup (if needed)

If you need to manually set up the admin user:

```bash
# Run admin setup manually
docker-setup-admin.bat

# Or using Docker Compose
docker-compose exec backend npm run setup:admin
```

### Production Mode

```bash
# Use production configuration
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Services

### PostgreSQL Database
- **Image:** postgres:17.5
- **Port:** 5432 (mapped from container port 5432)
- **Database:** angkutan_db
- **User:** postgres
- **Password:** getsuga39
- **Data Volume:** postgres_data

### Backend API
- **Base Image:** node:18-alpine
- **Port:** 3000
- **Environment:** Development mode with auto-migration enabled
- **Volumes:** 
  - Source code mounted for hot reloading
  - Uploads directory for file storage
  - Config directory for Firebase credentials

## Environment Variables

The following environment variables are configured:

```env
NODE_ENV=development
DB_HOST=postgres
DB_PORT=5432
DB_NAME=angkutan_db
DB_USER=postgres
DB_PASSWORD=getsuga39
PORT=3000
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_complex
BASE_URL=http://localhost:3000
AUTO_MIGRATE=true
```

## File Structure

```
├── docker-compose.yml              # Main Docker Compose configuration
├── docker-compose.override.yml     # Development overrides
├── docker-compose.prod.yml         # Production configuration
├── docker-start.bat               # Windows batch file to start services
├── docker-stop.bat                # Windows batch file to stop services
├── docker-logs.bat                # Windows batch file to view logs
├── docker-reset.bat               # Windows batch file to reset everything
├── .dockerignore                  # Files to ignore in Docker context
└── backend/
    ├── Dockerfile                 # Backend container configuration
    └── .dockerignore              # Backend-specific ignore file
```

## Database Management

### Automatic Setup
- Database is automatically created on first run
- Migrations run automatically when `AUTO_MIGRATE=true`
- Seeder data is loaded from `backend/src/migrations/seeder.sql`

### Manual Database Operations

```bash
# Access PostgreSQL directly
docker-compose exec postgres psql -U postgres -d angkutan_db

# Run migrations manually
docker-compose exec backend npm run migrate

# Run seeders manually
docker-compose exec backend npm run seeder

# Check migration status
docker-compose exec backend npm run migrate:status
```

## Troubleshooting

### Common Issues

1. **Port conflicts:**
   - If port 3000 or 5432 is already in use, modify the ports in `docker-compose.yml`

2. **Database connection issues:**
   - Wait for PostgreSQL to fully start (check health status)
   - Verify environment variables are correct

3. **Permission issues:**
   - Ensure Docker has proper permissions
   - Check file permissions in uploads directory

### Reset Everything

```bash
# Using batch file
docker-reset.bat

# Or manually
docker-compose down -v
docker system prune -f
```

### View Container Status

```bash
docker-compose ps
```

### Access Container Shell

```bash
# Backend container
docker-compose exec backend sh

# PostgreSQL container
docker-compose exec postgres bash
```

## Development Workflow

1. **Start services:** `docker-start.bat`
2. **Make code changes:** Edit files in `backend/src/`
3. **View logs:** `docker-logs.bat` or `docker-compose logs -f backend`
4. **Test API:** Use http://localhost:3000
5. **Stop services:** `docker-stop.bat`

## Production Deployment

1. **Set environment variables:**
   ```bash
   export DB_PASSWORD=your_secure_password
   export JWT_SECRET=your_secure_jwt_secret
   ```

2. **Deploy:**
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

3. **Use reverse proxy:** Configure nginx or similar to expose the backend service

## Notes

- The system uses PostgreSQL 17.5 for consistency with your existing setup
- All uploads are persisted in the `backend/uploads` directory
- Database data is persisted in a Docker volume
- The backend runs in development mode with hot reloading enabled
- Auto-migration is enabled by default for easy setup
