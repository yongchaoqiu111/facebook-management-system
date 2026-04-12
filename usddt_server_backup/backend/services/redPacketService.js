const mongoose = require('mongoose');
const RedPacket = require('../models/RedPacket');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const logger = require('../config/logger');

async function openRedPacket(redPacketId, userId) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const redPacket = await RedPacket.findById(redPacketId).session(session);
    
    if (!redPacket || redPacket.remainCount <= 0) {
      throw new Error('红包已领完');
    }
    
    if (redPacket.claims.some(claim => claim.userId.toString() === userId)) {
      throw new Error('已领取过该红包');
    }
    
    const claimAmount = redPacket.amounts[redPacket.claims.length];
    
    const updatedRedPacket = await RedPacket.findOneAndUpdate(
      {
        _id: redPacketId,
        remainCount: { $gt: 0 },
        'claims.userId': { $ne: userId }
      },
      {
        $inc: {
          remainCount: -1,
          remainAmount: -claimAmount
        },
        $push: {
          claims: {
            userId,
            amount: claimAmount,
            claimedAt: new Date()
          }
        }
      },
      {
        new: true,
        session
      }
    ).populate('sender', 'username avatar');
    
    if (!updatedRedPacket) {
      throw new Error('红包已领完或已领取过');
    }
    
    const user = await User.findById(userId).session(session);
    const oldBalance = user.balance;
    user.balance += claimAmount;
    await user.save({ session });
    
    const transaction = new Transaction({
      userId,
      type: 'redPacketReceive',
      amount: claimAmount,
      balanceBefore: oldBalance,
      balanceAfter: user.balance,
      redPacketId,
      status: 'completed'
    });
    await transaction.save({ session });
    
    await session.commitTransaction();
    
    setImmediate(async () => {
      try {
        const io = global.socketService?.getIO();
        if (!io) return;
        
        const groupId = updatedRedPacket.roomId;
        
        io.to(`group:${groupId}`).emit('redPacketClaimed', {
          redPacketId: updatedRedPacket._id,
          claimer: {
            _id: user._id,
            username: user.username,
            avatar: user.avatar
          },
          amount: claimAmount,
          remainCount: updatedRedPacket.remainCount,
          remainAmount: updatedRedPacket.remainAmount,
          timestamp: new Date().toISOString()
        });
        
        io.to(`user:${userId}`).emit('myRedPacketResult', {
          redPacketId: updatedRedPacket._id,
          amount: claimAmount,
          message: updatedRedPacket.message,
          from: updatedRedPacket.sender.username,
          balance: user.balance,
          timestamp: new Date().toISOString()
        });
        
        if (updatedRedPacket.remainCount === 0) {
          io.to(`group:${groupId}`).emit('redPacketStatusUpdate', {
            redPacketId: updatedRedPacket._id,
            status: 'finished',
            remainCount: 0,
            remainAmount: 0,
            totalClaims: updatedRedPacket.claims.length,
            timestamp: new Date().toISOString()
          });
        }
        
        io.to(`user:${userId}`).emit('balanceChange', {
          amount: claimAmount,
          balance: user.balance,
          reason: 'redPacket:open',
          timestamp: new Date().toISOString(),
          relatedId: updatedRedPacket._id.toString()
        });
        
      } catch (err) {
        logger.error('Socket推送失败:', err);
      }
    });
    
    return {
      success: true,
      amount: claimAmount,
      newBalance: user.balance
    };
    
  } catch (err) {
    await session.abortTransaction();
    logger.error('领取红包失败:', err);
    throw err;
  } finally {
    session.endSession();
  }
}

module.exports = {
  openRedPacket
};