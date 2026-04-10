const { COINS } = require('../config');

class PriceService {
  constructor() {
    this.useRealData = process.env.USE_REAL_DATA === 'true';
  }
  
  async getPrice(symbol) {
    if (this.useRealData) {
      return await this.getRealPrice(symbol);
    } else {
      return this.getMockPrice(symbol);
    }
  }
  
  async getRealPrice(symbol) {
    try {
      // 这里可以接入真实交易所API
      // const res = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`);
      // return {
      //   last: parseFloat(res.data.price).toFixed(2),
      //   change_percent: '0.00'
      // };
      
      // 暂时返回模拟数据
      return this.getMockPrice(symbol);
    } catch (error) {
      console.error('获取真实价格失败:', error.message);
      return this.getMockPrice(symbol);
    }
  }
  
  getMockPrice(symbol) {
    const coin = COINS.find(c => c.symbol === symbol);
    if (!coin) throw new Error('币种不存在');
    
    // 基于基准价格的2%进行波动
    const maxChange = coin.basePrice * 0.02;
    const price = coin.basePrice + (Math.random() - 0.5) * maxChange;
    const change = ((Math.random() - 0.5) * 4).toFixed(2); // 限制涨跌幅在±2%范围内
    
    return {
      last: price.toFixed(2),
      change_percent: change
    };
  }
  
  generateRandomPrice(basePrice) {
    // 基于基准价格的2%进行波动
    const maxChange = basePrice * 0.02;
    const change = (Math.random() - 0.5) * maxChange;
    return basePrice + change;
  }
  
  generateRandomChange() {
    // 限制涨跌幅在±2%范围内
    return ((Math.random() - 0.5) * 4).toFixed(2);
  }
}

module.exports = new PriceService();