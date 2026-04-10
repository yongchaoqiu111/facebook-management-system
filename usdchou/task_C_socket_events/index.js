const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const logger = require('./config/logger');
const socketService = require('./services/socketService');

require('./services/redPacketScheduler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

socketService.initialize(io);

mongoose.connect('mongodb://localhost:27017/redpacket_events', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  logger.info('✅ MongoDB connected');
})
.catch(err => {
  logger.error('❌ MongoDB connection failed:', err);
  process.exit(1);
});

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ 
    message: 'Socket Events Service is running',
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
});