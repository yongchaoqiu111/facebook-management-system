/**
 * 群组邀请服务
 */
const GroupInvitation = require('../models/GroupInvitation');
const Group = require('../models/Group');
const User = require('../models/User');
const crypto = require('crypto');
const logger = require('../config/logger');

class GroupInvitationService {
  
  /**
   * 生成邀请码
   */
  generateInvitationCode() {
    return crypto.randomBytes(8).toString('hex').toUpperCase();
  }
  
  /**
   * 创建邀请
   */
  async createInvitation(groupId, inviterId, inviteeId, expireDays = 7) {
    try {
      // 验证群组是否存在
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('群组不存在');
      }
      
      // 验证是否是接龙群
      if (!group.settings.isChainRedPacket) {
        throw new Error('该群不是接龙群');
      }
      
      // 验证邀请人是否是群主或管理员
      const isOwner = group.owner.toString() === inviterId;
      const isAdmin = group.admins.some(id => id.toString() === inviterId);
      
      if (!isOwner && !isAdmin) {
        throw new Error('只有群主或管理员可以发送邀请');
      }
      
      // 检查是否已有待处理的邀请
      const existingInvitation = await GroupInvitation.findOne({
        group: groupId,
        invitee: inviteeId,
        status: 'pending'
      });
      
      if (existingInvitation) {
        // 删除旧的邀请，允许重新发送
        await GroupInvitation.findByIdAndDelete(existingInvitation._id);
        logger.info(`🔄 删除旧邀请: ${existingInvitation.invitationCode}`);
      }
      
      // 创建邀请
      const invitation = new GroupInvitation({
        group: groupId,
        inviter: inviterId,
        invitee: inviteeId,
        invitationCode: this.generateInvitationCode(),
        status: 'pending',
        expiresAt: new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000)
      });
      
      await invitation.save();
      
      logger.info(`✅ 创建邀请: ${invitation.invitationCode}, 群:${groupId}, 邀请人:${inviterId}, 被邀请人:${inviteeId}`);
      
      return invitation;
    } catch (err) {
      logger.error('创建邀请失败:', err);
      throw err;
    }
  }
  
  /**
   * 接受邀请
   */
  async acceptInvitation(invitationCode, userId) {
    try {
      const invitation = await GroupInvitation.findOne({
        invitationCode,
        status: 'pending'
      }).populate('group');
      
      if (!invitation) {
        throw new Error('邀请不存在或已处理');
      }
      
      // 验证是否是被邀请人
      if (invitation.invitee.toString() !== userId) {
        throw new Error('这不是发给你的邀请');
      }
      
      // 检查是否过期
      if (new Date() > invitation.expiresAt) {
        invitation.status = 'expired';
        await invitation.save();
        throw new Error('邀请已过期');
      }
      
      // 更新状态
      invitation.status = 'accepted';
      invitation.acceptedAt = new Date();
      await invitation.save();
      
      logger.info(`✅ 接受邀请: ${invitationCode}, 用户:${userId}`);
      
      return {
        invitation,
        group: invitation.group
      };
    } catch (err) {
      logger.error('接受邀请失败:', err);
      throw err;
    }
  }
  
  /**
   * 拒绝邀请
   */
  async rejectInvitation(invitationCode, userId, reason = '') {
    try {
      const invitation = await GroupInvitation.findOne({
        invitationCode,
        status: 'pending'
      });
      
      if (!invitation) {
        throw new Error('邀请不存在或已处理');
      }
      
      if (invitation.invitee.toString() !== userId) {
        throw new Error('无权操作此邀请');
      }
      
      invitation.status = 'rejected';
      invitation.rejectedAt = new Date();
      invitation.rejectReason = reason;
      await invitation.save();
      
      logger.info(`❌ 拒绝邀请: ${invitationCode}, 用户:${userId}`);
      
      return invitation;
    } catch (err) {
      logger.error('拒绝邀请失败:', err);
      throw err;
    }
  }
  
  /**
   * 获取用户的待处理邀请列表
   */
  async getPendingInvitations(userId) {
    try {
      const invitations = await GroupInvitation.find({
        invitee: userId,
        status: 'pending',
        expiresAt: { $gt: new Date() }
      })
      .populate('group', 'name avatar settings')
      .populate('inviter', 'username avatar')
      .sort({ createdAt: -1 });
      
      return invitations;
    } catch (err) {
      logger.error('获取待处理邀请失败:', err);
      throw err;
    }
  }
  
  /**
   * 获取邀请详情（通过邀请码）
   */
  async getInvitationByCode(invitationCode) {
    try {
      const invitation = await GroupInvitation.findOne({
        invitationCode
      })
      .populate('group', 'name avatar description settings memberCount')
      .populate('inviter', 'username avatar');
      
      if (!invitation) {
        throw new Error('邀请不存在');
      }
      
      // 检查是否过期
      if (new Date() > invitation.expiresAt) {
        if (invitation.status === 'pending') {
          invitation.status = 'expired';
          await invitation.save();
        }
        throw new Error('邀请已过期');
      }
      
      return invitation;
    } catch (err) {
      logger.error('获取邀请详情失败:', err);
      throw err;
    }
  }
  
  /**
   * 群主查看发出的邀请列表
   */
  async getSentInvitations(groupId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      
      const [invitations, total] = await Promise.all([
        GroupInvitation.find({ group: groupId })
          .populate('invitee', 'username avatar')
          .populate('inviter', 'username avatar')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        GroupInvitation.countDocuments({ group: groupId })
      ]);
      
      return {
        invitations,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (err) {
      logger.error('获取邀请列表失败:', err);
      throw err;
    }
  }
}

module.exports = new GroupInvitationService();
