const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const coins = [
  { symbol: 'BTC', name: 'Bitcoin', basePrice: 68500.50 },
  { symbol: 'ETH', name: 'Ethereum', basePrice: 3500.75 },
  { symbol: 'BNB', name: 'Binance Coin', basePrice: 580.20 },
  { symbol: 'SOL', name: 'Solana', basePrice: 120.45 },
  { symbol: 'ADA', name: 'Cardano', basePrice: 0.52 }
];

function generateRandomPrice(basePrice) {
  const change = (Math.random() - 0.5) * 100;
  return basePrice + change;
}

function generateRandomChange() {
  return ((Math.random() - 0.5) * 10).toFixed(2);
}

function generateKlineData(symbol, step, limit, start) {
  const coin = coins.find(c => c.symbol === symbol);
  if (!coin) return [];
  
  const data = [];
  const basePrice = coin.basePrice;
  
  for (let i = 0; i< limit; i++) {
    const timestamp = start + step * i;
    const open = basePrice + (Math.random() - 0.5) * 100;
    const high = open + Math.random() * 50;
    const low = open - Math.random() * 50;
    const close = (open + high + low) / 3;
    
    data.push([
      timestamp,
      open.toFixed(2),
      high.toFixed(2),
      low.toFixed(2),
      close.toFixed(2),
      Math.floor(Math.random() * 100)
    ]);
  }
  
  return data;
}

// 输入验证中间件
function validateSymbol(req, res, next) {
  const symbol = req.params.symbol.replace('usd', '').toUpperCase();
  
  // 只允许字母
  if (!/^[A-Z]+$/.test(symbol)) {
    return res.status(400).json({ error: '无效的币种代码' });
  }
  
  // 检查是否在支持的列表中
  const supportedCoins = coins.map(c => c.symbol);
  if (!supportedCoins.includes(symbol)) {
    return res.status(400).json({ 
      error: '不支持的币种',
      supported: supportedCoins
    });
  }
  
  req.validatedSymbol = symbol;
  next();
}

// 限流中间件
const rateLimitMap = new Map();

function rateLimiter(options = {}) {
  const {
    windowMs = 60 * 1000,  // 1分钟
    maxRequests = 100       // 最多100次请求
  } = options;
  
  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress;
    const now = Date.now();
    
    if (!rateLimitMap.has(ip)) {
      rateLimitMap.set(ip, { count: 1, startTime: now });
      return next();
    }
    
    const record = rateLimitMap.get(ip);
    
    // 重置窗口
    if (now - record.startTime > windowMs) {
      rateLimitMap.set(ip, { count: 1, startTime: now });
      return next();
    }
    
    // 检查是否超限
    if (record.count >= maxRequests) {
      return res.status(429).json({
        error: '请求过于频繁，请稍后再试',
        retryAfter: Math.ceil((windowMs - (now - record.startTime)) / 1000)
      });
    }
    
    record.count++;
    next();
  };
}

// 定期清理过期记录
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((record, ip) => {
    if (now - record.startTime > 60 * 1000) {
      rateLimitMap.delete(ip);
    }
  });
}, 60 * 1000);

app.get('/ticker/:symbol', rateLimiter({ maxRequests: 60 }), validateSymbol, (req, res) => {
  const symbol = req.validatedSymbol;
  const coin = coins.find(c => c.symbol === symbol);
  
  const price = generateRandomPrice(coin.basePrice);
  const change = generateRandomChange();
  
  res.json({
    last: price.toFixed(2),
    change_percent: change
  });
});

app.get('/ohlc/:symbol', rateLimiter({ maxRequests: 30 }), validateSymbol, (req, res) => {
  const symbol = req.validatedSymbol;
  const step = parseInt(req.query.step) || 900;
  const limit = parseInt(req.query.limit) || 50;
  const start = parseInt(req.query.start) || Math.floor(Date.now() / 1000) - step * limit;
  
  const data = generateKlineData(symbol, step, limit, start);
  
  res.json({ data });
});

// 404 处理中间件
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

const server = app.listen(PORT, () => {
  console.log('后端服务运行在 http://localhost:' + PORT);
});

const wss = new WebSocket.Server({ server });

// 客户端连接管理 - 修复内存泄漏
const clientIntervals = new Map(); // clientId -> Set of intervals

wss.on('connection', (ws, req) => {
  const clientId = req.socket.remoteAddress;
  clientIntervals.set(clientId, new Set());
  console.log('WebSocket客户端已连接:', clientId);
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.event === 'bts:subscribe' && data.data && data.data.channel) {
        const channel = data.data.channel;
        console.log('客户端订阅频道:', clientId, channel);
        
        ws.send(JSON.stringify({
          event: 'bts:subscription_succeeded',
          channel: channel
        }));
        
        const symbol = channel.replace('live_trades_', '').replace('usd', '').toUpperCase();
        const coin = coins.find(c => c.symbol === symbol);
        
        if (coin) {
          // 清除之前的定时器（避免重复订阅导致内存泄漏）
          const oldIntervals = clientIntervals.get(clientId);
          oldIntervals.forEach(interval => clearInterval(interval));
          oldIntervals.clear();
          
          const interval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              const price = generateRandomPrice(coin.basePrice);
              const tradeData = {
                event: 'trade',
                data: {
                  price: price.toFixed(2),
                  amount: (Math.random() * 10).toFixed(4),
                  timestamp: Math.floor(Date.now() / 1000),
                  type: Math.random() > 0.5 ? 'buy' : 'sell'
                }
              };
              ws.send(JSON.stringify(tradeData));
            } else {
              clearInterval(interval);
              oldIntervals.delete(interval);
            }
          }, 2000);
          
          oldIntervals.add(interval);
        }
      }
    } catch (error) {
      console.error('WebSocket消息处理错误:', error);
    }
  });
  
  ws.on('close', () => {
    // 清理定时器 - 防止内存泄漏
    const intervals = clientIntervals.get(clientId);
    if (intervals) {
      intervals.forEach(interval => clearInterval(interval));
      clientIntervals.delete(clientId);
    }
    console.log('WebSocket客户端已断开连接:', clientId);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket客户端错误:', clientId, error);
    // 清理定时器
    const intervals = clientIntervals.get(clientId);
    if (intervals) {
      intervals.forEach(interval => clearInterval(interval));
      clientIntervals.delete(clientId);
    }
  });
});

console.log('WebSocket服务运行在 ws://localhost:' + PORT);