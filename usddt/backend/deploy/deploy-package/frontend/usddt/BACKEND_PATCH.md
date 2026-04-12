/**
 * 后端 chainRedPacketService.js 补丁
 * 
 * 将以下代码添加到 d:\weibo\usdchou\services\chainRedPacketService.js
 * 在 module.exports 之前
 */

const mongoose = require('mongoose');
const Group = require('../models/Group');

/**
 * 获取用户在群组中的累计领取金额
 */
async function getReceivedAmount(groupId, userId) {
  const Transaction = require('../models/Transaction');
  
  const results = await Transaction.aggregate([
    { 
      $match: { 
        groupId: new mongoose.Types.ObjectId(groupId),
        userId: new mongoose.Types.ObjectId(userId),
        type: 'chainRedPacketReceive'
      } 
    },
    { 
      $group: { 
        _id: null, 
        total: { $sum: '$amount' } 
      } 
    }
  ]);
  
  return results.length > 0 ? results[0].total : 0;
}

/**
 * 加入接龙群（扣费 + 发首包）
 */
async function joinChainGroup(groupId, userId) {
  const User = require('../models/User');
  const Transaction = require('../models/Transaction');
  const RedPacket = require('../models/RedPacket');
  
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const group = await Group.findById(groupId).session(session);
    if (!group) {
      throw new Error('群组不存在');
    }
    
    if (!group.settings?.isChainRedPacket) {
      throw new Error('该群组不是接龙群');
    }
    
    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new Error('用户不存在');
    }
    
    const ticketAmount = group.settings.ticketAmount || 310;
    
    if (user.balance < ticketAmount) {
      throw new Error('余额不足');
    }
    
    // 检查是否已加入
    const existingMember = group.members?.find(m => m.userId.toString() === userId);
    if (existingMember) {
      throw new Error('您已加入该群组');
    }
    
    // 扣除入群费
    const oldBalance = user.balance;
    user.balance -= ticketAmount;
    await user.save({ session });
    
    // 创建交易记录
    const transaction = new Transaction({
      userId,
      type: 'chainGroupJoin',
      amount: -ticketAmount,
      balanceBefore: oldBalance,
      balanceAfter: user.balance,
      groupId,
      status: 'completed'
    });
    await transaction.save({ session });
    
    // 添加群成员
    if (!group.members) {
      group.members = [];
    }
    group.members.push({
      userId: user._id,
      joinedAt: new Date(),
      canGrabAfter: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小时后可抢
    });
    await group.save({ session });
    
    // 发送首个接龙红包
    const firstRedPacketAmount = group.settings.firstRedPacketAmount || 10;
    
    const redPacket = new RedPacket({
      sender: userId,
      type: 'chain',
      chainGroupId: group._id,
      totalAmount: firstRedPacketAmount * 100, // 100个包
      remainAmount: firstRedPacketAmount * 100,
      remainCount: 100,
      perAmount: firstRedPacketAmount,
      message: '新人入群红包',
      totalClaimed: 0
    });
    await redPacket.save({ session });
    
    await session.commitTransaction();
    
    return {
      success: true,
      group,
      redPacket,
      newBalance: user.balance,
      memberInfo: group.members.find(m => m.userId.toString() === userId)
    };
    
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

/**
 * 获取接龙群信息
 */
async function getChainGroupInfo(groupId, userId) {
  const group = await Group.findById(groupId);
  if (!group) {
    throw new Error('群组不存在');
  }
  
  const member = group.members?.find(m => m.userId.toString() === userId);
  if (!member) {
    throw new Error('您不是该群组成员');
  }
  
  const totalReceived = await getReceivedAmount(groupId, userId);
  
  return {
    groupId: group._id,
    groupName: group.name,
    isChainGroup: group.settings?.isChainRedPacket || false,
    ticketAmount: group.settings?.ticketAmount || 310,
    firstRedPacketAmount: group.settings?.firstRedPacketAmount || 10,
    kickThreshold: group.settings?.kickThreshold || 380,
    waitHours: group.settings?.waitHours || 24,
    memberInfo: {
      joinedAt: member.joinedAt,
      canGrabAfter: member.canGrabAfter,
      totalReceived,
      kickedOut: member.kickedOut || false,
      kickReason: member.kickReason || null
    }
  };
}

// 添加到 module.exports
module.exports = {
  openChainRedPacket,
  getTopClaimers,
  joinChainGroup,
  getChainGroupInfo
};
