# USDT Chain 演示站点部署指南

## 📋 服务器要求

- **配置**: 2核4G（最低），推荐 4核8G
- **系统**: Ubuntu 22.04 LTS
- **硬盘**: 40GB SSD
- **带宽**: 3-5Mbps
- **地区**: 香港（无需备案）

## 🚀 快速部署

### 第一步：购买服务器

推荐服务商：
- 阿里云国际版（香港）
- 腾讯云国际版（香港）
- Vultr（香港节点）
- DigitalOcean（新加坡节点，速度也不错）

### 第二步：上传部署脚本

```bash
# SSH 登录服务器
ssh root@你的服务器IP

# 创建部署目录
mkdir -p /opt/usdt-chain/deploy
cd /opt/usdt-chain/deploy

# 上传两个脚本文件
# deploy.sh - 基础环境安装
# setup-app.sh - 应用部署
```

### 第三步：运行部署脚本

```bash
# 1. 给脚本执行权限
chmod +x deploy.sh setup-app.sh

# 2. 运行基础环境安装（需要 sudo）
sudo bash deploy.sh

# 等待安装完成（约 5-10 分钟）
```

### 第四步：上传代码

```bash
# 前端代码上传到 /opt/usdt-chain/frontend
# 后端代码上传到 /opt/usdt-chain/backend

# 可以使用 scp 或 git clone
# 示例：使用 git
cd /opt/usdt-chain/frontend
git clone <你的前端仓库地址> .

cd /opt/usdt-chain/backend
git clone <你的后端仓库地址> .
```

### 第五步：配置 TRON 钱包

```bash
# 编辑后端配置文件
nano /opt/usdt-chain/backend/.env

# 修改以下配置：
TRON_PLATFORM_PRIVATE_KEY=你的私钥
TRON_PLATFORM_ADDRESS=你的地址
```

### 第六步：运行应用部署

```bash
sudo bash setup-app.sh

# 按提示操作：
# - 是否配置 HTTPS？输入 y 或 n
# - 如果有域名，输入域名
```

## 🔧 常用管理命令

### PM2 进程管理

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs usdt-chain-backend

# 重启服务
pm2 restart usdt-chain-backend

# 停止服务
pm2 stop usdt-chain-backend

# 删除服务
pm2 delete usdt-chain-backend
```

### Nginx 管理

```bash
# 重启 Nginx
systemctl restart nginx

# 查看状态
systemctl status nginx

# 测试配置
nginx -t
```

### 数据库管理

```bash
# MongoDB
systemctl status mongod
mongosh  # 进入 MongoDB shell

# Redis
systemctl status redis-server
redis-cli  # 进入 Redis CLI
```

## 🌐 访问地址

部署完成后：
- **前端**: http://服务器IP
- **API**: http://服务器IP/api/
- **WebSocket**: ws://服务器IP/socket.io/

## 🔒 安全建议

### 1. 配置防火墙

```bash
# 只开放必要端口
ufw allow ssh      # 22
ufw allow http     # 80
ufw allow https    # 443
ufw enable
```

### 2. 配置 HTTPS

```bash
# 使用 Let's Encrypt 免费证书
certbot --nginx -d yourdomain.com
```

### 3. 修改 SSH 端口

```bash
# 编辑 SSH 配置
nano /etc/ssh/sshd_config

# 修改 Port 22 为其他端口，如 2222
# 重启 SSH 服务
systemctl restart sshd
```

### 4. 定期备份

```bash
# 备份 MongoDB
mongodump --out /backup/mongodb-$(date +%Y%m%d)

# 备份 Redis
redis-cli SAVE
cp /var/lib/redis/dump.rdb /backup/redis-$(date +%Y%m%d).rdb
```

## ⚠️ 注意事项

1. **TRON 私钥安全**
   - 不要将私钥提交到 Git
   - 生产环境使用环境变量管理
   - 定期轮换密钥

2. **MongoDB 安全**
   - 默认只监听 localhost
   - 如需远程访问，配置认证
   - 定期备份数据

3. **性能监控**
   ```bash
   # 查看资源使用
   htop
   
   # 查看磁盘使用
   df -h
   
   # 查看内存使用
   free -h
   ```

4. **日志管理**
   ```bash
   # 清理旧日志
   journalctl --vacuum-time=7d
   
   # 查看 Nginx 日志
   tail -f /var/log/nginx/usdt-chain-access.log
   tail -f /var/log/nginx/usdt-chain-error.log
   ```

## 🆘 故障排查

### 服务无法启动

```bash
# 检查端口占用
netstat -tlnp | grep 5000

# 检查日志
pm2 logs usdt-chain-backend --lines 100

# 检查 MongoDB 连接
mongosh mongodb://localhost:27017/usdchou
```

### WebSocket 连接失败

```bash
# 检查 Nginx 配置
cat /etc/nginx/sites-available/usdt-chain

# 检查防火墙
ufw status

# 测试 WebSocket
curl -i -N -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Host: localhost" \
     -H "Origin: http://localhost" \
     http://localhost:5000/socket.io/
```

### 前端页面空白

```bash
# 检查构建产物
ls -la /opt/usdt-chain/frontend/dist

# 检查 Nginx 配置
nginx -t

# 清除浏览器缓存
# Ctrl+Shift+R (强制刷新)
```

## 📞 技术支持

遇到问题：
1. 查看日志：`pm2 logs usdt-chain-backend`
2. 检查服务状态：`pm2 status`
3. 查看系统资源：`htop`
4. 检查网络连接：`ping api.trongrid.io`

---

**部署时间**: 约 15-20 分钟  
**难度**: ⭐⭐☆☆☆（简单）
