const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');

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
const macroRoutes = require('./routes/macro');
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
app.use('/api/macro', macroRoutes);

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
  
  // ✅ 虚拟币行情订阅（保留兼容）
  socket.on('subscribeCryptoPrices', async (data) => {
    const { symbols } = data;
    socket.join('crypto_prices');
    logger.info(`User ${socket.id} subscribed to crypto prices: ${symbols}`);
  });
  
  // ✅ K 线数据订阅
  socket.on('subscribeKline', async (data) => {
    const { symbol, timeframe } = data;
    logger.info(`User ${socket.id} subscribed to kline: ${symbol} ${timeframe}`);
    
    try {
      // OKX K 线 API
      const barMap = { '1m': '1m', '5m': '5m', '15m': '15m', '1h': '1H', '4h': '4H', '1d': '1D' };
      const instId = `${symbol}-USDT`;
      const bar = barMap[timeframe] || '1H';
      
      const response = await axios.get(
        `https://www.okx.com/api/v5/market/candles`,
        { params: { instId, bar, limit: 100 }, timeout: 5000 }
      );
      
      if (response.data && response.data.code === '0' && response.data.data) {
        const klines = response.data.data.map(item => ({
          timestamp: parseInt(item[0]),
          open: parseFloat(item[1]),
          high: parseFloat(item[2]),
          low: parseFloat(item[3]),
          close: parseFloat(item[4]),
        })).reverse();
        
        socket.emit('klineUpdate', { symbol, klines });
        logger.info(`✅ Sent kline data for ${symbol}`);
      }
    } catch (error) {
      logger.error(`❌ Failed to fetch kline: ${error.message}`);
    }
  });
  
  // ✅ 虚拟币交易执行（市价单）
  socket.on('executeTrade', async (data) => {
    const { symbol: rawSymbol, type, amount, price } = data;
    const symbol = rawSymbol.toUpperCase(); // 🔥 统一转为大写，防止大小写不匹配
    const userId = socket.userId; // 从 JWT 中获取
    
    logger.info(`💰 [交易请求] 用户 ${userId} ${type === 'buy' ? '买入' : '卖出'} ${amount} ${symbol} @ ${price}`);
    
    try {
      // 1. 获取用户信息
      const User = require('./models/User');
      const user = await User.findById(userId);
      
      if (!user) {
        return socket.emit('tradeError', { message: '用户不存在' });
      }
      
      logger.info(`🔍 [调试信息] 原始 symbol: ${rawSymbol}, 转换后 symbol: ${symbol}`);
      logger.info(`🔍 [调试信息] 用户当前持仓对象:`, user.cryptoHoldings);
      logger.info(`🔍 [调试信息] 尝试读取 ${symbol} 的持仓:`, user.cryptoHoldings.get(symbol));
      
      // 2. 计算总额（保留2位小数）
      const total = parseFloat((price * amount).toFixed(2));
      
      // 3. 验证余额/持仓
      if (type === 'buy') {
        // 买入：检查 USDT 余额
        if (user.balance < total) {
          return socket.emit('tradeError', { 
            message: `余额不足，需要 $${total.toFixed(2)}，当前 $${user.balance.toFixed(2)}` 
          });
        }
        
        // 扣款（保留2位小数）
        user.balance = parseFloat((user.balance - total).toFixed(2));
        
        // 增加持仓（保留8位小数）
        user.cryptoHoldings = user.cryptoHoldings || new Map();
        const currentHolding = user.cryptoHoldings.get(symbol) || 0;
        user.cryptoHoldings.set(symbol, parseFloat((currentHolding + amount).toFixed(8)));
        
      } else if (type === 'sell') {
        // 卖出：检查持仓
        const currentHolding = user.cryptoHoldings?.get(symbol) || 0;
        if (currentHolding < amount) {
          return socket.emit('tradeError', { 
            message: `持仓不足，需要 ${amount} ${symbol}，当前 ${currentHolding} ${symbol}` 
          });
        }
        
        // 减少持仓（保留8位小数）
        user.cryptoHoldings.set(symbol, parseFloat((currentHolding - amount).toFixed(8)));
        
        // 加款（保留2位小数）
        user.balance = parseFloat((user.balance + total).toFixed(2));
      }
      
      // 4. 保存用户数据
      await user.save();
      
      // 5. 记录交易日志
      const TradeRecord = require('./models/TradeRecord');
      await TradeRecord.create({
        userId,
        symbol,
        type,
        amount,
        price,
        total,
        timestamp: Date.now()
      });
      
      logger.info(`✅ [交易成功] ${userId} ${type} ${amount} ${symbol} @ ${price}`);
      
      // 6. WSS 广播交易结果（精度控制）
      socket.emit('tradeExecuted', {
        symbol,
        type,
        amount: parseFloat(amount.toFixed(8)),
        price: parseFloat(price.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        newBalance: parseFloat(user.balance.toFixed(2)),
        newHolding: parseFloat((user.cryptoHoldings.get(symbol) || 0).toFixed(8)),
        timestamp: Date.now()
      });
      
      // 7. 广播余额更新（精度控制）+ 🔥 同时返回所有币种持仓
      const holdings = {}
      if (user.cryptoHoldings) {
        for (const [symbol, amount] of user.cryptoHoldings.entries()) {
          holdings[symbol] = parseFloat(amount.toFixed(8))
        }
      }
      
      socket.emit('balanceUpdated', {
        balance: parseFloat(user.balance.toFixed(2)),
        holdings  // 🔥 新增：返回所有币种持仓
      });
      
    } catch (error) {
      logger.error(`❌ [交易失败] ${error.message}`);
      socket.emit('tradeError', { 
        message: '交易处理失败，请稍后重试' 
      });
    }
  });
  
  // ✅ 获取用户完整虚拟币数据（登录时调用）
  socket.on('getUserCryptoData', async () => {
    const userId = socket.userId;
    
    try {
      const User = require('./models/User');
      const TradeRecord = require('./models/TradeRecord');
      
      const user = await User.findById(userId);
      if (!user) {
        return socket.emit('cryptoError', { message: '用户不存在' });
      }
      
      // 获取所有交易记录（最多 100 条）
      const tradeRecords = await TradeRecord.find({ userId })
        .sort({ timestamp: -1 })
        .limit(100)
        .lean();
      
      // 将 Map 转换为普通对象
      const holdings = {};
      if (user.cryptoHoldings) {
        for (const [symbol, amount] of user.cryptoHoldings.entries()) {
          holdings[symbol] = parseFloat(amount.toFixed(8));
        }
      }
      
      logger.info(`📊 [获取持仓] 用户 ${userId} 持仓:`, holdings);
      
      socket.emit('userCryptoData', {
        holdings,  // {"BTC": 0.5, "ETH": 2.3, "XRP": 33}
        tradeRecords  // 交易记录数组
      });
    } catch (error) {
      logger.error(`❌ [获取持仓失败] ${error.message}`);
      socket.emit('cryptoError', { message: '获取持仓数据失败' });
    }
  });
  
  // ✅ 取消订阅虚拟币行情
  socket.on('unsubscribeCryptoPrices', () => {
    socket.leave('crypto_prices');
    if (socket.cryptoPriceInterval) {
      clearInterval(socket.cryptoPriceInterval);
      socket.cryptoPriceInterval = null;
    }
    logger.info(`User ${socket.id} unsubscribed from crypto prices`);
  });
  
  // ✅ K 线数据订阅
  socket.on('subscribeKline', (data) => {
    const { symbol, timeframe } = data;
    socket.join(`kline_${symbol}_${timeframe}`);
    logger.info(`User ${socket.id} subscribed to kline: ${symbol} ${timeframe}`);
    
    // 模拟 K 线数据
    setTimeout(() => {
      const mockKlines = [];
      const now = Date.now();
      let basePrice = symbol === 'BTC' ? 50000 : symbol === 'ETH' ? 3000 : 400;
      
      for (let i = 100; i >= 0; i--) {
        const timestamp = now - i * 60000;
        const open = basePrice + (Math.random() - 0.5) * 100;
        const close = open + (Math.random() - 0.5) * 100;
        const high = Math.max(open, close) + Math.random() * 50;
        const low = Math.min(open, close) - Math.random() * 50;
        
        mockKlines.push({
          timestamp,
          open: parseFloat(open.toFixed(2)),
          high: parseFloat(high.toFixed(2)),
          low: parseFloat(low.toFixed(2)),
          close: parseFloat(close.toFixed(2))
        });
        
        basePrice = close;
      }
      
      socket.emit('klineUpdate', {
        symbol,
        klines: mockKlines
      });
    }, 100);
  });
  
  // ✅ 取消订阅 K 线
  socket.on('unsubscribeKline', () => {
    // 清理所有 K 线房间
    Array.from(socket.rooms).forEach(room => {
      if (room.startsWith('kline_')) {
        socket.leave(room);
      }
    });
    logger.info(`User ${socket.id} unsubscribed from all klines`);
  });

  socket.on('disconnect', () => {
    // 清理定时器
    if (socket.cryptoPriceInterval) {
      clearInterval(socket.cryptoPriceInterval);
    }
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

// ✅ CoinGecko API - 获取虚拟币价格
const fetchCryptoPrices = async (socket, symbols) => {
  try {
    // CoinGecko ID 映射
    const coinIdMap = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'BNB': 'binancecoin',
      'SOL': 'solana',
      'XRP': 'ripple'
    };
    
    const ids = symbols.map(s => coinIdMap[s]).filter(Boolean).join(',');
    if (!ids) return;
    
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price`,
      {
        params: {
          ids,
          vs_currencies: 'usd',
          include_24hr_change: true
        }
      }
    );
    
    // 发送价格更新
    Object.keys(response.data).forEach(coinId => {
      const data = response.data[coinId];
      const symbol = Object.keys(coinIdMap).find(key => coinIdMap[key] === coinId);
      
      if (symbol) {
        socket.emit('cryptoPriceUpdate', {
          symbol,
          price: data.usd,
          changePercent: data.usd_24h_change ? data.usd_24h_change.toFixed(2) : 0
        });
      }
    });
    
    logger.info(`✅ Fetched crypto prices from CoinGecko`);
  } catch (error) {
    logger.error('❌ Failed to fetch crypto prices:', error.message);
  }
};

// 🤖 虚拟币价格机器人 - 每30秒请求真实API
const cryptoSymbols = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP'];
let cryptoPriceBotInterval = null;
let priceUpdateInterval = null;

// 存储最新真实价格
const latestPrices = {
  'BTC': { price: 72800, change: 0.1 },
  'ETH': { price: 3200, change: 1.5 },
  'BNB': { price: 600, change: -0.5 },
  'SOL': { price: 150, change: 2.0 },
  'XRP': { price: 2.5, change: -1.0 }
};

const startCryptoPriceBot = () => {
  if (cryptoPriceBotInterval) return;
  
  // 等待 socketService 完全初始化
  setTimeout(() => {
    try {
      if (!socketService || !socketService.io) {
        console.error('❌ [虚拟币机器人] socketService 未初始化');
        return;
      }
      
      console.log('🤖 [虚拟币机器人] 启动成功');
      
      // 立即执行一次
      broadcastCryptoPrices();
      
      // 每30秒请求真实API
      cryptoPriceBotInterval = setInterval(broadcastCryptoPrices, 30000);
      
      // 每3秒基于真实价格小幅波动
      priceUpdateInterval = setInterval(updatePricesWithFluctuation, 3000);
    } catch (err) {
      console.error('❌ [虚拟币机器人] 启动失败:', err.message);
    }
  }, 2000); // 延迟2秒启动
};

const broadcastCryptoPrices = async () => {
  try {
    // Bitstamp API - 真实价格数据
    const symbolMap = {
      'BTC': 'btcusd',
      'ETH': 'ethusd',
      'XRP': 'xrpusd'
    };
    
    const requests = Object.entries(symbolMap).map(async ([symbol, pair]) => {
      try {
        const response = await axios.get(
          `https://www.bitstamp.net/api/v2/ticker/${pair}/`,
          { timeout: 5000 }
        );
        
        if (response.data) {
          latestPrices[symbol] = {
            price: parseFloat(response.data.last),
            change: parseFloat(response.data.percent_change_24)
          };
        }
      } catch (err) {
        logger.error(`❌ 获取 ${symbol} 失败:`, err.message);
      }
    });
    
    await Promise.all(requests);
    logger.info(`📡 [虚拟币机器人] 已更新真实价格`);
  } catch (error) {
    logger.error('❌ [虚拟币机器人] 请求失败:', error.message);
  }
};

// 每3秒基于真实价格小幅波动并广播
const updatePricesWithFluctuation = () => {
  if (!socketService) return;
  
  cryptoSymbols.forEach(symbol => {
    const base = latestPrices[symbol];
    if (!base) return;
    
    // 在真实价格基础上 ±0.05% 波动
    const fluctuation = (Math.random() - 0.5) * 0.001; // ±0.05%
    const newPrice = base.price * (1 + fluctuation);
    const newChange = base.change + (Math.random() - 0.5) * 0.1; // 涨跌幅 ±0.05%
    
    socketService.io.emit('cryptoPriceUpdate', {
      symbol,
      price: parseFloat(newPrice.toFixed(2)),
      changePercent: parseFloat(newChange.toFixed(2))
    });
  });
};

// 🚀 启动虚拟币机器人
startCryptoPriceBot();

// 📡 导出 socketService 实例供路由使用
module.exports = { socketService };