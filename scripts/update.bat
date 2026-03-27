@echo off
chcp 65001 >nul
echo ==============================================
echo           快速更新脚本 (仅代码)
echo ==============================================
echo.

echo [1/3] 拉取最新代码...
git pull origin main
if %errorlevel% neq 0 (
    echo ❌ 拉取代码失败，请检查网络连接或Git配置
    pause
    exit /b 1
)
echo ✅ 代码拉取成功

echo.
echo [2/3] 重启服务器...
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
start "" "node" "server.js"

echo.
echo ==============================================
echo           更新完成！
echo ==============================================
echo 服务器已重启，请检查运行状态
echo.
pause
