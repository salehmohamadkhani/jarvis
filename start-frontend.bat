@echo off
setlocal EnableExtensions

cd /d "%~dp0"
title Jarvis Frontend

if not exist "node_modules" (
  echo Installing dependencies (npm install)...
  call npm install
  echo.
)

echo Frontend starting...
echo.
call npm run dev -- --host

echo.
echo [frontend exited - press any key]
pause >nul

