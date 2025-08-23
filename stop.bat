@echo off
setlocal

set "ROOT=%~dp0"
set PATH=%ROOT%postgresql-17.5-3-windows-x64-binaries\pgsql\bin;%PATH%

echo Stopping PostgreSQL...
pg_ctl -D "%ROOT%pgsql_data" stop

echo Stopping Node servers...
taskkill /FI "WINDOWTITLE eq Backend Server" /F > nul 2>&1
taskkill /FI "WINDOWTITLE eq Frontend Server" /F > nul 2>&1

echo All services stopped!
timeout /t 3 /nobreak > nul