const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/usdchou')
  .then(() => console.log('✅ MongoDB连接成功'))
  .catch(err => console.error('❌ MongoDB连接失败:', err));

class SocketService {
  constructor() {
    this.io = io;
    this.setupListeners();
  }
  
  setupListeners() {
    this.io.on('connection', (socket) => {
      console.log('新客户端连接:', socket.id);
      
      socket.on('joinRoom', ({ userId, groupId }) => {
        if (userId) {
          socket.join(`user:${userId}`);
        }
        if (groupId) {
          socket.join(`group:${groupId}`);
        }
      });
      
      socket.on('disconnect', () => {
        console.log('客户端断开连接:', socket.id);
      });
    });
  }
  
  getIO() {
    return this.io;
  }
}

global.socketService = new SocketService();
global.auditClient = {
  log: (data) => {
    console.log('📋 审计日志:', data);
  }
};

const authMiddleware = require('./middlewares/auth');
const chatsRouter = require('./routes/chats');

app.use('/api/chats', authMiddleware, chatsRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
});
