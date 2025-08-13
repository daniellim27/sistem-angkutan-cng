@echo off
setlocal enabledelayedexpansion

set "ROOT=%~dp0"

:: Auto-detect IP address
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr "IPv4"') do (
  set "ip=%%i"
  set "ip=!ip: =!"
  goto :ip_found
)

:ip_found
echo Detected IP: !ip!

:: Update mobile environment
echo EXPO_PUBLIC_API_URL=http://!ip!:3000/api > "%ROOT%mobile\.env"

echo Starting Mobile Expo Server...
cd /d "%ROOT%mobile"
npx expo start --tunnel -c

endlocal