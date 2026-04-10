const ChainGroup = require('../models/ChainGroup');
const { redisClient } = require('../utils/redis');

class RedPacketService {
  static async openRedPacket(redPacketId, userId, groupId) {
    try {
      const group = await ChainGroup.findOne({ groupId });
      if (!group) {
        throw new Error('群组不存在');
      }

      const member = group.members.find(m => m.userId === userId);
      if (!member) {
        throw new Error('用户不在群组中');
      }

      if (member.kicked) {
        throw new Error('用户已被踢出群组');
      }

      const amount = Math.floor(Math.random() * 100) + 1;

      await redisClient.incrBy(`chain_group:${groupId}:user:${userId}:totalReceived`, amount);

      const totalReceived = await redisClient.get(`chain_group:${groupId}:user:${userId}:totalReceived`);
      console.log('用户累计领取:', userId, totalReceived);

      await ChainGroup.findOneAndUpdate(
        {
          groupId: groupId,
          'members.userId': userId
        },
        {
          $inc: { 'members.$.totalReceived': amount }
        }
      );
      console.log('累计金额更新成功');

      const kickThreshold = group.settings.kickThreshold || 380;

      if (parseInt(totalReceived) >= kickThreshold) {
        await ChainGroup.findOneAndUpdate(
          {
            groupId: groupId,
            'members.userId': userId
          },
          {
            'members.$.kicked': true,
            'members.$.kickedAt': new Date()
          }
        );

        const io = require('../app').io;
        io.to(groupId).emit('userKicked', {
          userId: userId,
          totalReceived: parseInt(totalReceived),
          kickThreshold: kickThreshold
        });
      }

      return {
        success: true,
        amount: amount,
        totalReceived: parseInt(totalReceived),
        kicked: parseInt(totalReceived) >= kickThreshold
      };
    } catch (error) {
      console.error('领取红包失败:', error);
      throw error;
    }
  }

  static async getGroupInfo(groupId) {
    try {
      const group = await ChainGroup.findOne({ groupId });
      if (!group) {
        throw new Error('群组不存在');
      }

      const membersWithTotalReceived = await Promise.all(group.members.map(async (member) => {
        const redisTotal = await redisClient.get(`chain_group:${groupId}:user:${member.userId}:totalReceived`);
        return {
          ...member.toObject(),
          totalReceived: redisTotal ? parseInt(redisTotal) : member.totalReceived
        };
      }));

      return {
        ...group.toObject(),
        members: membersWithTotalReceived
      };
    } catch (error) {
      console.error('获取群组信息失败:', error);
      throw error;
    }
  }
}

module.exports = RedPacketService;