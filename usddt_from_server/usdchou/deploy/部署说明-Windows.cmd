@echo off
chcp 65001 >nul
echo =========================================
echo   USDT Chain - Windows 快速部署指南
echo =========================================
echo.

echo 📋 部署步骤：
echo.
echo 第一步：打包代码
echo   双击运行: package-for-deploy.cmd
echo   会生成 deploy-package 文件夹
echo.

echo 第二步：上传到服务器
echo   方法1 - 使用 WinSCP（推荐）：
echo     1. 下载 WinSCP: https://winscp.net/
echo     2. 连接到服务器 (SFTP协议)
echo     3. 上传 deploy-package 文件夹到 /opt/usdt-chain/
echo.
echo   方法2 - 使用命令行（需要安装 Git Bash）：
echo     scp -r deploy-package root@服务器IP:/opt/usdt-chain/
echo.

echo 第三步：SSH 登录服务器
echo   ssh root@服务器IP
echo.

echo 第四步：运行部署脚本
echo   cd /opt/usdt-chain/deploy-package/scripts
echo   chmod +x *.sh
echo   sudo bash deploy.sh
echo.
echo   # 等待基础环境安装完成（约5-10分钟）
echo.
echo   # 上传前端和后端代码到对应目录后
echo   sudo bash setup-app.sh
echo.

echo =========================================
echo 💡 提示：
echo =========================================
echo.
echo 1. 香港服务器无需备案，购买后可立即使用
echo 2. 推荐使用 WinSCP 上传文件，图形界面更直观
echo 3. 部署前确保服务器是 Ubuntu 22.04 LTS
echo 4. TRON 钱包私钥要在 setup-app.sh 运行前配置好
echo.

pause
