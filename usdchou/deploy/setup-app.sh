#!/bin/bash
# 应用部署脚本（上传代码后运行）

set -e

echo "========================================="
echo "  USDT Chain 应用部署"
echo "========================================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

APP_DIR="/opt/usdt-chain"
FRONTEND_DIR="$APP_DIR/frontend"
BACKEND_DIR="$APP_DIR/backend"

if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}请使用 sudo 运行此脚本${NC}"
    exit 1
fi

echo -e "${GREEN}[1/5] 部署后端服务...${NC}"
cd $BACKEND_DIR

# 安装依赖
echo "安装后端依赖..."
npm install --production

# 创建 .env 文件（如果不存在）
if [ ! -f .env ]; then
    echo "创建 .env 配置文件..."
    cat > .env << EOF
PORT=3000
MONGODB_URI=mongodb://localhost:27017/usdchou
JWT_SECRET=usdchou_secret_key_$(date +%s)
NODE_ENV=production

# TRON 区块链配置
TRON_FULL_HOST=https://api.trongrid.io
TRON_SOLIDITY_HOST=https://api.trongrid.io
TRON_EVENT_HOST=https://api.trongrid.io
TRON_NETWORK=mainnet

# 平台主钱包配置（请修改为实际值）
TRON_PLATFORM_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
TRON_PLATFORM_ADDRESS=YOUR_ADDRESS_HERE

# USDT-TRC20 合约地址（主网）
USDT_CONTRACT_ADDRESS=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
EOF
    echo -e "${YELLOW}⚠️  请编辑 $BACKEND_DIR/.env 文件，配置 TRON 钱包私钥${NC}"
fi

# 启动后端服务
echo "启动后端服务..."
pm2 delete usdt-chain-backend 2>/dev/null || true
pm2 start server.js --name usdt-chain-backend --env production
pm2 save
pm2 startup systemd -u root --hp /root

echo -e "${GREEN}✅ 后端服务已启动${NC}"
echo ""

echo -e "${GREEN}[2/5] 构建前端项目...${NC}"
cd $FRONTEND_DIR

# 安装依赖
echo "安装前端依赖..."
npm install

# 构建生产版本
echo "构建前端..."
npm run build

echo -e "${GREEN}✅ 前端构建完成${NC}"
echo ""

echo -e "${GREEN}[3/5] 配置 Nginx...${NC}"
cat > /etc/nginx/sites-available/usdt-chain << 'EOF'
server {
    listen 80;
    server_name _;  # 替换为你的域名
    
    # 前端静态文件
    location / {
        root /opt/usdt-chain/frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }
    
    # 后端 API 代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket 支持
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 日志
    access_log /var/log/nginx/usdt-chain-access.log;
    error_log /var/log/nginx/usdt-chain-error.log;
}
EOF

# 启用配置
ln -sf /etc/nginx/sites-available/usdt-chain /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 测试并重启 Nginx
nginx -t
systemctl restart nginx

echo -e "${GREEN}✅ Nginx 配置完成${NC}"
echo ""

echo -e "${GREEN}[4/5] 配置 HTTPS（可选）...${NC}"
read -p "是否配置 HTTPS？(y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "请输入域名: " DOMAIN
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
    echo -e "${GREEN}✅ HTTPS 配置完成${NC}"
else
    echo -e "${YELLOW}跳过 HTTPS 配置${NC}"
fi
echo ""

echo -e "${GREEN}[5/5] 检查服务状态...${NC}"
echo ""
echo "PM2 进程列表:"
pm2 list
echo ""
echo "Nginx 状态:"
systemctl status nginx --no-pager | head -5
echo ""
echo "MongoDB 状态:"
systemctl status mongod --no-pager | head -5
echo ""
echo "Redis 状态:"
systemctl status redis-server --no-pager | head -5
echo ""

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✅ 部署完成！${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "访问地址："
echo "  HTTP:  http://服务器IP"
echo "  API:   http://服务器IP/api/"
echo ""
echo "常用命令："
echo "  查看日志: pm2 logs usdt-chain-backend"
echo "  重启服务: pm2 restart usdt-chain-backend"
echo "  停止服务: pm2 stop usdt-chain-backend"
echo "  查看状态: pm2 status"
echo ""
echo "注意事项："
echo "  1. 请确保在 .env 中配置了正确的 TRON 钱包私钥"
echo "  2. 如需使用域名，请修改 Nginx 配置中的 server_name"
echo "  3. 建议配置 HTTPS 以提高安全性"
echo ""
