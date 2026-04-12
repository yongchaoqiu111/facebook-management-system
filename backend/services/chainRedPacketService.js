const redisClient = require('../config/redis');
const mongoose = require('mongoose');
const Group = require('../models/Group');
const RedPacket = require('../models/RedPacket');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const auditClient = require('./auditClient');
const groupOwnerIncomeService = require('./groupOwnerIncomeService');
const logger = require('../config/logger');

class ChainRedPacketService {
  
  static getReceivedKey(groupId, userId) {
    return `chain:${groupId}:received:${userId}`;
  }

  static async getReceivedAmount(groupId, userId) {
    try {
      const key = this.getReceivedKey(groupId, userId);
      const amount = await redisClient.get(key);
      return amount ? parseFloat(amount) : 0;
    } catch (err) {
      logger.error('Redis get received amount error:', err);
      return 0;
    }
  }

  static async addReceivedAmount(groupId, userId, amount) {
    try {
      const key = this.getReceivedKey(groupId, userId);
      const newAmount = await redisClient.incrBy(key, amount);
      await redisClient.expire(key, 86400 * 7);
      return parseFloat(newAmount);
    } catch (err) {
      logger.error('Redis add received amount error:', err);
      return amount;
    }
  }

  static async clearReceivedAmount(groupId, userId) {
    try {
      const key = this.getReceivedKey(groupId, userId);
      await redisClient.del(key);
    } catch (err) {
      logger.error('Redis clear received amount error:', err);
    }
  }


