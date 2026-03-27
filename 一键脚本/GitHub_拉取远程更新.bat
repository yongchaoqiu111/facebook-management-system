@echo off
echo ==============================================
echo        Pull latest code from GitHub
echo ==============================================
echo.

cd /d D:\weibo

echo [1/1] Pulling updates...
git pull origin main

if %errorlevel% equ 0 (
    echo.
    echo ✅ Pull successful!
) else (
    echo.
    echo ❌ Pull failed! Check error message.
)

echo.
echo Press any key to exit...
pause >nul