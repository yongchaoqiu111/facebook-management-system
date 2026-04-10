@echo off
chcp 65001 >nul
echo ========================================
echo   重启后端 + 前端服务
echo ========================================
echo.

echo [1/3] 停止所有 node 进程...
taskkill /F /IM node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 已停止所有 node 进程
) else (
    echo ⚠️  没有运行中的 node 进程
)
echo.

echo [2/3] 启动后端服务 (usdchou)...
start "后端服务" cmd /k "node server.js"
echo ✅ 后端服务已启动
echo.

timeout /t 2 /nobreak >nul

echo [3/3] 启动前端服务 (usddt)...
cd ..\usddt
start "前端服务" cmd /k "npm run dev"
cd ..\usdchou
echo ✅ 前端服务已启动
echo.

echo ========================================
echo   ✅ 重启完成！
echo   - 后端: http://localhost:5000
echo   - 前端: http://localhost:5173 (或 Vite 显示的地址)
echo ========================================
echo.
