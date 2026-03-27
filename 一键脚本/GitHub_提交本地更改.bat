@echo off
echo ==============================================
echo Commit local changes to GitHub
echo ==============================================
echo.

cd /d D:\weibo

echo [1/2] Adding all files...
git add .

echo.
echo [2/2] Enter commit message:
set /p commit_msg=Message:

echo.
echo Committing changes...
git commit -m "%commit_msg%"

if %errorlevel% equ 0 (
    echo.
    echo Commit successful!
) else (
    echo.
    echo Commit failed! Check error message.
)

echo.
echo Press any key to exit...
pause >nul