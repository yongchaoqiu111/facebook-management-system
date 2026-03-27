@echo off
chcp 65001 >nul 2>&1
title 一键安装 - Facebook管理系统

echo ==============================================
echo         一键安装 - Facebook管理系统
echo ==============================================
echo.
echo 🚀 正在进行首次安装...
echo.

REM 检查Node.js安装
echo [1/4] 检查Node.js版本...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js未安装，请先安装Node.js: https://nodejs.org/
    pause
    exit /b 1
)

REM 获取Node.js版本
for /f "delims=v" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✅ Node.js版本: v%NODE_VERSION%

REM 安装npm依赖
echo.
echo [2/4] 安装项目依赖...
echo 正在安装以下依赖:
echo - playwright (浏览器自动化)
echo - axios (HTTP客户端)
echo - express (Web服务器)
echo - node-schedule (任务调度)
echo - cheerio (HTML解析器)
echo - 其他开发依赖...
npm install
if %errorlevel% neq 0 (
    echo ❌ 依赖安装失败，请检查网络连接。
    echo 尝试清理缓存: npm cache clean --force
    pause
    exit /b 1
)
echo ✅ 项目依赖安装成功

REM 安装Playwright浏览器
echo.
echo [3/4] 安装Playwright浏览器驱动...
npx playwright install
if %errorlevel% neq 0 (
    echo ❌ Playwright浏览器安装失败。
    echo 请手动运行: npx playwright install
    pause
    exit /b 1
)
echo ✅ Playwright浏览器驱动安装成功

REM 创建必要目录（新结构）
echo.
echo [4/4] 创建必要目录...
if not exist "user-config" mkdir user-config
if not exist "user-config\assets" mkdir user-config\assets
if not exist "user-config\assets\tiezi" mkdir user-config\assets\tiezi
if not exist "user-config\assets\images" mkdir user-config\assets\images
if not exist "user-config\accounts" mkdir user-config\accounts
if not exist "user-config\credentials" mkdir user-config\credentials
echo ✅ 目录创建成功

REM 安装完成
echo.
echo ==============================================
echo ✅ 安装完成！
echo ==============================================
echo.
echo 请配置以下文件:
echo 1. user-config/credentials/llm-api-key2.txt - 添加LLM API Key
echo 2. user-config/accounts/facebook.txt - 添加Facebook登录Cookie
echo.
echo 配置完成后，运行 一键重启服务器.bat 启动服务
echo.
echo 访问控制面板: http://localhost:3000/scheduler.html
echo.
pause