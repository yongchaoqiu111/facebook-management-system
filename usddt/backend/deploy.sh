#!/bin/bash

###############################################################################
# USDCHOU 项目一键部署脚本
# 适用于 Ubuntu 20.04 / 22.04
# 使用方法: chmod +x deploy.sh && ./deploy.sh
###############################################################################

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    log_error "请使用 root 用户或 sudo 运行此脚本"
    exit 1
fi

log_info "=========================================="
log_info "  USDCHOU 项目一键部署脚本"
log_info "=========================================="
echo ""

# ==================== 1. 更新系统 ====================
log_info "步骤 1/10: 更新系统..."
apt update && apt upgrade -y
log_info "系统更新完成"
echo ""

# ==================== 2. 安装基础工具 ====================
log_info "步骤 2/10: 安装基础工具..."
apt install -y curl wget git vim net-tools ufw
log_info "基础工具安装完成"
echo ""

# ==================== 3. 安装 Node.js 18.x ====================
log_info "步骤 3/10: 安装 Node.js 18.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    log_info "Node.js 安装完成: $(node --version)"
else
    log_warn "Node.js 已安装: $(node --version)"
fi
echo ""

# ==================== 4. 安装 MongoDB ====================
log_info "步骤 4/10: 安装 MongoDB..."
if ! command -v mongod &> /dev/null; then
    wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
    apt update
    apt install -y mongodb-org
    systemctl start mongod
    systemctl enable mongod
    log_info "MongoDB 安装并启动完成"
else
    log_warn "MongoDB 已安装"
fi
echo ""

# ==================== 5. 安装 Redis ====================
log_info "步骤 5/10: 安装 Redis..."
if ! command -v redis-server &> /dev/null; then
    apt install -y redis-server
    systemctl start redis-server
    systemctl enable redis-server
    log_info "Redis 安装并启动完成"
else
    log_warn "Redis 已安装"
fi
echo ""

# ==================== 6. 安装 Nginx ====================
log_info "步骤 6/10: 安装 Nginx..."
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
    log_info "Nginx 安装并启动完成"
else
    log_warn "Nginx 已安装"
fi
echo ""

# ==================== 7. 配置防火墙 ====================
log_info "步骤 7/10: 配置防火墙..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 5000/tcp
echo "y" | ufw enable
log_info "防火墙配置完成"
echo ""

# ==================== 8. 安装 PM2 ====================
log_info "步骤 8/10: 安装 PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    log_info "PM2 安装完成"
else
    log_warn "PM2 已安装"
fi
echo ""

# ==================== 9. 创建项目目录 ====================
log_info "步骤 9/10: 创建项目目录..."
PROJECT_DIR="/opt/usdchou"
mkdir -p $PROJECT_DIR
mkdir -p /opt/backups/mongodb
mkdir -p /opt/scripts
chmod 755 /opt/backups/mongodb
log_info "项目目录创建完成: $PROJECT_DIR"
echo ""

# ==================== 10. 创建备份脚本 ====================
log_info "步骤 10/10: 创建备份脚本..."
cat > /opt/scripts/backup-mongodb.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/mongodb"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/mongodb_backup_$TIMESTAMP.gz"

mongodump --archive=$BACKUP_FILE --gzip --db usdchou
find $BACKUP_DIR -name "mongodb_backup_*.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
EOF

chmod +x /opt/scripts/backup-mongodb.sh

# 设置定时备份（每天凌晨2点）
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/scripts/backup-mongodb.sh >> /var/log/mongodb-backup.log 2>&1") | crontab -
log_info "备份脚本创建完成，已设置每天凌晨2点自动备份"
echo ""

# ==================== 部署完成提示 ====================
log_info "=========================================="
log_info "  ✅ 基础环境部署完成！"
log_info "=========================================="
echo ""
log_info "接下来请执行以下步骤："
echo ""
log_info "1. 上传项目代码到 $PROJECT_DIR"
echo "   方法1 (Git): cd $PROJECT_DIR && git clone <your-repo-url> ."
echo "   方法2 (SCP): scp -r ./usdchou root@服务器IP:$PROJECT_DIR/"
echo ""
log_info "2. 安装项目依赖"
echo "   cd $PROJECT_DIR && npm install"
echo ""
log_info "3. 配置环境变量"
echo "   cd $PROJECT_DIR && cp .env.example .env && vim .env"
echo ""
log_info "4. 配置 Nginx"
echo "   参考文档: 部署指南.md"
echo ""
log_info "5. 启动应用"
echo "   cd $PROJECT_DIR && pm2 start server.js --name usdchou-backend"
echo "   pm2 startup systemd && pm2 save"
echo ""
log_info "6. 配置 SSL 证书（可选）"
echo "   apt install -y certbot python3-certbot-nginx"
echo "   certbot --nginx -d your-domain.com"
echo ""
log_warn "重要提示："
echo "  - 请修改 .env 文件中的 JWT_SECRET 为随机字符串"
echo "  - 请配置正确的 TRON_API_KEY"
echo "  - 建议修改默认 SSH 端口"
echo "  - 定期更新系统和备份数据"
echo ""
log_info "部署指南详见: 部署指南.md"
echo ""
