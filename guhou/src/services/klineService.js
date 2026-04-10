const { COINS } = require('../config');

class KlineService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 60 * 1000; // 1分钟
  }
  
  getKlineData(symbol, step, limit, start) {
    const cacheKey = `${symbol}:${step}:${limit}:${start}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp< this.cacheTTL) {
      return cached.data;
    }
    
    const data = this.generateKlineData(symbol, step, limit, start);
    
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    // 限制缓存大小
    if (this.cache.size >1000) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    return data;
  }
  
  generateKlineData(symbol, step, limit, start) {
    const coin = COINS.find(c => c.symbol === symbol);
    if (!coin) return [];
    
    const data = [];
    const basePrice = coin.basePrice;
    const maxChange = basePrice * 0.02; // 基于基准价格的2%进行波动
    
    for (let i = 0; i< limit; i++) {
      const timestamp = start + step * i;
      const open = basePrice + (Math.random() - 0.5) * maxChange;
      const high = open + Math.random() * (maxChange / 2);
      const low = open - Math.random() * (maxChange / 2);
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
}

module.exports = new KlineService();