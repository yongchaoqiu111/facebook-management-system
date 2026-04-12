/**
 * 六合彩开奖结算服务
 * 开奖后自动结算所有投注单
 */
const LiuheRedPacket = require('../models/LiuheRedPacket');
const LiuheBet = require('../models/LiuheBet');
const User = require('../models/User');
const lotteryDataService = require('./lotteryDataService');
const logger = require('../config/logger');

class LiuheSettlementService {
  
  /**
   * 结算指定红包
   */
  async settleRedPacket(redPacketId, winningNumbers) {
    try {
      logger.info(`🎯 开始结算红包: ${redPacketId}`);
      
      const redPacket = await LiuheRedPacket.findById(redPacketId);
      
      if (!redPacket) {
        throw new Error('红包不存在');
      }
      
      if (redPacket.status === 'settled') {
        logger.warn(`红包 ${redPacketId} 已经结算过`);
        return;
      }
      
      // 获取所有投注
      const bets = await LiuheBet.find({ 
        redPacket: redPacketId,
        status: 'pending'
      }).populate('user');
      
      logger.info(`找到 ${bets.length} 个待结算投注`);
      
      let totalPayout = 0;  // 总派奖（毛收益，用于计算庄家盈利）
      let totalNetPayout = 0;  // 总净派奖（用户实际到手）
      let totalPlatformFee = 0;  // 平台从闲家抽成
      let winCount = 0;
      let loseCount = 0;
      
      // 逐个结算
      for (const bet of bets) {
        const result = this.calculateBetResult(bet, winningNumbers);
        
        if (result.isWin) {
          // 中奖
          bet.status = 'won';
          bet.winningNumbers = result.matchedNumbers;
          bet.grossPayout = result.grossPayout;  // 毛收益（49倍）
          bet.platformFee = result.platformFee;   // 平台抽成
          bet.netPayout = result.netPayout;       // 净收益（48倍，用户实际到手）
          
          // 给用户加钱（实际到手的金额）
          const user = await User.findById(bet.user);
          user.balance += result.netPayout;
          await user.save();
          
          totalPayout += result.grossPayout;  // 累计毛收益（用于计算庄家盈利）
          totalNetPayout += result.netPayout;  // 累计净派奖（用户实际到手）
          totalPlatformFee += result.platformFee;  // 累计平台从闲家抽成
          winCount++;
          
          logger.info(`用户 ${bet.user.username} 中奖`);
          logger.info(`  毛收益: ${result.grossPayout}, 平台抽成: ${result.platformFee}, 实际到手: ${result.netPayout}`);
        } else {
          // 未中奖
          bet.status = 'lost';
          bet.netPayout = -bet.totalAmount;
          loseCount++;
        }
        
        await bet.save();
      }
      
      // 计算庄家盈利
      const totalBetAmount = bets.reduce((sum, bet) => sum + bet.totalAmount, 0);
      
      // 判断是否需要从庄家抽成
      let platformFeeFromBanker = 0;
      
      if (winCount === 0) {
        // 没人中奖，庄家赢得用户投注总额
        // 如果庄家赢得的钱 < 投注额×10倍，平台抽10%
        if (totalBetAmount < totalBetAmount * 10) {
          platformFeeFromBanker = totalBetAmount * 0.1;
        }
      }
      
      // 庄家盈利 = 奖池 + 用户总投注 - 毛收益总和 - 平台从庄家抽成
      const bankerProfit = redPacket.prizePool + totalBetAmount - totalPayout - platformFeeFromBanker;
      
      // 更新红包状态
      redPacket.status = 'settled';
      redPacket.winningNumbers = winningNumbers;
      redPacket.settledAt = new Date();
      redPacket.bankerProfit = bankerProfit;
      redPacket.totalPayout = totalNetPayout;  // 记录净派奖（用户实际到手）
      redPacket.platformCommission = totalPlatformFee + platformFeeFromBanker;  // 平台总抽成
      redPacket.winCount = winCount;
      redPacket.loseCount = loseCount;
      
      await redPacket.save();
      
      logger.info(`✅ 红包 ${redPacketId} 结算完成`);
      logger.info(`   中奖: ${winCount}人, 未中: ${loseCount}人`);
      logger.info(`   总投注: ${totalBetAmount}, 毛收益总和: ${totalPayout}, 净派奖: ${totalNetPayout}`);
      logger.info(`   平台抽成(闲家): ${totalPlatformFee}, 平台抽成(庄家): ${platformFeeFromBanker}, 总计: ${totalPlatformFee + platformFeeFromBanker}`);
      logger.info(`   庄家盈利: ${bankerProfit}`);
      
      return {
        redPacketId,
        winCount,
        loseCount,
        totalPayout,
        bankerProfit: redPacket.bankerProfit
      };
      
    } catch (err) {
      logger.error('结算红包失败:', err);
      throw err;
    }
  }
  
  /**
   * 计算投注结果
   */
  calculateBetResult(bet, winningNumbers) {
    const matchedNumbers = bet.numbers.filter(num => 
      winningNumbers.includes(parseInt(num))
    );
    
    const isWin = matchedNumbers.length > 0;
    
    if (!isWin) {
      return {
        isWin: false,
        matchedNumbers: [],
        payout: 0,
        platformFee: 0
      };
    }
    
    // 计算奖金：赔率49倍，平台抽1倍，实际48倍
    const odds = 49;  // 名义赔率
    const platformFeeRate = 1;  // 平台抽成倍数
    const actualOdds = odds - platformFeeRate;  // 实际赔率48倍
    
    // 总奖金（按49倍算）
    const grossPayout = matchedNumbers.length * bet.amountPerNumber * odds;
    
    // 平台抽成（每注抽1倍）
    const platformFee = matchedNumbers.length * bet.amountPerNumber * platformFeeRate;
    
    // 用户实际到手（48倍）
    const netPayout = grossPayout - platformFee;
    
    return {
      isWin: true,
      matchedNumbers,
      grossPayout,      // 毛收益（49倍）
      platformFee,      // 平台抽成
      netPayout         // 净收益（48倍，用户实际到手）
    };
  }
  
  /**
   * 检查并结算所有到期的红包
   */
  async checkAndSettle() {
    try {
      logger.info('🔍 检查是否有需要结算的红包...');
      
      // 获取最新开奖结果
      const result = await lotteryDataService.getLatestResult();
      
      if (!result) {
        logger.warn('无法获取开奖结果');
        return;
      }
      
      // 查找所有已截止但未结算的红包
      const pendingPackets = await LiuheRedPacket.find({
        status: 'open',
        bettingDeadline: { $lte: new Date() }
      });
      
      if (pendingPackets.length === 0) {
        logger.info('没有需要结算的红包');
        return;
      }
      
      logger.info(`找到 ${pendingPackets.length} 个需要结算的红包`);
      
      // 使用最新的开奖号码结算
      const winningNumbers = result.numbers;
      
      for (const packet of pendingPackets) {
        try {
          await this.settleRedPacket(packet._id, winningNumbers);
        } catch (err) {
          logger.error(`结算红包 ${packet._id} 失败:`, err);
        }
      }
      
    } catch (err) {
      logger.error('检查结算失败:', err);
    }
  }
  
  /**
   * 手动触发结算（用于测试或紧急处理）
   */
  async manualSettle(redPacketId, winningNumbers) {
    return await this.settleRedPacket(redPacketId, winningNumbers);
  }
}

module.exports = new LiuheSettlementService();
