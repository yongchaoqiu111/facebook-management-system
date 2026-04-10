const ChainGroup = require('../models/ChainGroup');
const User = require('../models/User');

class ChainGroupService {
  async checkUserKickedStatus(groupId, userId) {
    const userInGroup = await ChainGroup.findOne({
      groupId: groupId,
      'members.userId': userId
    });

    if (userInGroup) {
      const member = userInGroup.members.find(m => m.userId.toString() === userId);
      if (member && member.kicked) {
        return {
          isKicked: true,
          totalReceived: member.totalReceived || 0,
          kickThreshold: userInGroup.settings.kickThreshold || 380
        };
      }
    }
    return { isKicked: false };
  }

  async rejoinChainGroup(groupId, userId) {
    try {
      const group = await ChainGroup.findOne({ groupId });
      const user = await User.findById(userId);

      if (!group) {
        throw new Error('群组不存在');
      }

      if (!user) {
        throw new Error('用户不存在');
      }

      const totalCost = group.settings.entryFee + group.settings.firstPacketAmount;

      if (user.balance< totalCost) {
        throw new Error('余额不足');
      }

      user.balance -= totalCost;
      await user.save();

      const memberIndex = group.members.findIndex(m =>m.userId.toString() === userId);
      if (memberIndex !== -1) {
        group.members[memberIndex].kicked = false;
        group.members[memberIndex].totalReceived = 0;
        group.members[memberIndex].lastPacketAt = null;
      } else {
        group.members.push({
          userId: user._id,
          nickname: user.nickname,
          avatar: user.avatar
        });
      }

      group.updatedAt = Date.now();
      await group.save();

      return {
        success: true,
        group,
        user
      };
    } catch (error) {
      throw error;
    }
  }

  async distributePacket(groupId, userId, amount) {
    try {
      const group = await ChainGroup.findOne({ groupId });
      
      if (!group) {
        throw new Error('群组不存在');
      }

      const memberIndex = group.members.findIndex(m => m.userId.toString() === userId);
      if (memberIndex === -1) {
        throw new Error('用户不在群中');
      }

      group.members[memberIndex].totalReceived += amount;
      group.members[memberIndex].lastPacketAt = Date.now();

      if (group.members[memberIndex].totalReceived >= group.settings.kickThreshold) {
        group.members[memberIndex].kicked = true;
        console.log('用户被踢出:', userId);
      }

      group.updatedAt = Date.now();
      await group.save();

      return {
        success: true,
        member: group.members[memberIndex],
        isKicked: group.members[memberIndex].kicked
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ChainGroupService();