  static async joinChainGroup(groupId, userId, options = {}) {
    const { waitSeconds: customWaitSeconds } = options;
    const group = await Group.findById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    if (!group.settings.isChainRedPacket) {
      throw new Error('This is not a chain red packet group');
    }

    const existingMember = group.members.find(m => m.userId.toString() === userId);
    if (existingMember && !existingMember.kickedOut) {
      throw new Error('Already a member of this group');
    }

    const user = await User.findById(userId);
    const balanceBefore = user.balance;
    
    const ticketAmount = group.settings.ticketAmount || 10;
    const firstPacketAmount = group.settings.firstRedPacketAmount || 30;
    const totalRequired = ticketAmount + firstPacketAmount;

    if (user.balance < totalRequired) {
      throw new Error(`Insufficient balance. Required: ${totalRequired}, Current: ${user.balance}`);
    }

    user.balance -= totalRequired;
    await user.save();
    
    // 🛡️ 发送审计日志
    auditClient.logChainGroupJoin(userId, groupId, totalRequired, balanceBefore, user.balance);
    
    // 🔥 广播余额更新（扣费）
    setImmediate(async () => {
      try {
        const io = require('./socketService').getInstance().getIO();
        if (io) {
          io.to(`user:${userId}`).emit('balanceUpdated', {
            type: 1,  // 加入接龙群扣费
            amount: -totalRequired,
            newBalance: user.balance,
            groupId: groupId,
            timestamp: Date.now()
          });
        }
      } catch (err) {
        logger.error('广播余额更新失败:', err);
      }
    });

    const redPacketCount = group.settings.redPacketCount || 3;
    const perAmount = group.settings.redPacketPerAmount || 10;
    const amounts = Array(redPacketCount).fill(perAmount);

    // 🔥 生成红包 ID（11位纯数字）
    const IdGenerator = require('./idGenerator');
    const redPacketId = await IdGenerator.generateRedPacketId();

    const redPacket = new RedPacket({
      _id: redPacketId.toString(),  // 🔥 设置红包 ID
      sender: userId,
      type: 'normal',
      totalAmount: firstPacketAmount,
      count: redPacketCount,
      message: '新人首包',
      roomId: groupId,
      amounts,
      isChainRedPacket: true,
      chainGroupId: groupId,
      remainAmount: firstPacketAmount,  // 初始剩余金额 = 总金额
      remainCount: redPacketCount        // 初始剩余数量 = 总数量
    });

    await redPacket.save();

    // 🔥 冷却时间：支持自定义（测试用3秒，正式用3小时）
    const waitSeconds = customWaitSeconds !== undefined ? customWaitSeconds : (group.settings.waitHours ? group.settings.waitHours * 3600 : 10800);
    const canGrabAfter = new Date(Date.now() + waitSeconds * 1000);

    if (existingMember && existingMember.kickedOut) {
      existingMember.kickedOut = false;
      existingMember.kickReason = '';
      existingMember.kickedAt = null;
      existingMember.joinedAt = new Date();
      existingMember.ticketPaid = true;
      existingMember.firstRedPacketSent = true;
      existingMember.firstRedPacketId = redPacket._id;
      existingMember.canGrabAfter = canGrabAfter;
      existingMember.totalReceived = 0;
    } else {
      group.members.push({
        userId: userId,
        role: 'member',
        joinedAt: new Date(),
        ticketPaid: true,
        firstRedPacketSent: true,
        firstRedPacketId: redPacket._id,
        canGrabAfter: canGrabAfter,
        totalReceived: 0,
        kickedOut: false
      });
      group.memberCount += 1;
    }

    group.updatedAt = Date.now();
    
    // 🔥 调试日志：保存前检查
    logger.info(`准备保存群组 ${groupId}，成员数: ${group.members.length}`);
    logger.info(`成员列表: ${group.members.map(m => m.userId).join(', ')}`);
    
    try {
      await group.save();
      logger.info(`✅ 群组成员保存成功`);
    } catch (saveErr) {
      logger.error(`❌ 群组成员保存失败:`, saveErr.message);
      throw saveErr;
    }

    // 💰 记录群主收益（门票的50%）- 异步处理，不阻塞响应
    setImmediate(async () => {
      try {
        const ticketAmount = group.settings.ticketAmount || 10;
        const result = await groupOwnerIncomeService.recordIncome(
          groupId,
          group.owner,  // 群主ID
          userId,       // 进群成员ID
          ticketAmount  // 门票金额
        );
        
        // 🔥 广播门票收益给群主
        const io = require('./socketService').getInstance().getIO();
        if (io) {
          io.to(`user:${group.owner}`).emit('balanceUpdated', {
            type: 2,  // 门票收益
            amount: result.newBalance - (result.newBalance - result.income.ownerShare),
            newBalance: result.newBalance,
            groupId: groupId,
            timestamp: Date.now()
          });
        }
      } catch (incomeErr) {
        logger.error('记录群主收益失败:', incomeErr);
      }
    });

    // 📝 创建交易记录 - 异步处理
    setImmediate(async () => {
      try {
        const transaction = new Transaction({
          userId: userId,
          type: 'chainGroupJoin',
          amount: totalRequired,
          status: 'completed',
          note: `加入接龙群 ${group.name},门票${ticketAmount}+首包${firstPacketAmount}`,
          groupId: groupId
        });
        await transaction.save();
      } catch (txErr) {
        logger.error('创建交易记录失败:', txErr);
      }
    });

    // 📡 通过 Socket 广播红包事件给群内所有成员 - 异步处理
    setImmediate(async () => {
      try {
        const io = global.socketService ? global.socketService.io : null;
        
        if (io) {
          // 获取发送者信息
          const sender = await User.findById(userId);
          
          // 🔥 广播给群组房间的所有成员（使用统一消息格式）
          io.to(`group:${groupId}`).emit('receiveMessage', {
            msgType: 2,  // 🔥 红包消息
            msgId: redPacket._id,
            senderId: userId,
            receiverId: null,
            groupId: groupId,
            content: {
              type: 'redpacket',
              redPacketId: redPacket._id,
              redPacketType: 'normal',
              totalAmount: firstPacketAmount,
              count: redPacketCount,
              remainCount: redPacketCount,
              message: '新人首包',
              createdAt: redPacket.createdAt
            },
            timestamp: Date.now()
          });
          
          logger.info(`📡 Socket 广播新人首包到群组 ${groupId}`);
        } else {
          logger.warn('⚠️ Socket service not available, skipping push');
        }
      } catch (socketErr) {
        logger.error('Socket push error:', socketErr);
      }
    });

    logger.info(`User ${userId} joined chain group ${groupId}, paid ${totalRequired}`);

    return {
      group,
      redPacket,
      canGrabAfter,
      remainingBalance: user.balance
    };
  }

