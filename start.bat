@echo off
setlocal enabledelayedexpansion

set "ROOT=%~dp0"
set PGDATA=%ROOT%pgsql_data
set PATH=%ROOT%postgresql-17.5-3-windows-x64-binaries\pgsql\bin;%PATH%
set PGPASSWORD=getsuga39

REM ===== CRITICAL BACKEND CONFIG =====
echo DB_HOST=localhost > "%ROOT%backend\.env"
echo DB_PORT=5432 >> "%ROOT%backend\.env"
echo DB_NAME=angkutan_db >> "%ROOT%backend\.env"
echo DB_USER=postgres >> "%ROOT%backend\.env"
echo DB_PASSWORD=getsuga39 >> "%ROOT%backend\.env"
echo PORT=3000 >> "%ROOT%backend\.env"
echo JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_complex >> "%ROOT%backend\.env"
echo BASE_URL=http://localhost:3000 >> "%ROOT%backend\.env"
echo GOOGLE_APPLICATION_CREDENTIALS=./src/config/angkutan-system-d87e3-ef128576fdb9.json >> "%ROOT%backend\.env"
echo FIREBASE_PROJECT_ID=angkutan-system >> "%ROOT%backend\.env"

REM Update frontend environment
echo PORT=3001 > "%ROOT%frontend\.env"
echo REACT_APP_API_URL=http://localhost:3000/api/web >> "%ROOT%frontend\.env"
echo REACT_APP_BACKEND_URL=http://localhost:3000 >> "%ROOT%frontend\.env"

set "NEW_DB=false"

if not exist "%ROOT%pgsql_data" (
    echo Initializing PostgreSQL database...
    mkdir "%ROOT%pgsql_data"
    echo getsuga39 > "%ROOT%pg_password.txt"
    "%ROOT%postgresql-17.5-3-windows-x64-binaries\pgsql\bin\initdb" ^
  -U postgres --encoding=UTF8 --locale=en_US.UTF-8 --pwfile="%ROOT%pg_password.txt" -D "%ROOT%pgsql_data"
    del "%ROOT%pg_password.txt"
    set "NEW_DB=true"
)

echo Starting PostgreSQL...
start "PostgreSQL" "%ROOT%postgresql-17.5-3-windows-x64-binaries\pgsql\bin\pg_ctl" ^
  -D "%ROOT%pgsql_data" -l "%ROOT%postgres.log" start -o "-p 5432"

timeout /t 10 /nobreak > nul

echo Creating database...
"%ROOT%postgresql-17.5-3-windows-x64-binaries\pgsql\bin\psql" -U postgres -p 5432 -c "CREATE DATABASE angkutan_db;" 2> nul

REM Run migrations + hashing only if NEW_DB=true
if "%NEW_DB%"=="true" (
    echo Running migrations for fresh DB...
    pushd "%ROOT%backend"
    call npm install
    call npm run migrate:fresh
    call npm run hash-passwords
    popd
)

REM Start backend with proper binding
echo Starting Backend Server...
start "Backend Server" /D "%ROOT%backend" cmd /c "node src/server.js --host=0.0.0.0"
timeout /t 15 /nobreak > nul

echo Starting Frontend Server...
start "Frontend Server" /D "%ROOT%frontend" cmd /c "npm start"

echo --------------------------------------------
echo All systems are running!
echo 1. Frontend: http://localhost:3001
echo 2. Backend API: http://localhost:3000
echo 3. PostgreSQL: localhost:5432
echo --------------------------------------------
echo Do you want to start mobile? (y/n)
set /p startMobile=
if /i "!startMobile!"=="y" (
    call "%ROOT%start-mobile.bat"
)

pause
