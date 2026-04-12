#!/bin/bash
# USDT Chain 演示站点一键部署脚本
# 适用于：Ubuntu 22.04 LTS (香港服务器)

set -e

echo "========================================="
echo "  USDT Chain 演示站点一键部署"
echo "  适用于 Ubuntu 22.04 LTS"
echo "========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}请使用 sudo 运行此脚本${NC}"
    echo "用法: sudo bash deploy.sh"
    exit 1
fi

# 配置变量
APP_DIR="/opt/usdt-chain"
FRONTEND_DIR="$APP_DIR/frontend"
BACKEND_DIR="$APP_DIR/backend"
NODE_VERSION="18.x"
MONGODB_VERSION="6.0"

echo -e "${GREEN}[1/8] 更新系统包...${NC}"
apt-get update -y
apt-get upgrade -y

echo -e "${GREEN}[2/8] 安装基础依赖...${NC}"
apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    nginx \
    certbot \
    python3-certbot-nginx \
    ufw

echo -e "${GREEN}[3/8] 安装 Node.js ${NODE_VERSION}...${NC}"
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION} | bash -
apt-get install -y nodejs
node --version
npm --version

echo -e "${GREEN}[4/8] 安装 MongoDB ${MONGODB_VERSION}...${NC}"
curl -fsSL https://www.mongodb.org/static/pgp/server-${MONGODB_VERSION}.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-${MONGODB_VERSION}.gpg
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-${MONGODB_VERSION}.gpg ] http://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/${MONGODB_VERSION} multiverse" | tee /etc/apt/sources.list.d/mongodb-org-${MONGODB_VERSION}.list
apt-get update -y
apt-get install -y mongodb-org
systemctl enable mongod
systemctl start mongod

echo -e "${GREEN}[5/8] 安装 Redis...${NC}"
apt-get install -y redis-server
systemctl enable redis-server
systemctl start redis-server

echo -e "${GREEN}[6/8] 安装 PM2 进程管理器...${NC}"
npm install -g pm2

echo -e "${GREEN}[7/8] 创建应用目录...${NC}"
mkdir -p $APP_DIR
mkdir -p $FRONTEND_DIR
mkdir -p $BACKEND_DIR

echo -e "${GREEN}[8/8] 配置防火墙...${NC}"
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw allow 5000/tcp  # 后端 API
ufw --force enable

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✅ 基础环境安装完成！${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "已安装："
echo "  ✓ Node.js $(node --version)"
echo "  ✓ MongoDB $(mongod --version | grep 'db version')"
echo "  ✓ Redis $(redis-server --version)"
echo "  ✓ Nginx $(nginx -v 2>&1)"
echo "  ✓ PM2 $(pm2 --version)"
echo ""
echo "下一步操作："
echo "  1. 上传前端代码到: $FRONTEND_DIR"
echo "  2. 上传后端代码到: $BACKEND_DIR"
echo "  3. 运行: bash setup-app.sh"
echo ""
