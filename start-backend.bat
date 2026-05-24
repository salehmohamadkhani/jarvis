@echo off
setlocal EnableExtensions

cd /d "%~dp0"
title Jarvis Backend

REM Halate pishfarz: PGlite (bedune Docker/Neon). Baraye Postgres: `start-backend-postgres.bat`
set USE_PGLITE=true
set PGLITE_MEMORY=

if not exist ".env.local" (
  echo [info] .env.local missing - copying from .env.example
  copy /y ".env.example" ".env.local" >nul
)

echo Backend starting (USE_PGLITE=true)...
echo.
echo Checking port 3001...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -First 1 | ForEach-Object { Write-Host ('Port 3001 is in use (PID=' + $_ + '). Stopping it...'); Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"

echo Starting server on port 3001...
node server.js

echo.
echo [backend exited - press any key]
pause >nul

