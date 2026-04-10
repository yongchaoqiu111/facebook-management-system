const redisClient = require('../config/redis');
const Group = require('../models/Group');
const RedPacket = require('../models/RedPacket');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const auditClient = require('./auditClient');
const anomalyMonitor = require('./anomalyMonitor');
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
      const newAmount = await redisClient.incrbyfloat(key, amount);
      await redisClient.expire(key, 86400 * 7);
      return parseFloat(newAmount);
    } catch (err) {
      logger.error('Redis add received amount error:', err);
      throw err;
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

  static async joinChainGroup(groupId, userId) {
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
    const firstPacketAmount = group.settings.firstRedPacketAmount || 300;
    const totalRequired = ticketAmount + firstPacketAmount;

    if (user.balance < totalRequired) {
      throw new Error(`Insufficient balance. Required: ${totalRequired}, Current: ${user.balance}`);
    }

    user.balance -= totalRequired;
    await user.save();
    
    // 🛡️ 发送审计日志
    auditClient.logChainGroupJoin(userId, groupId, totalRequired, balanceBefore, user.balance);

    const redPacketCount = group.settings.redPacketCount || 30;
    const perAmount = group.settings.redPacketPerAmount || 10;
    const amounts = Array(redPacketCount).fill(perAmount);

    const redPacket = new RedPacket({
      sender: userId,
      type: 'normal',
      totalAmount: firstPacketAmount,
      count: redPacketCount,
      message: '新人首包',
      roomId: groupId,
      amounts,
      isChainRedPacket: true,
      chainGroupId: groupId
    });

    await redPacket.save();

    const waitHours = group.settings.waitHours || 3;
    const canGrabAfter = new Date(Date.now() + waitHours * 60 * 60 * 1000);

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
    await group.save();

    // 💰 记录群主收益（门票的50%）
    try {
      const ticketAmount = group.settings.ticketAmount || 10;
      await groupOwnerIncomeService.recordIncome(
        groupId,
        group.owner,  // 群主ID
        userId,       // 进群成员ID
        ticketAmount  // 门票金额
      );
    } catch (incomeErr) {
      logger.error('记录群主收益失败:', incomeErr);
      // 不阻断进群流程，只记录错误
    }

    await this.clearReceivedAmount(groupId, userId);

    const transaction = new Transaction({
      userId: userId,
      type: 'chainGroupJoin',
      amount: totalRequired,
      status: 'completed',
      note: `加入接龙群 ${group.name},门票${ticketAmount}+首包${firstPacketAmount}`,
      groupId: groupId
    });
    await transaction.save();

    // 📡 通过 Socket 推送红包事件给群内所有成员
    try {
      const io = global.socketService ? global.socketService.getIO() : null;
      
      if (io) {
        // 获取发送者信息
        const sender = await User.findById(userId);
        
        // 推送给群组房间
        io.to(`group:${groupId}`).emit('groupRedPacket', {
          groupId: groupId,
          redPacket: {
            id: redPacket._id,
            senderId: userId,
            senderName: sender.username,
            senderAvatar: sender.avatar || '',
            totalAmount: firstPacketAmount,
            count: redPacketCount,
            perAmount: perAmount,
            message: '新人首包',
            createdAt: redPacket.createdAt,
            isChainRedPacket: true
          }
        });
        
        logger.info(`📡 Socket pushed groupRedPacket to group ${groupId}`);
      } else {
        logger.warn('⚠️ Socket service not available, skipping push');
      }
    } catch (socketErr) {
      logger.error('Socket push error:', socketErr);
    }

    logger.info(`User ${userId} joined chain group ${groupId}, paid ${totalRequired}`);

    return {
      group,
      redPacket,
      canGrabAfter,
      remainingBalance: user.balance
    };
  }

  static async openChainRedPacket(redPacketId, userId) {
    const redPacket = await RedPacket.findById(redPacketId);
    if (!redPacket) {
      throw new Error('Red packet not found');
    }

    if (!redPacket.isChainRedPacket) {
      throw new Error('This is not a chain red packet');
    }

    if (redPacket.sender.toString() === userId) {
      throw new Error('Cannot open your own red packet');
    }

    const alreadyOpened = redPacket.openedBy.some(item => item.userId.toString() === userId);
    if (alreadyOpened) {
      throw new Error('Already opened this red packet');
    }

    if (redPacket.openedCount >= redPacket.count) {
      throw new Error('Red packet exhausted');
    }

    const group = await Group.findById(redPacket.chainGroupId);
    if (!group) {
      throw new Error('Group not found');
    }

    const member = group.members.find(m => m.userId.toString() === userId);
    if (!member) {
      throw new Error('Not a member of this group');
    }

    if (member.kickedOut) {
      throw new Error('You have been kicked out of this group');
    }

    const now = new Date();
    if (member.canGrabAfter && now < member.canGrabAfter) {
      const waitMinutes = Math.ceil((member.canGrabAfter - now) / 60000);
      throw new Error(`Please wait ${waitMinutes} minutes before grabbing red packets`);
    }

    const amount = redPacket.amounts[redPacket.openedCount];

    redPacket.openedBy.push({
      userId: userId,
      amount,
      openedAt: Date.now()
    });
    redPacket.openedCount += 1;
    await redPacket.save();

    const user = await User.findById(userId);
    const balanceBefore = user.balance;
    
    user.balance += amount;
    await user.save();

    const totalReceived = await this.addReceivedAmount(group._id.toString(), userId, amount);
    
    // 🛡️ 发送审计日志
    auditClient.logRedPacketGrab(userId, redPacketId, amount, balanceBefore, user.balance);
    
    // 🔍 异常监控
    await anomalyMonitor.monitorRedPacketGrab(userId, redPacketId);
    await anomalyMonitor.monitorBalanceChange(userId, balanceBefore, user.balance);

    member.totalReceived = totalReceived;
    
    let wasKicked = false;
    let kickReason = '';
    const kickThreshold = group.settings.kickThreshold || 380;

    if (totalReceived >= kickThreshold) {
      member.kickedOut = true;
      member.kickReason = `累计领取达到${kickThreshold}USDT`;
      member.kickedAt = new Date();
      
      group.members = group.members.filter(m => m.userId.toString() !== userId);
      group.memberCount -= 1;
      wasKicked = true;
      kickReason = member.kickReason;
      
      logger.info(`User ${userId} kicked from group ${group._id}, received ${totalReceived} USDT`);
    }

    group.updatedAt = Date.now();
    await group.save();

    const transaction = new Transaction({
      userId: userId,
      type: 'chainRedPacketReceive',
      amount,
      status: 'completed',
      note: `领取接龙红包,累计:${totalReceived}`,
      groupId: group._id
    });
    await transaction.save();

    return {
      amount,
      newBalance: user.balance,
      totalReceived,
      wasKicked,
      kickReason,
      redPacket
    };
  }

  static async getChainGroupInfo(groupId, userId) {
    const group = await Group.findById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    const member = group.members.find(m => m.userId.toString() === userId);
    if (!member) {
      throw new Error('Not a member of this group');
    }

    const totalReceived = await this.getReceivedAmount(groupId, userId);

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
        totalReceived: totalReceived,
        kickedOut: member.kickedOut,
        kickReason: member.kickReason
      }
    };
  }
}

module.exports = ChainRedPacketService;
