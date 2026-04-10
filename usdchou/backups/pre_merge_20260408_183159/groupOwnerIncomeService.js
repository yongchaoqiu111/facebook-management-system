/**
 * 群主收益服务
 * 处理接龙群门票分成
 */
const GroupOwnerIncome = require('../models/GroupOwnerIncome');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const logger = require('../config/logger');

class GroupOwnerIncomeService {
  
  /**
   * 记录群主收益（有人进群时调用）
   */
  async recordIncome(groupId, ownerId, memberId, ticketAmount) {
    try {
      // 计算分成
      const shareRatio = 0.5;  // 50%
      const ownerShare = ticketAmount * shareRatio;
      const platformShare = ticketAmount - ownerShare;
      
      // 创建收益记录
      const income = new GroupOwnerIncome({
        owner: ownerId,
        group: groupId,
        member: memberId,
        ticketAmount,
        ownerShare,
        platformShare,
        shareRatio,
        status: 'pending'
      });
      
      await income.save();
      
      logger.info(`✅ 记录群主收益: 群主${ownerId}, 金额${ticketAmount}, 分成${ownerShare}`);
      
      return income;
    } catch (err) {
      logger.error('记录群主收益失败:', err);
      throw err;
    }
  }
  
  /**
   * 支付群主收益（立即到账或定时结算）
   */
  async payIncome(incomeId) {
    try {
      const income = await GroupOwnerIncome.findById(incomeId);
      
      if (!income) {
        throw new Error('收益记录不存在');
      }
      
      if (income.status !== 'pending') {
        throw new Error('收益记录状态异常');
      }
      
      // 给群主加钱
      const owner = await User.findById(income.owner);
      owner.balance += income.ownerShare;
      await owner.save();
      
      // 更新收益记录状态
      income.status = 'paid';
      income.paidAt = new Date();
      await income.save();
      
      // 创建交易记录
      const transaction = new Transaction({
        user: income.owner,
        type: 'income',
        amount: income.ownerShare,
        balanceBefore: owner.balance - income.ownerShare,
        balanceAfter: owner.balance,
        description: `接龙群门票分成 - 群ID: ${income.group}`,
        relatedId: income._id,
        relatedType: 'GroupOwnerIncome'
      });
      
      await transaction.save();
      income.transactionId = transaction._id;
      await income.save();
      
      logger.info(`✅ 支付群主收益: ${income.owner}, 金额: ${income.ownerShare}`);
      
      return {
        income,
        transaction
      };
    } catch (err) {
      logger.error('支付群主收益失败:', err);
      throw err;
    }
  }
  
  /**
   * 批量支付待结算收益（定时任务）
   */
  async payPendingIncomes() {
    try {
      const pendingIncomes = await GroupOwnerIncome.find({ status: 'pending' });
      
      logger.info(`🔄 开始批量支付群主收益，共 ${pendingIncomes.length} 笔`);
      
      let successCount = 0;
      let failCount = 0;
      
      for (const income of pendingIncomes) {
        try {
          await this.payIncome(income._id);
          successCount++;
        } catch (err) {
          logger.error(`支付收益失败 ${income._id}:`, err);
          failCount++;
        }
      }
      
      logger.info(`✅ 批量支付完成: 成功${successCount}笔, 失败${failCount}笔`);
      
      return { successCount, failCount };
    } catch (err) {
      logger.error('批量支付群主收益失败:', err);
      throw err;
    }
  }
  
  /**
   * 获取群主的收益统计
   */
  async getOwnerIncomeStats(ownerId) {
    try {
      const stats = await GroupOwnerIncome.aggregate([
        { $match: { owner: mongoose.Types.ObjectId(ownerId) } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$ownerShare' }
          }
        }
      ]);
      
      const result = {
        pending: { count: 0, amount: 0 },
        paid: { count: 0, amount: 0 },
        withdrawn: { count: 0, amount: 0 },
        total: { count: 0, amount: 0 }
      };
      
      stats.forEach(item => {
        if (result[item._id]) {
          result[item._id].count = item.count;
          result[item._id].amount = item.totalAmount;
        }
        result.total.count += item.count;
        result.total.amount += item.totalAmount;
      });
      
      return result;
    } catch (err) {
      logger.error('获取群主收益统计失败:', err);
      throw err;
    }
  }
  
  /**
   * 获取群主的收益列表
   */
  async getOwnerIncomes(ownerId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      
      const [incomes, total] = await Promise.all([
        GroupOwnerIncome.find({ owner: ownerId })
          .populate('group', 'name')
          .populate('member', 'username avatar')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        GroupOwnerIncome.countDocuments({ owner: ownerId })
      ]);
      
      return {
        incomes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (err) {
      logger.error('获取群主收益列表失败:', err);
      throw err;
    }
  }
  
  /**
   * 获取某个群的收益统计
   */
  async getGroupIncomeStats(groupId) {
    try {
      const stats = await GroupOwnerIncome.aggregate([
        { $match: { group: mongoose.Types.ObjectId(groupId) } },
        {
          $group: {
            _id: null,
            totalMembers: { $sum: 1 },
            totalTicketAmount: { $sum: '$ticketAmount' },
            totalOwnerShare: { $sum: '$ownerShare' },
            totalPlatformShare: { $sum: '$platformShare' }
          }
        }
      ]);
      
      if (stats.length === 0) {
        return {
          totalMembers: 0,
          totalTicketAmount: 0,
          totalOwnerShare: 0,
          totalPlatformShare: 0
        };
      }
      
      return stats[0];
    } catch (err) {
      logger.error('获取群收益统计失败:', err);
      throw err;
    }
  }
}

const mongoose = require('mongoose');
module.exports = new GroupOwnerIncomeService();
