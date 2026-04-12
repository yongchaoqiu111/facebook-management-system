/**
 * 六合红包配置和工具函数
 */

const LIUHE_CONFIG = {
  totalNumbers: 49,           // 号码总数 1-49
  odds: 49,                   // 赔率 49倍（满水）
  platformFeePerUnit: 1,      // 平台抽成：1倍投注额
  effectiveOdds: 48,          // 实际赔率（49 - 1）
  
  minBetPerNumber: 10,        // 每个号码最小投注 10 USDT
  minPrizePool: 490,          // 最小奖池 490 USDT
  
  /**
   * 计算单号最大投注额度
   * @param {number} prizePool - 奖池金额
   * @returns {number} 单号最大可投注金额
   */
  getMaxBetPerNumber(prizePool) {
    // 确保即使中奖，奖池也足够支付
    // 玩家实得 = betAmount × 48
    // 需要：betAmount × 48 <= prizePool
    return Math.floor(prizePool / this.effectiveOdds * 100) / 100;
  },
  
  /**
   * 计算某个号码的剩余可投注额度
   * @param {Map} betsByNumber - 每个号码的已投注总额
   * @param {number} number - 号码 (1-49)
   * @param {number} prizePool - 奖池金额
   * @returns {number} 剩余可投注金额
   */
  getRemainingLimit(betsByNumber, number, prizePool) {
    const maxBet = this.getMaxBetPerNumber(prizePool);
    const currentBet = betsByNumber.get(String(number)) || 0;
    const remaining = maxBet - currentBet;
    return Math.max(0, remaining);
  },
  
  /**
   * 验证投注是否合法
   * @param {Object} redPacket - 红包对象
   * @param {Array} numbers - 投注号码数组
   * @param {number} amountPerNumber - 每个号码投注金额
   * @throws {Error} 如果投注不合法
   */
  validateBet(redPacket, numbers, amountPerNumber) {
    // 1. 检查红包状态
    if (redPacket.status !== 'open') {
      throw new Error('红包已关闭，无法投注');
    }
    
    // 2. 检查投注截止时间
    if (new Date() > redPacket.bettingDeadline) {
      throw new Error('投注已截止');
    }
    
    // 3. 检查最小投注
    if (amountPerNumber < this.minBetPerNumber) {
      throw new Error(`最小投注 ${this.minBetPerNumber} USDT`);
    }
    
    // 4. 检查号码范围
    for (const num of numbers) {
      if (num < 1 || num > 49) {
        throw new Error(`号码 ${num} 超出范围（1-49）`);
      }
    }
    
    // 5. 检查每个号码的剩余额度
    for (const num of numbers) {
      const remaining = this.getRemainingLimit(
        redPacket.betsByNumber, 
        num, 
        redPacket.prizePool
      );
      
      if (amountPerNumber > remaining) {
        throw new Error(
          `号码 ${num} 只剩 ${remaining.toFixed(2)} USDT 可投`
        );
      }
    }
    
    return true;
  },
  
  /**
   * 计算玩家实得奖金
   * @param {number} betAmount - 投注金额
   * @param {number} matchedCount - 中奖号码数量
   * @returns {Object} { grossPayout, platformFee, netPayout }
   */
  calculatePayout(betAmount, matchedCount) {
    const grossPayout = betAmount * this.odds * matchedCount;
    const platformFee = betAmount * this.platformFeePerUnit * matchedCount;
    const netPayout = grossPayout - platformFee;
    
    return {
      grossPayout,
      platformFee,
      netPayout
    };
  }
};

module.exports = LIUHE_CONFIG;
