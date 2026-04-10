require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // 币种配置
  COINS: [
    { symbol: 'BTC', name: 'Bitcoin', basePrice: 68500.50 },
    { symbol: 'ETH', name: 'Ethereum', basePrice: 3500.75 },
    { symbol: 'BNB', name: 'Binance Coin', basePrice: 580.20 },
    { symbol: 'SOL', name: 'Solana', basePrice: 120.45 },
    { symbol: 'ADA', name: 'Cardano', basePrice: 0.52 }
  ],
  
  // WebSocket 配置
  WS_CONFIG: {
    HEARTBEAT_INTERVAL: 30000,  // 心跳间隔
    MAX_CONNECTIONS: 1000,      // 最大连接数
    MESSAGE_RATE_LIMIT: 10      // 每秒最大消息数
  },
  
  // CORS 配置
  CORS_CONFIG: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  },
  
  // 限流配置
  RATE_LIMIT_CONFIG: {
    ticker: {
      windowMs: 60 * 1000,
      maxRequests: 60
    },
    ohlc: {
      windowMs: 60 * 1000,
      maxRequests: 30
    }
  }
};