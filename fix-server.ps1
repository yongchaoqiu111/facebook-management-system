#!/bin/bash
cd /opt/usdt-chain/backend

# 注释掉 lottery 相关行
sed -i 's/^const lotteryRoutes.*$/\/\/ const lotteryRoutes = require(.*)/' server.js
sed -i 's/^app\.use.*\/api\/lottery.*$/\/\/ app.use.*\/api\/lottery/' server.js

# 重启服务
pm2 restart usdchou-backend

echo "✅ 修复完成"
