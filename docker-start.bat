@echo off
echo Starting Angkutan System with Docker...
echo.

REM Check if Docker is running
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

REM Create necessary directories
if not exist "backend\uploads" mkdir "backend\uploads"
if not exist "backend\uploads\receipts" mkdir "backend\uploads\receipts"
if not exist "backend\uploads\surat_jalan" mkdir "backend\uploads\surat_jalan"
if not exist "backend\uploads\surat_jalan_photos" mkdir "backend\uploads\surat_jalan_photos"

echo Building and starting containers...
docker-compose up --build -d

echo.
echo Waiting for services to be ready...
timeout /t 30 /nobreak > nul

echo.
echo Checking service status...
docker-compose ps

echo.
echo ===========================================
echo Services are starting up!
echo.
echo 1. Backend API: http://localhost:3000
echo 2. PostgreSQL: localhost:5435
echo.
echo To view logs: docker-compose logs -f
echo To stop: docker-compose down
echo ===========================================
echo.

REM Check if services are healthy
docker-compose ps | findstr "Up" >nul
if %errorlevel% equ 0 (
    echo All services are running successfully!
    
    echo.
    echo Setting up admin user...
    docker-compose exec backend npm run setup:admin
    
    echo.
    echo ===========================================
    echo Setup complete! You can now login with:
    echo Username: admin
    echo Password: awak1234
    echo ===========================================
) else (
    echo Some services may still be starting up. Check logs with: docker-compose logs
)

pause
