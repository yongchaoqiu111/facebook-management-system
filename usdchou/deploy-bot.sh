#!/bin/bash
# 自动发包机器人云端部署脚本

echo "🚀 开始部署自动发包机器人..."

# 1. 上传文件
echo "📤 上传机器人文件..."
scp auto-redpacket-bot.js root@47.239.86.249:/opt/usdt-chain/backend/
scp package.json root@47.239.86.249:/opt/usdt-chain/backend/

# 2. SSH 连接并安装
echo "🔧 配置云端环境..."
ssh root@47.239.86.249 << 'EOF'
cd /opt/usdt-chain/backend

# 安装依赖
echo "📦 安装依赖..."
npm install socket.io-client jsonwebtoken

# 检查 PM2 是否已安装
if ! command -v pm2 &> /dev/null; then
    echo "⚠️ PM2 未安装，正在安装..."
    npm install -g pm2
fi

# 停止旧进程（如果存在）
pm2 stop redpacket-bot 2>/dev/null || true
pm2 delete redpacket-bot 2>/dev/null || true

# 启动机器人
echo "✅ 启动机器人..."
pm2 start auto-redpacket-bot.js --name redpacket-bot

# 设置开机自启
pm2 save
pm2 startup systemd -u root --hp /root

# 查看状态
echo ""
echo "📊 机器人状态:"
pm2 status redpacket-bot

echo ""
echo "📝 最近日志:"
pm2 logs redpacket-bot --lines 10 --nostream

echo ""
echo "✅ 部署完成！"
echo "💡 管理命令:"
echo "   pm2 logs redpacket-bot     # 查看日志"
echo "   pm2 restart redpacket-bot  # 重启"
echo "   pm2 stop redpacket-bot     # 停止"
EOF

echo ""
echo "🎉 部署脚本执行完毕！"
