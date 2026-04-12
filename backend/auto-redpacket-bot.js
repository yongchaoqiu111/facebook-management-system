const io = require('socket.io-client');
const jwt = require('jsonwebtoken');

// 配置
const CONFIG = {
  // 后端地址
  serverUrl: 'http://localhost:3000',
  // 接龙群ID
  groupId: '1000002',
  // 发包用户ID（需要对应的 JWT token）
  userId: '10000002',
  // JWT Secret（云端）
  jwtSecret: 'change-this-to-a-random-string-at-least-32-chars-long',
  // 红包配置
  packetsPerHour: 10,  // 每小时发包数量
  redPacketPerAmount: 10,
  redPacketCount: 1,
  message: '🧧 自动红包'
};

let socket = null;

// 生成 JWT Token
function generateToken(userId) {
  return jwt.sign(
    { user: { id: userId } },
    CONFIG.jwtSecret,
    { expiresIn: '7d' }
  );
}

// 生成随机间隔（毫秒）
function getRandomInterval() {
  // 1小时6包 = 平均10分钟1包
  // 随机范围：5-15分钟（300-900秒）
  const minInterval = 5 * 60 * 1000;   // 5分钟
  const maxInterval = 15 * 60 * 1000;  // 15分钟
  return Math.floor(Math.random() * (maxInterval - minInterval) + minInterval);
}

// 发送红包（通过 WebSocket，模拟玩家）
function sendRedPacket() {
  if (!socket || !socket.connected) {
    console.error('❌ Socket 未连接');
    return;
  }

  console.log(`📤 发送红包`);

  // 通过 WebSocket 发送红包（和前端一样）
  socket.emit('chat:message', {
    msgType: 2,  // 红包消息
    senderId: CONFIG.userId,
    groupId: CONFIG.groupId,
    content: {
      type: 'chainRedpacket',  // 接龙红包类型
      message: CONFIG.message
      // perAmount、count 由后端从群组配置读取
    }
  });
}

// 主函数
async function main() {
  console.log('🚀 自动发包机器人启动');
  console.log(`📌 服务器: ${CONFIG.serverUrl}`);
  console.log(`📌 群ID: ${CONFIG.groupId}`);
  console.log(`📌 用户ID: ${CONFIG.userId}`);
  console.log(`📌 发包频率: ${CONFIG.packetsPerHour}个/小时（随机间隔）`);
  console.log(`📌 红包金额: ${CONFIG.redPacketPerAmount} USDT x ${CONFIG.redPacketCount}`);
  console.log('=========================================');

  // 生成 Token
  const token = generateToken(CONFIG.userId);

  // 连接 Socket
  socket = io(CONFIG.serverUrl, {
    auth: {
      token: token  // 不加 Bearer 前缀
    }
  });

  // 连接成功
  socket.on('connect', () => {
    console.log('✅ Socket 连接成功');
    
    // 立即发送第一个
    sendRedPacket();

    // 定时发送（随机间隔）
    function scheduleNext() {
      const interval = getRandomInterval();
      console.log(`⏰ 下次发包时间: ${interval / 1000}秒后`);
      setTimeout(() => {
        sendRedPacket();
        scheduleNext();
      }, interval);
    }
    
    scheduleNext();
  });

  // 监听错误
  socket.on('errorMessage', (data) => {
    console.error('❌ 错误:', data.msg);
  });

  // 断开连接
  socket.on('disconnect', () => {
    console.warn('⚠️ Socket 断开，5秒后重连...');
    setTimeout(() => {
      socket.connect();
    }, 5000);
  });

  // 连接错误
  socket.on('connect_error', (err) => {
    console.error('❌ 连接错误:', err.message);
  });
}

main().catch(err => {
  console.error('❌ 启动失败:', err);
  process.exit(1);
});
