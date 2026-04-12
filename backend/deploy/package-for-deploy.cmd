@echo off
chcp 65001 >nul
echo =========================================
echo   USDT Chain 演示站点 - 打包工具
echo =========================================
echo.

set FRONTEND_DIR=%~dp0..\usddt
set BACKEND_DIR=%~dp0..\usdchou
set DEPLOY_DIR=%~dp0deploy-package
set ZIP_FILE=usdt-chain-deploy.zip

echo [1/4] 清理旧的打包文件...
if exist "%DEPLOY_DIR%" rmdir /s /q "%DEPLOY_DIR%"
if exist "%ZIP_FILE%" del /f /q "%ZIP_FILE%"
mkdir "%DEPLOY_DIR%"
mkdir "%DEPLOY_DIR%\frontend"
mkdir "%DEPLOY_DIR%\backend"
mkdir "%DEPLOY_DIR%\scripts"

echo [2/4] 复制前端代码...
xcopy "%FRONTEND_DIR%\*" "%DEPLOY_DIR%\frontend\" /E /I /Y /EXCLUDE:frontend-exclude.txt >nul 2>&1
if errorlevel 1 (
    echo 警告: 部分前端文件复制失败，继续执行...
)

echo [3/4] 复制后端代码...
xcopy "%BACKEND_DIR%\*" "%DEPLOY_DIR%\backend\" /E /I /Y /EXCLUDE:backend-exclude.txt >nul 2>&1
if errorlevel 1 (
    echo 警告: 部分后端文件复制失败，继续执行...
)

echo [4/4] 复制部署脚本...
copy "%~dp0deploy.sh" "%DEPLOY_DIR%\scripts\deploy.sh" >nul
copy "%~dp0setup-app.sh" "%DEPLOY_DIR%\scripts\setup-app.sh" >nul
copy "%~dp0README.md" "%DEPLOY_DIR%\README.md" >nul

echo.
echo =========================================
echo ✅ 打包完成！
echo =========================================
echo.
echo 打包位置: %DEPLOY_DIR%
echo.
echo 下一步操作：
echo   1. 使用 WinSCP 或 FileZilla 上传到服务器
echo   2. 或使用命令: scp -r %DEPLOY_DIR% root@服务器IP:/opt/usdt-chain/
echo   3. SSH 登录服务器后运行部署脚本
echo.
pause
