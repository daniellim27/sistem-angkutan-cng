@echo off
echo WARNING: This will remove all containers and data!
echo This includes the PostgreSQL database and all uploaded files.
echo.
set /p confirm=Are you sure you want to continue? (y/N): 
if /i not "%confirm%"=="y" (
    echo Operation cancelled.
    pause
    exit /b 0
)

echo.
echo Stopping and removing containers...
docker-compose down -v

echo.
echo Removing images...
docker-compose down --rmi all

echo.
echo Cleaning up...
docker system prune -f

echo.
echo Reset complete! All data has been removed.
echo Run docker-start.bat to start fresh.
echo.
pause
