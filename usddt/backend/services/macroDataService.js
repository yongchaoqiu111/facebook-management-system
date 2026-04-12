/**
 * 宏观数据生成服务
 * 每天自动生成随机宏观数据，包括：
 * - 市值（1-3万亿）
 * - 成交量（100-1000亿）
 * - BTC市值占比（50-60%）
 * - 涨跌幅（-5% ~ +5%）
 * - 价格历史（40个点，随机波动）
 */

const redisClient = require('../config/redis');

const CACHE_KEY = 'macro:data';
const CACHE_TTL = 86400; // 24小时

/**
 * 生成随机浮点数
 */
function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

/**
 * 生成价格历史曲线（40个点）
 * 使用随机游走算法，模拟真实K线波动
 */
function generatePriceHistory() {
  const points = 40;
  const history = [];
  
  // 初始价格（70000-72000之间）
  let currentPrice = randomFloat(70000, 72000, 2);
  history.push(currentPrice);
  
  // 生成后续39个点
  for (let i = 1; i < points; i++) {
    // 每次波动幅度 -300 到 +300
    const change = randomFloat(-300, 300, 2);
    currentPrice += change;
    
    // 确保价格在合理范围内（68000-75000）
    if (currentPrice < 68000) currentPrice = 68000 + randomFloat(0, 500, 2);
    if (currentPrice > 75000) currentPrice = 75000 - randomFloat(0, 500, 2);
    
    history.push(currentPrice);
  }
  
  return history;
}

/**
 * 生成宏观数据
 */
function generateMacroData() {
  // 市值：1-3万亿
  const marketCap = randomFloat(1000000000000, 3000000000000, 0);
  
  // 成交量：100-1000亿
  const volume = randomFloat(10000000000, 100000000000, 0);
  
  // BTC市值占比：50-60%
  const btcDominance = randomFloat(50, 60, 1);
  
  // 市值涨跌幅：-5% ~ +5%
  const marketCapChange = randomFloat(-5, 5, 2);
  
  // 成交量涨跌幅：-10% ~ +10%
  const volumeChange = randomFloat(-10, 10, 2);
  
  // 生成价格历史曲线
  const priceHistory = generatePriceHistory();
  
  return {
    marketCap,
    volume,
    btcDominance,
    marketCapChange,
    volumeChange,
    priceHistory,
    lastUpdate: Date.now()
  };
}

/**
 * 获取宏观数据（优先从Redis读取）
 */
async function getMacroData() {
  try {
    // 尝试从Redis获取
    const cached = await redisClient.get(CACHE_KEY);
    if (cached) {
      console.log('📊 [Macro] 从缓存读取宏观数据');
      return JSON.parse(cached);
    }
    
    // 缓存不存在，生成新数据
    console.log('📊 [Macro] 生成新的宏观数据');
    const data = generateMacroData();
    
    // 保存到Redis
    await redisClient.set(CACHE_KEY, JSON.stringify(data), { EX: CACHE_TTL });
    console.log('✅ [Macro] 数据已缓存到Redis');
    
    return data;
  } catch (error) {
    console.error('❌ [Macro] 获取宏观数据失败:', error);
    // 如果Redis失败，直接返回生成的数据
    return generateMacroData();
  }
}

/**
 * 启动定时任务（每天凌晨2点更新）
 */
function startScheduler() {
  console.log('📊 [Macro] 宏观数据生成服务已启动');
  
  // 立即生成一次
  getMacroData();
  
  // 计算到明天凌晨2点的毫秒数
  function getDelayUntilNext2AM() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);
    return tomorrow - now;
  }
  
  // 定时更新
  setTimeout(() => {
    console.log('📊 [Macro] 定时任务：更新宏观数据');
    getMacroData();
    
    // 之后每24小时更新一次
    setInterval(() => {
      console.log('📊 [Macro] 定时任务：更新宏观数据');
      getMacroData();
    }, 24 * 60 * 60 * 1000);
  }, getDelayUntilNext2AM());
  
  console.log('⏰ [Macro] 下次更新时间：明天凌晨2:00');
}

module.exports = {
  getMacroData,
  generateMacroData,
  startScheduler
};
