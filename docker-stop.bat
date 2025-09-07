@echo off
echo Stopping Angkutan System Docker containers...
echo.

docker-compose down

echo.
echo Containers stopped successfully!
echo.
echo To remove all data (including database), run:
echo docker-compose down -v
echo.
pause
