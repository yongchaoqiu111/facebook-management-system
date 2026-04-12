@echo off
chcp 65001 >nul
echo =========================================
echo   清理 usdchou 临时文件
echo =========================================
echo.

cd /d D:\weibo\usdchou

echo [1/3] 删除临时脚本...
del /f /q check_*.js 2>nul
del /f /q test_*.js 2>nul
del /f /q fix_*.js 2>nul
del /f /q clear_*.js 2>nul
del /f /q update_*.js 2>nul
del /f /q add_*.js 2>nul
del /f /q remove_*.js 2>nul
del /f /q debug_*.js 2>nul
del /f /q demo_*.js 2>nul
del /f /q invite_*.js 2>nul
del /f /q monitor_*.js 2>nul
del /f /q notify_*.js 2>nul
del /f /q find_*.js 2>nul
del /f /q get_*.js 2>nul
del /f /q query.js 2>nul

echo [2/3] 删除临时文件夹...
rmdir /s /q logs 2>nul
rmdir /s /q backups 2>nul
rmdir /s /q .lingma 2>nul
rmdir /s /q 1 2>nul
rmdir /s /q 2 2>nul
rmdir /s /q 3 2>nul
rmdir /s /q task_A_message_api 2>nul
rmdir /s /q task_B_redpacket_concurrency 2>nul
rmdir /s /q task_C_socket_events 2>nul
rmdir /s /q task_D_audit_infrastructure 2>nul

echo [3/3] 删除临时文档...
del /f /q "安全方案选择指南.md" 2>nul
del /f /q "进度.txt" 2>nul
del /f /q "快速部署.md" 2>nul

echo.
echo =========================================
echo ✅ 清理完成！
echo =========================================
echo.
pause
