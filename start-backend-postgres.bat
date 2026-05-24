@echo off
setlocal EnableExtensions

cd /d "%~dp0"
title Jarvis Backend (Postgres)

REM Halate Postgres (Docker/Neon): PGlite khamosh
set USE_PGLITE=false
set PGLITE_MEMORY=

if not exist ".env.local" (
  echo [info] .env.local missing - copying from .env.example
  copy /y ".env.example" ".env.local" >nul
)

echo Backend (Postgres) starting...
echo USE_PGLITE=false (DATABASE_URL from .env / .env.local)
echo.
echo Checking port 3001...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -First 1 | ForEach-Object { Write-Host ('Port 3001 is in use (PID=' + $_ + '). Stopping it...'); Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"

echo Starting server on port 3001...
node server.js

echo.
echo [backend exited - press any key]
pause >nul
