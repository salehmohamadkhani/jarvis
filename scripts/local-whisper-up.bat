@echo off
setlocal EnableExtensions
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0local-whisper-up.ps1"
echo.
pause
