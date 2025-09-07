@echo off
echo Setting up admin user for Angkutan System...
echo.

docker-compose exec backend npm run setup:admin

echo.
echo Admin user setup complete!
echo.
echo Login credentials:
echo Username: admin
echo Password: awak1234
echo.
pause
