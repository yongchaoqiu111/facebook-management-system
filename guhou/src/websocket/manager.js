const WebSocket = require('ws');
const { COINS, WS_CONFIG } = require('../config');
const priceService = require('../services/priceService');

class WebSocketManager {
  constructor() {
    this.clients = new Map(); // clientId -> { ws, subscriptions, intervals }
    this.maxConnections = WS_CONFIG.MAX_CONNECTIONS;
  }
  
  addClient(ws, clientId) {
    if (this.clients.size >= this.maxConnections) {
      ws.close(1013, '服务器连接数已满');
      return;
    }
    
    this.clients.set(clientId, {
      ws,
      subscriptions: new Set(),
      intervals: new Map(),
      lastHeartbeat: Date.now()
    });
    
    console.log(`客户端 ${clientId} 已连接，当前连接数: ${this.clients.size}`);
  }
  
  subscribe(clientId, channel) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    // 避免重复订阅
    if (client.subscriptions.has(channel)) {
      return;
    }
    
    client.subscriptions.add(channel);
    
    // 创建定时推送
    const interval = setInterval(() => {
      this.pushTradeData(clientId, channel);
    }, 2000);
    
    client.intervals.set(channel, interval);
    
    console.log(`客户端 ${clientId} 订阅 ${channel}`);
  }
  
  pushTradeData(clientId, channel) {
    const client = this.clients.get(clientId);
    if (!client || !client.ws || client.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    
    const symbol = this.extractSymbol(channel);
    const price = priceService.generateRandomPrice(
      COINS.find(c => c.symbol === symbol)?.basePrice || 10000
    );
    
    const tradeData = {
      event: 'trade',
      data: {
        price: price.toFixed(2),
        amount: (Math.random() * 10).toFixed(4),
        timestamp: Math.floor(Date.now() / 1000),
        type: Math.random() > 0.5 ? 'buy' : 'sell'
      }
    };
    
    try {
      client.ws.send(JSON.stringify(tradeData));
    } catch (error) {
      console.error('推送数据失败:', error);
      this.removeClient(clientId);
    }
  }
  
  removeClient(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    // 清理所有定时器
    client.intervals.forEach(interval => clearInterval(interval));
    client.intervals.clear();
    
    // 关闭 WebSocket
    if (client.ws) {
      client.ws.close();
    }
    
    this.clients.delete(clientId);
    console.log(`客户端 ${clientId} 已断开，当前连接数: ${this.clients.size}`);
  }
  
  // 心跳检测
  startHeartbeat() {
    setInterval(() => {
      const now = Date.now();
      
      this.clients.forEach((client, clientId) => {
        if (now - client.lastHeartbeat > 60000) {
          // 超过60秒没有心跳，断开连接
          console.log(`客户端 ${clientId} 心跳超时，断开连接`);
          this.removeClient(clientId);
        } else {
          // 发送心跳
          if (client.ws && client.ws.readyState === WebSocket.OPEN) {
            client.ws.ping();
          }
        }
      });
    }, WS_CONFIG.HEARTBEAT_INTERVAL);
  }
  
  extractSymbol(channel) {
    return channel.replace('live_trades_', '').replace('usd', '').toUpperCase();
  }
}

module.exports = new WebSocketManager();