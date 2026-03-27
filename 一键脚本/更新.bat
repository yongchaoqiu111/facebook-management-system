@echo off
cd /d D:\
echo 正在备份核心文件...
if not exist weibo_bak mkdir weibo_bak
xcopy weibo\.env weibo_bak\ /y >nul 2>&1
xcopy weibo\weibo.db weibo_bak\ /y >nul 2>&1
xcopy weibo\user-config weibo_bak\user-config /e /y >nul 2>&1
xcopy weibo\video weibo_bak\video /e /y >nul 2>&1

echo 正在下载新代码...
rmdir /s /q weibo_temp 2>nul
git clone --depth 1 https://github.com/yongchaoqiu111/facebook-management-system.git weibo_temp

if exist weibo_temp (
    echo 正在替换代码...
    rmdir /s /q weibo 2>nul
    rename weibo_temp weibo
    
    echo 正在恢复核心文件...
    xcopy weibo_bak\* weibo\ /e /y >nul 2>&1
    
    echo 清理临时文件...
    rmdir /s /q weibo_bak 2>nul
    
    echo ====== 更新成功！ ======
    echo 核心文件（.env、weibo.db、user-config、video）已保留
) else (
    echo 更新失败，请检查网络
)

pause