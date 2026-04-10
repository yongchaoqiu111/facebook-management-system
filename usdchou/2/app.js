const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const { connectRedis } = require('./utils/redis');
const redPacketRoutes = require('./routes/redPackets');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chain-group')
  .then(() => console.log('MongoDB连接成功'))
  .catch(err => console.error('MongoDB连接失败:', err));

connectRedis();

app.use('/api/redpackets', redPacketRoutes);

app.get('/', (req, res) => {
  res.send('服务器运行正常');
});

io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);
  
  socket.on('joinGroup', (groupId) => {
    socket.join(groupId);
    console.log(`用户${socket.id}加入群组${groupId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('用户断开连接:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`服务器运行在端口${PORT}`);
});

module.exports = { io };