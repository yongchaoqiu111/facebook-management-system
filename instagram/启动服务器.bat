@echo off
chcp 65001 >nul
echo Instagram Automation Tool
echo ==========================
echo Current directory: %cd%
echo.

if not exist "node_modules" (
    echo Dependencies not found, installing...
    echo.
    npm install
    if %errorlevel% neq 0 (
        echo.
        echo Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
    echo Dependencies installed successfully
)

echo.
echo Starting Instagram Automation Server...
echo Access URL: http://localhost:3003/followers-filter.html
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start server in background
start "" node node.js

REM Wait for server to start
timeout /t 3 /nobreak >nul

REM Open browser
start http://localhost:3003/followers-filter.html