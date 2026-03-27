@echo off
echo ==============================================
echo Push changes to GitHub
echo ==============================================
echo.

cd /d D:\weibo

echo [1/1] Pushing to remote...
git push origin main

if %errorlevel% equ 0 (
    echo.
    echo Push successful!
) else (
    echo.
    echo Push failed! Check error message.
)

echo.
echo Press any key to exit...
pause >nul