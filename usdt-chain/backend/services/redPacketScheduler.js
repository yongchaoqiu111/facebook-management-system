const cron = require('node-cron');
const RedPacket = require('../models/RedPacket');
const logger = require('../config/logger');

cron.schedule('* * * * *', async () => {
  try {
    const expiredPackets = await RedPacket.find({
      status: 'active',
      expiredAt: { $lt: new Date() }
    });
    
    for (const packet of expiredPackets) {
      packet.status = 'expired';
      await packet.save();
      
      const io = global.socketService?.getIO();
      if (io) {
        io.to(`group:${packet.roomId}`).emit('redPacketStatusUpdate', {
          redPacketId: packet._id,
          status: 'expired',
          remainCount: packet.remainCount,
          remainAmount: packet.remainAmount,
          totalClaims: packet.claims.length,
          timestamp: new Date().toISOString()
        });
      }
      
      logger.info(`红包 ${packet._id} 已过期`);
    }
    
    if (expiredPackets.length > 0) {
      logger.info(`检查到 ${expiredPackets.length} 个过期红包`);
    }
    
  } catch (err) {
    logger.error('红包过期检查失败:', err);
  }
});

logger.info('✅ 红包过期定时任务已启动');