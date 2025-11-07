# 🗄️ Database Migration Guide

This guide explains how to avoid missing database migrations and keep your development environment consistent.

## 🚀 Quick Setup

### New Developer Setup
```bash
# 1. Clone the project
git clone [your-repo-url]
cd [project-name]

# 2. Run the automated setup (Windows)
start.bat

# OR manually:

# 3. Start PostgreSQL
./start.bat

# 4. Install backend dependencies and run migrations
cd backend
npm install
npm run migrate
npm run seeder

# 5. Install frontend dependencies
cd ../frontend
npm install
npm start
```

## 🔧 Migration Commands

### Check Migration Status
```bash
cd backend
npm run migrate:status
```

### Run Pending Migrations
```bash
cd backend
npm run migrate
```

### Check Database Setup
```bash
cd backend
npm run db:check
```

### Full Database Setup (migrations + seeders)
```bash
cd backend
npm run db:setup
```

## 🛡️ Automatic Migration System

### How It Works
- **Auto-Migration**: The server automatically checks and runs migrations on startup
- **Migration Tracking**: Each migration is tracked in the `schema_migrations` table
- **Safe Execution**: Migrations run in transactions and won't re-run if already executed
- **Error Prevention**: Server won't start if critical migrations fail

### Environment Control
```bash
# In backend/.env
AUTO_MIGRATE=true   # Enable automatic migrations (default)
AUTO_MIGRATE=false  # Disable automatic migrations
```

## 📝 Adding New Migrations

### 1. Create Migration File
```bash
# Create new migration in backend/src/migrations/
touch backend/src/migrations/2024_01_16_add_new_feature.sql
```

### 2. Update Migration Runner
```javascript
// In backend/src/utils/migrationRunner.js
this.migrationOrder = [
  'init.sql',
  'add_driver_locations_table.sql',
  '2024_01_16_add_new_feature.sql'  // Add your new migration
];
```

### 3. Test Migration
```bash
cd backend
npm run migrate:status  # Check current status
npm run migrate         # Run new migration
```

## 🚨 Troubleshooting

### Migration Failed
```bash
# Check detailed error
cd backend
npm run migrate:status

# Fix and retry
npm run migrate
```

### Database Connection Issues
```bash
# Check PostgreSQL is running
tasklist | findstr postgres

# Check environment variables
cd backend
cat .env | findstr DB_

# Test connection manually
psql -U postgres -d angkutan_db -c "SELECT version();"
```

### Reset Database (DANGER!)
```bash
# This will destroy all data!
cd backend
npm run migrate:fresh
npm run seeder
```

## 📊 Migration Status Examples

### ✅ All Good
```
📊 Migration Status:
✅ init.sql
✅ add_driver_locations_table.sql

✅ All migrations are up to date
```

### ⚠️ Pending Migrations
```
📊 Migration Status:
✅ init.sql
❌ add_driver_locations_table.sql

⚠️ 1 migrations pending execution
```

## 🔄 Best Practices

### 1. Always Check Status First
```bash
npm run migrate:status
```

### 2. Run Migrations Before Development
```bash
# Every time you pull code
git pull
npm run migrate:status
npm run migrate  # if needed
```

### 3. Test Migrations in Development
```bash
# Before committing new migrations
npm run migrate:status
npm run migrate
npm run seeder  # test with fresh data
```

### 4. Never Skip Migration Errors
If migrations fail:
1. Read the error message carefully
2. Fix the SQL or dependencies
3. Re-run the migration
4. Never manually alter the database to "fix" it

### 5. Keep Migration Order
- Always add new migrations to the end of `migrationOrder`
- Never reorder existing migrations
- Never modify executed migrations

## 🆘 Emergency Recovery

### If Database is Corrupted
```bash
# 1. Backup any important data first!
pg_dump -U postgres angkutan_db > backup.sql

# 2. Drop and recreate database
dropdb -U postgres angkutan_db
createdb -U postgres angkutan_db

# 3. Run all migrations fresh
cd backend
npm run migrate

# 4. Restore data if needed
psql -U postgres angkutan_db < backup.sql
```

### If Server Won't Start
```bash
# 1. Check logs for migration errors
cd backend
npm run migrate:status

# 2. Run migrations manually
npm run migrate

# 3. Disable auto-migration temporarily
# Set AUTO_MIGRATE=false in .env

# 4. Start server and fix issues
npm start
```

## 📋 Checklist for Team Members

- [ ] Always run `npm run migrate:status` when pulling new code
- [ ] Never manually modify the database schema
- [ ] Always test migrations locally before pushing
- [ ] Keep `schema_migrations` table intact
- [ ] Document any manual database changes needed
- [ ] Update `migrationOrder` when adding new migrations

## 🔧 Advanced Configuration

### Custom Migration Directory
```javascript
// In migrationRunner.js
this.migrationsDir = path.join(__dirname, '../custom-migrations');
```

### Migration Timeout
```javascript
// In migrationRunner.js
this.pool = new Pool({
  // ... other config
  query_timeout: 30000  // 30 seconds
});
```

### Backup Before Migrations
```bash
# Add to package.json scripts
"migrate:safe": "npm run db:backup && npm run migrate"
```

## 📞 Support

If you encounter migration issues:
1. Check this guide first
2. Run `  ` and share the output
3. Check server logs for detailed error messages
4. Ask for help with specific error messages, not just "it doesn't work"

---
*Last updated: 2024-01-16* 