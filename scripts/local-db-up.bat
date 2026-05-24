@echo off
setlocal EnableExtensions

cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0local-db-up.ps1"
echo.
pause
