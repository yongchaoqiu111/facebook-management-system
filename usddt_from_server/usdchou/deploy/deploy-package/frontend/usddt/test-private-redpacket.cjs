const io = require('socket.io-client');

// 模拟用户登录获取 token
const token = localStorage.getItem('token') || 'YOUR_TEST_TOKEN';

console.log('🔌 连接 WebSocket...');
const socket = io('http://localhost:5000', {
  transports: ['websocket'],
  auth: {
    token: `Bearer ${token}`
  }
});

socket.on('connect', () => {
  console.log('✅ 连接成功, socket ID:', socket.id);
  
  // 发送私聊红包
  console.log('📤 发送私聊红包...');
  socket.emit('chat:sendPrivateRedPacket', {
    receiverId: '10000001',
    amount: 10,
    message: '测试红包'
  });
});

// 监听所有事件
socket.onAny((eventName, ...args) => {
  console.log(`👂 收到事件: ${eventName}`);
  console.log('👂 数据:', JSON.stringify(args, null, 2));
});

socket.on('connect_error', (error) => {
  console.error('❌ 连接失败:', error.message);
});

setTimeout(() => {
  console.log('⏰ 超时，断开连接');
  socket.disconnect();
  process.exit(0);
}, 10000);
