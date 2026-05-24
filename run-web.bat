@echo off
chcp 65001 >nul
echo ========================================
echo   اجرای اپلیکیشن وب Planner
echo ========================================
echo.

if not exist "node_modules" (
    echo در حال نصب وابستگی‌ها...
    call npm install
    echo.
)

echo در حال اجرای سرور توسعه...
echo.
echo اپلیکیشن در مرورگر باز می‌شود...
echo برای توقف، Ctrl+C را فشار دهید
echo.

call npm run dev

pause