  static async openChainRedPacket(redPacketId, userId, options = {}) {
    const { useRedis = false } = options;

    try {
      // 1. 查询红包
      const redPacket = await RedPacket.findById(redPacketId);
      if (!redPacket || !redPacket.isChainRedPacket) {
        throw new Error('Invalid chain red packet');
      }

      // 2. 基础校验
      if (redPacket.sender.toString() === userId) {
        throw new Error('Cannot open your own red packet');
      }
      if (redPacket.openedBy.some(item => item.userId.toString() === userId)) {
        throw new Error('Already opened this red packet');
      }
      if (redPacket.openedCount >= redPacket.count) {
        throw new Error('Red packet exhausted');
      }

      // 3. 查询群组和成员
      const group = await Group.findById(redPacket.chainGroupId);
      if (!group) throw new Error('Group not found');
      
      const memberIndex = group.members.findIndex(m => m.userId.toString() === userId);
      if (memberIndex === -1) throw new Error('Not a member of this group');
      
      const member = group.members[memberIndex];
      if (member.kickedOut) throw new Error('You have been kicked out of this group');
      
      // 🔥 群主不能抢红包
      if (member.role === 'owner') {
        throw new Error('Group owner cannot grab red packets');
      }

      // 4. 冷却时间检查
      const now = new Date();
      if (member.canGrabAfter && now < member.canGrabAfter) {
        const waitSeconds = Math.ceil((member.canGrabAfter - now) / 1000);
        throw new Error(`Please wait ${waitSeconds} seconds before grabbing red packets`);
      }

      // 5. 领取红包
      const amount = redPacket.amounts[redPacket.openedCount];
      redPacket.openedBy.push({ userId, amount, openedAt: Date.now() });
      redPacket.openedCount += 1;
      await redPacket.save();

      // 6. 更新用户余额
      const user = await User.findById(userId);
      user.balance += amount;
      await user.save();

      // 7. 统计累计领取金额（根据模式选择）
      let totalReceived;
      if (useRedis) {
        // 🔥 老接口：使用 Redis 累加
        totalReceived = await this.addReceivedAmount(group._id.toString(), userId, amount);
      } else {
        // 🔥 新接口：直接使用 MongoDB 字段累加
        member.totalReceived = (member.totalReceived || 0) + amount;
        totalReceived = member.totalReceived;
      }
      
      // 8. 判断是否踢出
      let wasKicked = false;
      let kickReason = '';
      const kickThreshold = group.settings.kickThreshold || 50;

      if (totalReceived >= kickThreshold) {
        member.kickedOut = true;
        member.kickReason = `累计领取达到${kickThreshold}USDT`;
        member.kickedAt = new Date();
        group.members.splice(memberIndex, 1);
        group.memberCount -= 1;
        wasKicked = true;
        kickReason = member.kickReason;
      }

      group.updatedAt = Date.now();
      await group.save();

      // 9. 创建交易记录
      await new Transaction({
        userId,
        type: 'chainRedPacketReceive',
        amount,
        status: 'completed',
        note: `领取接龙红包`,
        groupId: group._id
      }).save();

      return {
        amount,
        newBalance: user.balance,
        totalReceived,
        redPacket,
        wasKicked,
        kickReason
      };
    } catch (err) {
      throw err;
    }
  }

  static async getChainGroupInfo(groupId, userId, options = {}) {
    const { useRedis = false } = options;
    const group = await Group.findById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    const member = group.members.find(m => m.userId.toString() === userId);
    if (!member) {
      throw new Error('Not a member of this group');
    }

    // 根据模式选择统计方式
    let totalReceived;
    if (useRedis) {
      totalReceived = await this.getReceivedAmount(groupId, userId);
    } else {
      totalReceived = member.totalReceived || 0;
    }

    return {
      groupId: group._id,
      groupName: group.name,
      isChainGroup: group.settings.isChainRedPacket,
      ticketAmount: group.settings.ticketAmount,
      firstRedPacketAmount: group.settings.firstRedPacketAmount,
      kickThreshold: group.settings.kickThreshold,
      waitHours: group.settings.waitHours,
      memberInfo: {
        joinedAt: member.joinedAt,
        canGrabAfter: member.canGrabAfter,
        totalReceived,
        kickedOut: member.kickedOut,
        kickReason: member.kickReason
      }
    };
  }
}

module.exports = ChainRedPacketService;
