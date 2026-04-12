/**
 * 六合彩开奖定时任务
 * 每小时检查一次是否有新的开奖结果，并自动发布到公共群
 */
const lotteryDataService = require('./lotteryDataService');
const liuheSettlementService = require('./liuheSettlementService');
const GroupAnnouncement = require('../models/GroupAnnouncement');
const Group = require('../models/Group');
const socketService = require('./socketService');
const logger = require('../config/logger');

class LotteryScheduler {
  constructor() {
    this.interval = null;
    this.isRunning = false;
  }

  /**
   * 启动定时任务
   */
  start() {
    if (this.isRunning) {
      logger.warn('Lottery scheduler is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting lottery result scheduler...');

    // 立即执行一次
    this.checkAndAnnounce();

    // 每30分钟检查一次（六合彩通常每天21:30开奖）
    this.interval = setInterval(() => {
      this.checkAndAnnounce();
    }, 30 * 60 * 1000); // 30分钟

    logger.info('Lottery scheduler started (checks every 30 minutes)');
  }

  /**
   * 停止定时任务
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      this.isRunning = false;
      logger.info('Lottery scheduler stopped');
    }
  }

  /**
   * 检查并发布开奖结果
   */
  async checkAndAnnounce() {
    try {
      logger.info('Checking for new lottery results...');

      // 1. 获取最新开奖结果
      const result = await lotteryDataService.getLatestResult();
      
      if (!result) {
        logger.warn('Failed to fetch lottery result');
        return;
      }

      // 2. 检查是否是新结果
      const isNewResult = await this.isNewResult(result.period);
      
      if (!isNewResult) {
        logger.info(`Lottery result ${result.period} already announced`);
        return;
      }

      // 3. 发布到所有公共群
      await this.announceToPublicGroups(result);

      // 4. 🎯 结算六合彩投注单
      await liuheSettlementService.checkAndSettle();

      logger.info(`Lottery result ${result.period} processed successfully`);
    } catch (err) {
      logger.error('Error in checkAndAnnounce:', err);
    }
  }

  /**
   * 检查是否是新结果
   */
  async isNewResult(period) {
    // 检查是否已经发布过这个期号
    const existing = await GroupAnnouncement.findOne({
      type: 'lottery',
      'extraData.period': period
    });

    return !existing;
  }

  /**
   * 发布到所有公共群
   */
  async announceToPublicGroups(result) {
    try {
      // 获取所有公共群
      const publicGroups = await Group.find({ isPublic: true });

      if (publicGroups.length === 0) {
        logger.warn('No public groups found');
        return;
      }

      const content = lotteryDataService.formatResult(result);

      for (const group of publicGroups) {
        // 删除旧的开奖公告
        await GroupAnnouncement.deleteMany({
          groupId: group._id.toString(),
          type: 'lottery'
        });

        // 创建新的公告
        const announcement = new GroupAnnouncement({
          groupId: group._id.toString(),
          content,
          type: 'lottery',
          isPinned: true,
          extraData: {
            period: result.period,
            numbers: result.numbers,
            firstNumber: result.firstNumber,
            openTime: result.openTime
          }
        });

        await announcement.save();

        logger.info(`Lottery result announced to public group: ${group.name}`);

        // 通过 Socket 推送给群成员
        if (socketService.getIO()) {
          socketService.getIO().to(`group:${group._id}`).emit('newAnnouncement', {
            type: 'lottery',
            content,
            data: result,
            timestamp: Date.now()
          });
        }
      }

      logger.info(`Lottery result announced to ${publicGroups.length} public groups`);
    } catch (err) {
      logger.error('Error announcing to public groups:', err);
    }
  }
}

module.exports = new LotteryScheduler();
