@echo off
title TikTok Comment Scraper - Dependency Installer
color 0A

echo ============================================
echo   TikTok Comment Scraper - Setup Script
echo ============================================
echo.

echo [1/4] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Recommended: LTS version (20.x or higher)
    echo.
    echo After installation, restart this script.
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
    echo Please reinstall Node.js properly.
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

echo [4/4] Installing dependencies...
echo This may take a few minutes...
echo Installing: puppeteer
echo.

npm install puppeteer --save

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
    echo For help: node c.js --help
    echo.
) else (
    echo.
    echo ============================================
    echo   Installation Failed!
    echo ============================================
    echo.
    echo Possible issues:
    echo   1. Network connection problem
    echo   2. Anti-virus blocking the installation
    echo   3. Insufficient disk space
    echo.
    echo Try running as Administrator, or:
    echo   npm install puppeteer --registry=https://registry.npmmirror.com
    echo.
)

pause