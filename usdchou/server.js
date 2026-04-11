const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

// 📝 创建联调日志存储文件
const CHAT_LOG_FILE = path.join(__dirname, 'chat-log.json');
if (!fs.existsSync(CHAT_LOG_FILE)) {
  fs.writeFileSync(CHAT_LOG_FILE, JSON.stringify([], null, 2));
}

dotenv.config();

const logger = require('./config/logger');

const app = express();
const server = http.createServer(app);

// 初始化 Socket.io 服务（使用新的 SocketService）
const SocketService = require('./services/socketService');
const socketService = new SocketService(server);

// 📡 将 socketService 挂载到 global，供路由使用
global.socketService = socketService;

// 启动持久化服务
const persistenceService = require('./services/persistenceService');
persistenceService.start();

// 启动 TRON 充值监听服务（自动化）
const depositListener = require('./services/depositListener');
depositListener.start();

// 🎰 启动六合彩开奖定时任务
const lotteryScheduler = require('./services/lotteryScheduler');
lotteryScheduler.start();

// 💾 启动数据库自动备份（每天凌晨2点）
const databaseBackup = require('./services/databaseBackup');
databaseBackup.startScheduledBackup();

// 保留 io 变量用于向后兼容
const io = socketService.io;

// ✅ 配置 CORS（允许跨域请求）
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://47.239.86.249', 'https://yourdomain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));
app.use(express.json());

if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

const connectWithRetry = () => {
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/usdchou', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(async () => {
    logger.info('Connected to MongoDB successfully');
    
    // 🌟 初始化公共群（确保公共群存在）
    try {
      const initializePublicGroups = require('./scripts/initPublicGroup');
      await initializePublicGroups();
      logger.info('✅ Public groups initialized');
    } catch (err) {
      logger.error('Failed to initialize public groups:', err);
    }
  }).catch(err => {
    logger.error('MongoDB connection error:', err);
    logger.info('Retrying MongoDB connection in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  });
};

connectWithRetry();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const redPacketRoutes = require('./routes/redPackets');
const walletRoutes = require('./routes/wallet');
const friendRoutes = require('./routes/friends');
const groupRoutes = require('./routes/groups');
const chatRoutes = require('./routes/chats');
const settingsRoutes = require('./routes/settings');
const receiptRoutes = require('./routes/receipts');
const liuheRoutes = require('./routes/liuhe');
const lotteryRoutes = require('./routes/lottery');
const chainGroupsRoutes = require('./routes/chainGroups');
const messageCache = require('./services/messageCache');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/redpackets', redPacketRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/liuhe', liuheRoutes);
app.use('/api/lottery', lotteryRoutes);
app.use('/api/chain-groups', chainGroupsRoutes);

// 📡 联调监控页面
app.get('/chat-monitor', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat-monitor.html'));
});

// 📝 获取联调消息
app.get('/api/chat-messages', (req, res) => {
  try {
    const messages = JSON.parse(fs.readFileSync(CHAT_LOG_FILE, 'utf8'));
    res.json(messages);
  } catch (err) {
    res.json([]);
  }
});

// 📝 发送联调消息（供 AI 助手使用）
app.post('/api/chat-messages', (req, res) => {
  try {
    const { sender, senderName, content } = req.body;
    
    const messages = JSON.parse(fs.readFileSync(CHAT_LOG_FILE, 'utf8'));
    const newMessage = {
      id: messages.length + 1,
      sender,
      senderName,
      content,
      timestamp: new Date().toISOString()
    };
    
    messages.push(newMessage);
    
    // 只保留最近 100 条消息
    if (messages.length > 100) {
      messages.shift();
    }
    
    fs.writeFileSync(CHAT_LOG_FILE, JSON.stringify(messages, null, 2));
    
    res.json({ success: true, message: newMessage });
  } catch (err) {
    logger.error('Error saving chat message:', err);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

app.use('/', express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to USDCHOU Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      messages: '/api/messages',
      redpackets: '/api/redpackets',
      wallet: '/api/wallet',
      friends: '/api/friends',
      groups: '/api/groups',
      chats: '/api/chats',
      settings: '/api/settings',
      receipts: '/api/receipts',
      health: '/health',
      chatMonitor: '/chat-monitor'
    }
  });
});

app.get('/health', (req, res) => {
  const status = mongoose.connection.readyState === 1 ? 'ok' : 'degraded';
  
  res.json({
    status: status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      connected: mongoose.connection.readyState === 1
    },
    server: {
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

app.use((err, req, res, next) => {
  logger.error('Global error:', err);
  
  res.status(err.status || 500).json({
    error: {
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message,
      status: err.status || 500,
      timestamp: new Date().toISOString()
    }
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Endpoint not found',
      status: 404,
      path: req.originalUrl
    }
  });
});

// 注意：旧的 Socket.io 实现已迁移到 SocketService
// 保留此代码作为后备，但建议使用新的 SocketService
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);

  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    logger.info(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on('sendMessage', (data) => {
    io.to(data.roomId).emit('message', data);
    logger.info(`Message sent to room ${data.roomId}`);
  });

  socket.on('sendRedPacket', (data) => {
    io.to(data.roomId).emit('redPacket', data);
    logger.info(`Red packet sent to room ${data.roomId}`);
  });

  socket.on('openRedPacket', (data) => {
    io.to(data.roomId).emit('redPacketOpened', data);
    logger.info(`Red packet opened in room ${data.roomId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Health check available at http://0.0.0.0:${PORT}/health`);
});

setInterval(async () => {
  logger.info('Starting scheduled message persistence...');
  await messageCache.persistMessages();
}, 300000);

// 📡 导出 socketService 实例供路由使用
module.exports = { socketService };