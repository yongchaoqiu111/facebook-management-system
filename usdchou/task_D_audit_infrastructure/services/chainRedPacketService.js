const RedPacket = require('../models/RedPacket');
const auditClient = require('./auditClient');

async function openChainRedPacket(userId, redPacketId) {
  try {
    const redPacket = await RedPacket.findById(redPacketId);
    
    if (!redPacket) {
      throw new Error('红包不存在');
    }
    
    if (redPacket.status !== 'active') {
      throw new Error('红包已过期或已完成');
    }
    
    if (!redPacket.isChainRedPacket) {
      throw new Error('不是接龙红包');
    }
    
    const oldBalance = 0;
    const perAmount = redPacket.totalAmount / redPacket.totalCount;
    const newTotalClaimed = redPacket.claimedCount + 1;
    const isExceeded = newTotalClaimed > redPacket.totalCount;
    
    redPacket.claimedCount = Math.min(newTotalClaimed, redPacket.totalCount);
    redPacket.claimedAmount += perAmount;
    
    if (redPacket.claimedCount >= redPacket.totalCount) {
      redPacket.status = 'completed';
    }
    
    await redPacket.save();
    
    const user = { balance: oldBalance + perAmount };
    
    setImmediate(async () => {
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
    });
    
    return {
      success: true,
      data: {
        amount: perAmount,
        balance: user.balance,
        totalClaimed: redPacket.claimedCount,
        isExceeded
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  openChainRedPacket
};