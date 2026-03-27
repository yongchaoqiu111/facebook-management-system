@echo off
chcp 65001 >nul 2>&1
title 一键部署 OpenClaw AI助手

echo ==============================================
echo        一键部署 OpenClaw AI助手
echo ==============================================
echo.
echo 🚀 正在部署 OpenClaw...
echo.

REM 检查Node.js版本
echo [1/6] 检查Node.js版本...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js未安装，请先安装Node.js 22+版本
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

REM 获取Node.js版本
for /f "delims=v" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✅ Node.js版本: v%NODE_VERSION%

REM 检查pnpm是否安装
echo.
echo [2/6] 检查pnpm是否安装...
pnpm -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  pnpm未安装，正在安装pnpm...
    npm install -g pnpm
    if %errorlevel% neq 0 (
        echo ❌ pnpm安装失败，请手动安装: npm install -g pnpm
        pause
        exit /b 1
    )
    echo ✅ pnpm安装成功
) else (
    echo ✅ pnpm已安装
)

REM 设置项目目录
set "INSTALL_DIR=E:\OpenClaw"
set "GIT_REPO=https://github.com/openclaw/openclaw.git"

echo.
echo [3/6] 克隆OpenClaw仓库...
if exist "%INSTALL_DIR%" (
    echo ⚠️  检测到已存在的安装目录，正在备份...
    set "BACKUP_DIR=%INSTALL_DIR%_backup_%date:~0,4%%date:~5,2%%date:~8,2%"
    if exist "%BACKUP_DIR%" rmdir /s /q "%BACKUP_DIR%"
    ren "%INSTALL_DIR%" "%BACKUP_DIR%"
    echo ✅ 已备份到: %BACKUP_DIR%
)

mkdir "%INSTALL_DIR%"
cd /d "%INSTALL_DIR%"

echo 正在克隆仓库...
git clone "%GIT_REPO%" .
if %errorlevel% neq 0 (
    echo ❌ 克隆仓库失败，请检查网络连接或重试
    pause
    exit /b 1
)
echo ✅ 仓库克隆成功

echo.
echo [4/6] 安装项目依赖...
echo 正在安装依赖，请耐心等待...
pnpm install
if %errorlevel% neq 0 (
    echo ❌ 依赖安装失败，请检查网络连接
    echo 尝试使用淘宝镜像: pnpm config set registry https://registry.npmmirror.com
    pause
    exit /b 1
)
echo ✅ 依赖安装成功

echo.
echo [5/6] 构建项目...
echo 正在构建前端UI和后端模块...
pnpm ui:build
if %errorlevel% neq 0 (
    echo ❌ UI构建失败
    pause
    exit /b 1
)

pnpm build
if %errorlevel% neq 0 (
    echo ❌ 后端构建失败
    pause
    exit /b 1
)
echo ✅ 项目构建成功

echo.
echo [6/6] 初始化并安装后台服务...
echo 正在初始化OpenClaw并安装后台服务...
pnpm openclaw onboard --install-daemon
if %errorlevel% neq 0 (
    echo ⚠️  后台服务安装失败，请手动执行: pnpm openclaw onboard --install-daemon
) else (
    echo ✅ 后台服务安装成功
)

echo.
echo ==============================================
echo 🎉 OpenClaw部署完成！
echo ==============================================
echo ✅ 安装目录: %INSTALL_DIR%
echo ✅ 后台服务已安装
echo.
echo 📝 后续步骤:
echo 1. 配置API密钥和设置
echo 2. 通过聊天软件连接OpenClaw
echo 3. 开始使用AI助手功能
echo.
echo 🚀 启动命令: pnpm openclaw start
echo 📖 访问地址: http://localhost:3000
echo ==============================================
pause