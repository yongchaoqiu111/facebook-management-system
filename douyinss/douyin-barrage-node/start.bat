@echo off
chcp 65001 >nul 2>&1
title Douyin Barrage Node Server

echo ==============================================
echo         Douyin Barrage Node Server
echo ==============================================
echo.

set PROJECT_DIR=%~dp0
cd /d "%PROJECT_DIR%"

echo Current directory: %cd%
echo.

echo Checking for running Node.js processes...
tasklist /fi "imagename eq node.exe" | findstr /i "node.exe" >nul

if %errorlevel% equ 0 (
    echo Stopping Node.js processes...
    taskkill /f /im node.exe
    timeout /t 2 /nobreak >nul
    echo Node.js processes stopped.
    echo.
) else (
    echo No running Node.js processes found.
    echo.
)

echo Starting Douyin Barrage Node Server...
echo Command: node server.js
echo ==============================================
echo.

start /b node server.js

echo Waiting for server to start...
timeout /t 3 /nobreak >nul

echo Server started successfully!
echo HTTP Proxy Port: 12345
echo WebSocket Port: 8888
echo.
echo Please set your browser proxy to: http://127.0.0.1:12345
echo.
echo Press any key to exit...
pause >nul