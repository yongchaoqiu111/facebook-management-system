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

REM 启动服务器（非阻塞模式）
start "" node node.js

REM 等待服务器启动
echo Waiting for server to start...
timeout /t 3 /nobreak >nul

REM 打开浏览器
echo Opening browser...
start http://localhost:3003

echo.
echo Server started successfully!
echo Browser opened to http://localhost:3003
echo.
echo Press Ctrl+C to stop the server
echo.

pause