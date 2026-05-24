@echo off
setlocal EnableExtensions

cd /d "%~dp0"

echo Starting Jarvis Planner (backend + frontend)...
echo.

REM Start backend + frontend in separate windows, keep them open
start "Jarvis Backend" cmd /k call "%~dp0start-backend.bat"
start "Jarvis Frontend" cmd /k call "%~dp0start-frontend.bat"

echo Done. (Close this window if you want.)
echo Backend:  http://localhost:3001
echo Swagger:  http://localhost:3001/api/docs
echo Frontend: check Frontend window for URL (5173/5174/...)
echo.
pause

