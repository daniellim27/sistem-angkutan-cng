# 🛠️ Database Authentication Fix Guide

## 🔍 Problem Summary
Your React frontend is showing `ERR_CONNECTION_REFUSED` errors because:
1. ✅ PostgreSQL is running (port 5432)
2. ❌ PostgreSQL password authentication is failing 
3. ❌ Backend server is not running (port 3000)

## 🚀 Quick Solution Steps

### Step 1: Reset PostgreSQL Password

Since none of the common passwords work, you need to reset the postgres user password:

**Option A: Using Windows Services (Recommended)**

1. **Stop PostgreSQL Service:**
   ```bash
   # Open Command Prompt as Administrator
   net stop postgresql-x64-17
   # OR find the exact service name:
   sc query | findstr postgres
   ```

2. **Start PostgreSQL in single-user mode** to reset password:
   ```bash
   cd "C:\Users\daniel\Desktop\System Angkutan Ewaldo\postgresql-17.5-3-windows-x64-binaries\pgsql\bin"
   
   # Start postgres in single-user mode (replace 'your-data-directory')
   postgres --single -D "C:\Program Files\PostgreSQL\17\data" postgres
   
   # OR if using the portable version:
   postgres --single -D "..\..\..\pgsql_data" postgres
   ```

   ```

**Option B: Find and Edit pg_hba.conf (Alternative)**

1. **Find PostgreSQL data directory:**
   ```bash
   # Look for pg_hba.conf file
   dir /s pg_hba.conf
   ```

2. **Edit pg_hba.conf** to temporarily allow connections without password:
   ```
   # Change this line:
   host    all             all             127.0.0.1/32            md5
   
   # To this (temporarily):
   host    all             all             127.0.0.1/32            trust
   ```

3. **Restart PostgreSQL** and reset password:
   ```bash
   net stop postgresql-x64-17
   net start postgresql-x64-17
   
   # Now connect without password:
   psql -U postgres -h localhost
   
   # Reset password:
  
   
   # Exit and revert pg_hba.conf back to 'md5'
   ```

### Step 2: Create Database

Once authentication works:

```bash
cd "C:\Users\daniel\Desktop\System Angkutan Ewaldo\backend"

# Test connection:
node -e "require('dotenv').config(); const {Pool} = require('pg'); const pool = new Pool({host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: 'postgres'}); pool.query('SELECT NOW()', (err, res) => { if(err) console.error('Failed:', err.message); else console.log('✅ Connected:', res.rows[0]); pool.end(); });"

# Create database:
createdb -U postgres angkutan_db
```

### Step 3: Run Migrations and Start Backend

```bash
cd backend

# Run database migrations:
npm run migrate

# Run seeders (optional):
npm run seeder

# Start backend server:
npm run dev
```

### Step 4: Verify Everything Works

1. **Backend should start** and show:
   ```
   🚀 Server running on http://0.0.0.0:3000
   📍 GPS Tracking API: /api/tracking, /api/web/tracking
   ```

2. **Test API endpoint:**
   ```bash
   curl http://localhost:3000/api/health
   ```

3. **Frontend should connect** without `ERR_CONNECTION_REFUSED` errors

## 🔧 Current Configuration

Your `.env` file is set to:
- Database: `angkutan_db`
- User: `postgres` 
- Password: `admin` (currently)
- Host: `localhost`
- Port: `5432`

## 🆘 If Still Having Issues

1. **Check if PostgreSQL data directory exists:**
   ```bash
   dir "C:\Users\daniel\Desktop\System Angkutan Ewaldo\pgsql_data"
   ```

2. **Initialize new PostgreSQL cluster if needed:**
   ```bash
   cd postgresql-17.5-3-windows-x64-binaries\pgsql\bin
   initdb -D "..\..\..\pgsql_data" -U postgres --pwfile=<(echo admin) --auth-local=trust --auth-host=md5
   ```

3. **Start fresh PostgreSQL instance:**
   ```bash
   pg_ctl -D "..\..\..\pgsql_data" -l "..\..\..\pgsql_data\server.log" start
   ```

## ✅ Next Steps After Fix

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm start`
3. Test the tracking API endpoint that was failing

The error should be resolved once PostgreSQL authentication is working properly! 