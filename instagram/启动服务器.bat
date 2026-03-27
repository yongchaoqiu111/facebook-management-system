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
echo Access URL: http://localhost:3003
echo.
echo Press Ctrl+C to stop the server
echo.

node node.js

if %errorlevel% neq 0 (
    echo.
    echo Server failed to start with error code: %errorlevel%
    pause
    exit /b %errorlevel%
)

pause