const mongoose = require('mongoose');
const RedPacket = require('../models/RedPacket');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const auditClient = require('./auditClient');
const logger = require('../config/logger');
const config = require('../config/redpacket');

async function openChainRedPacket(redPacketId, userId) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const perAmount = 10;
    
    const redPacket = await RedPacket.findOneAndUpdate(
      {
        _id: redPacketId,
        remainCount: { $gt: 0 },
        totalClaimed: { $lt: 380 }
      },
      {
        $inc: {
          remainCount: -1,
          remainAmount: -perAmount,
          totalClaimed: perAmount
        },
        $push: {
          claims: {
            userId,
            amount: perAmount,
            claimedAt: new Date()
          }
        }
      },
      {
        new: true,
        session
      }
    ).populate('sender', 'username avatar');
    
    if (!redPacket) {
      throw new Error('红包已领完或达到阈值');
    }
    
    const newTotalClaimed = redPacket.totalClaimed || 0;
    const isExceeded = newTotalClaimed >= 380;
    
    if (isExceeded) {
      redPacket.status = 'exceeded';
      await redPacket.save({ session });
    }
    
    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new Error('用户不存在');
    }
    
    const oldBalance = user.balance;
    user.balance += perAmount;
    await user.save({ session });
    
    const transaction = new Transaction({
      userId,
      type: 'chainRedPacketReceive',
      amount: perAmount,
      balanceBefore: oldBalance,
      balanceAfter: user.balance,
      redPacketId,
      groupId: redPacket.chainGroupId,
      status: 'completed'
    });
    await transaction.save({ session });
    
    await session.commitTransaction();
    
    setImmediate(async () => {
      try {
        const io = global.socketService?.getIO();
        if (!io) return;
        
        const groupId = redPacket.chainGroupId.toString();
        
        io.to(`group:${groupId}`).emit('chainRedPacketProgress', {
          redPacketId: redPacket._id,
          chainGroupId: groupId,
          totalClaimed: newTotalClaimed,
          threshold: 380,
          entryFee: 310,
          remainToThreshold: Math.max(0, 380 - newTotalClaimed),
          isExceeded,
          status: isExceeded ? 'exceeded' : 'active',
          topClaimers: await getTopClaimers(redPacket._id, 3),
          timestamp: new Date().toISOString()
        });
        
        io.to(`group:${groupId}`).emit('redPacketClaimed', {
          redPacketId: redPacket._id,
          claimer: {
            _id: user._id,
            username: user.username,
            avatar: user.avatar
          },
          amount: perAmount,
          remainCount: redPacket.remainCount,
          remainAmount: redPacket.remainAmount,
          timestamp: new Date().toISOString()
        });
        
        io.to(`user:${userId}`).emit('myRedPacketResult', {
          redPacketId: redPacket._id,
          amount: perAmount,
          message: redPacket.message,
          from: redPacket.sender.username,
          balance: user.balance,
          timestamp: new Date().toISOString()
        });
        
        if (isExceeded) {
          io.to(`group:${groupId}`).emit('redPacketStatusUpdate', {
            redPacketId: redPacket._id,
            status: 'exceeded',
            reason: `累计领取 ${newTotalClaimed} USDT，已超过阈值 380 USDT`,
            remainCount: redPacket.remainCount,
            remainAmount: redPacket.remainAmount,
            totalClaims: redPacket.claims.length,
            timestamp: new Date().toISOString()
          });
        }
        
        io.to(`user:${userId}`).emit('balanceChange', {
          amount: perAmount,
          balance: user.balance,
          reason: 'redPacket:open',
          timestamp: new Date().toISOString(),
          relatedId: redPacket._id.toString()
        });
        
        await auditClient.log({
          type: 'redPacket:chain:open',
          userId,
          redPacketId: redPacket._id.toString(),
          amount: perAmount,
          balanceBefore: oldBalance,
          balanceAfter: user.balance,
          totalClaimed: newTotalClaimed,
          isExceeded,
          timestamp: Date.now()
        });
        
      } catch (err) {
        logger.error('Socket推送失败:', err);
      }
    });
    
    return {
      success: true,
      amount: perAmount,
      newBalance: user.balance,
      totalClaimed: newTotalClaimed,
      isExceeded
    };
    
  } catch (err) {
    await session.abortTransaction();
    logger.error('领取红包失败:', err);
    throw err;
  } finally {
    session.endSession();
  }
}

async function getTopClaimers(redPacketId, limit = 3) {
  const redPacket = await RedPacket.findById(redPacketId)
    .populate('claims.userId', 'username avatar');
  
  if (!redPacket || !redPacket.claims) {
    return [];
  }
  
  const sorted = redPacket.claims
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
  
  return sorted.map(claim => ({
    userId: claim.userId._id,
    username: claim.userId.username,
    avatar: claim.userId.avatar,
    claimedAmount: claim.amount,
    claimedAt: claim.claimedAt
  }));
}

module.exports = {
  openChainRedPacket,
  getTopClaimers
};