@echo off
chcp 65001 >nul 2>&1
title Server Restart - Facebook Management System

echo ==============================================
echo         Server Restart - Facebook Management System
echo ==============================================
echo.

REM Project path
set PROJECT_DIR=D:\weibo

if not exist "%PROJECT_DIR%" (
    echo ERROR: Project directory not found!
    echo Please run Install.bat or Update.bat first.
    pause
    exit /b 1
)

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

echo Starting server...
echo Command: node server.js
echo ==============================================
echo.

start /b node server.js

echo Waiting for server to start...
timeout /t 3 /nobreak >nul

echo Opening browser...
start http://localhost:3000/

echo Server started successfully!
echo Access URL: http://localhost:3000/
echo.
echo Press any key to exit...
pause >nul