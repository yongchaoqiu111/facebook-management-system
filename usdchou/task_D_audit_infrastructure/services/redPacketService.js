const RedPacket = require('../models/RedPacket');
const auditClient = require('./auditClient');

async function openRedPacket(userId, redPacketId) {
  try {
    const redPacket = await RedPacket.findById(redPacketId);
    
    if (!redPacket) {
      throw new Error('红包不存在');
    }
    
    if (redPacket.status !== 'active') {
      throw new Error('红包已过期或已完成');
    }
    
    if (redPacket.isChainRedPacket) {
      throw new Error('请使用接龙红包接口');
    }
    
    const remainingCount = redPacket.totalCount - redPacket.claimedCount;
    const remainingAmount = redPacket.totalAmount - redPacket.claimedAmount;
    
    if (remainingCount <= 0) {
      throw new Error('红包已领完');
    }
    
    const claimAmount = remainingCount === 1 ? remainingAmount : Math.floor(Math.random() * (remainingAmount - remainingCount + 1)) + 1;
    
    const oldBalance = 0;
    
    redPacket.claimedCount += 1;
    redPacket.claimedAmount += claimAmount;
    
    if (redPacket.claimedCount >= redPacket.totalCount) {
      redPacket.status = 'completed';
    }
    
    await redPacket.save();
    
    const user = { balance: oldBalance + claimAmount };
    
    setImmediate(async () => {
      await auditClient.log({
        type: 'redPacket:open',
        userId,
        redPacketId: redPacket._id.toString(),
        amount: claimAmount,
        balanceBefore: oldBalance,
        balanceAfter: user.balance,
        timestamp: Date.now()
      });
    });
    
    return {
      success: true,
      data: {
        amount: claimAmount,
        balance: user.balance,
        remainingCount: remainingCount - 1
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
  openRedPacket
};