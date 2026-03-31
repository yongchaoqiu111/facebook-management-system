@echo off
chcp 65001 >nul 2>&1
title Server Start - Douyin Management System

echo ==============================================
echo         Server Start - Douyin Management System
echo ==============================================
echo.

REM Project path
set PROJECT_DIR=D:\weibo\douyinss

if not exist "%PROJECT_DIR%" (
    echo ERROR: Project directory not found!
    echo Please check the project path.
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
echo Command: node js/login.js
echo ==============================================
echo.

start /b node js/login.js

echo Waiting for server to start...
timeout /t 3 /nobreak >nul

echo Opening browser...
start http://localhost:3001/login.html

echo Server started successfully!
echo Access URL: http://localhost:3001/login.html
echo.
echo Press any key to exit...
pause >nul