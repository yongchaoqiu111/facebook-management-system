/**
 * 澳门六合彩开奖数据服务
 */
const axios = require('axios');
const logger = require('../config/logger');

class LotteryDataService {
  constructor() {
    this.apiURL = 'https://macaumarksix.com/api/macaujc2.com';
    this.lastResult = null;
  }

  /**
   * 获取最新开奖结果
   * @returns {Object|null} 开奖数据
   */
  async getLatestResult() {
    try {
      const response = await axios.get(this.apiURL, {
        timeout: 10000
      });

      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        
        // 解析开奖号码
        const numbers = result.openCode.split(',').map(n => parseInt(n.trim()));
        
        const parsed = {
          period: result.expect,                    // 期号
          openTime: result.openTime,                // 开奖时间
          numbers: numbers,                         // 开奖号码数组 [35, 37, 26, 5, 25, 15, 43]
          firstNumber: numbers[0],                  // 特码（第一个号码）
          wave: result.wave.split(','),             // 波色
          zodiac: result.zodiac.split(','),         // 生肖
          rawData: result
        };

        this.lastResult = parsed;
        logger.info(`Lottery result fetched: Period ${parsed.period}, Numbers: ${parsed.numbers.join(',')}`);
        
        return parsed;
      }

      return null;
    } catch (err) {
      logger.error('Error fetching lottery result:', err.message);
      return null;
    }
  }

  /**
   * 格式化开奖结果为显示文本
   * @param {Object} result - 开奖数据
   * @returns {String} 格式化后的文本
   */
  formatResult(result) {
    if (!result) return '暂无开奖数据';

    const { period, openTime, numbers, firstNumber, zodiac } = result;
    
    // 提取日期部分
    const date = openTime.split(' ')[0];
    
    return `🎉 第${period}期开奖结果\n` +
           `📅 开奖时间: ${date}\n` +
           `🔢 开奖号码: ${numbers.join(', ')}\n` +
           `⭐ 特码: ${firstNumber} (${zodiac[0]})`;
  }

  /**
   * 检查是否有新的开奖结果
   * @returns {Object|null} 如果有新结果则返回，否则返回 null
   */
  async checkNewResult() {
    const current = await this.getLatestResult();
    
    if (!current) return null;
    
    // 如果是第一次获取，或者期号不同，说明有新结果
    if (!this.lastResult || this.lastResult.period !== current.period) {
      return current;
    }
    
    return null;
  }
}

module.exports = new LotteryDataService();
