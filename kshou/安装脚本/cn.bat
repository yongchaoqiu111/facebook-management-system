@echo off
title TikTok Comment Scraper - Setup Script (China Mirror)
color 0A

echo ============================================
echo   TikTok Comment Scraper - Setup Script
echo   (China Mirror Version)
echo ============================================
echo.

echo [1/4] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo [OK] Node.js is installed
node --version
echo.

echo [2/4] Checking npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not available!
    pause
    exit /b 1
)
echo [OK] npm is available
npm --version
echo.

echo [3/4] Creating package.json...
if not exist package.json (
    npm init -y >nul 2>&1
    echo [OK] package.json created
) else (
    echo [INFO] package.json already exists
)
echo.

echo [4/4] Installing dependencies (using China mirror)...
echo This may take a few minutes...
echo Installing: puppeteer
echo.

npm install puppeteer --save --registry=https://registry.npmmirror.com

if %errorlevel% equ 0 (
    echo.
    echo ============================================
    echo   Installation Complete!
    echo ============================================
    echo.
    echo Dependencies installed:
    echo   - puppeteer
    echo.
    echo To run the scraper:
    echo   node c.js
    echo.
) else (
    echo.
    echo ============================================
    echo   Installation Failed!
    echo ============================================
    echo.
    echo Please check your internet connection.
    echo.
)

pause