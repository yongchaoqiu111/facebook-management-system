const express = require('express');
const { check, validationResult } = require('express-validator');
const auth = require('../middlewares/auth');
const Group = require('../models/Group');
const User = require('../models/User');
const IdGenerator = require('../services/idGenerator');
const ChainRedPacketService = require('../services/chainRedPacketService');
const groupOwnerIncomeService = require('../services/groupOwnerIncomeService');
const groupInvitationService = require('../services/groupInvitationService');
const logger = require('../config/logger');

const router = express.Router();

// 获取用户所在的群组列表
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 🌟 公共群：所有用户都能看到（即使还没加入）
    const publicGroups = await Group.find({
      isPublic: true
    }).populate('owner', 'username avatar')
      .sort({ createdAt: 'desc' });
    
    // 用户已加入的私有群
    const privateGroups = await Group.find({
      isPublic: false,
      'members.userId': userId
    }).populate('owner', 'username avatar')
      .populate('members.userId', 'username avatar')
      .sort({ updatedAt: 'desc' });
    
    // 🔍 自建接龙群：只显示已接受邀请的
    const invitedChainGroups = await GroupInvitation.find({
      invitee: userId,
      status: 'accepted'
    })
    .populate('group')
    .then(invitations => invitations.map(inv => inv.group).filter(g => g));
    
    // 合并：公共群 + 私有群 + 受邀的自建群
    const allGroups = [...publicGroups, ...privateGroups, ...invitedChainGroups];
    
    logger.info(`User ${userId} fetched groups list: ${publicGroups.length} public, ${privateGroups.length} private, ${invitedChainGroups.length} invited`);
    res.json(allGroups);
  } catch (err) {
    logger.error('Error getting groups:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ⚠️ 注意：创建群聊的路由已移到文件末尾，避免与 /:id/invite 等路由冲突

// 获取群组详情
router.get('/:id', auth, async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;

    const group = await Group.findById(groupId)
      .populate('owner', 'username avatar phone')
      .populate('members.userId', 'username avatar phone')
      .populate('admins', 'username avatar');

    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // 🌟 公共群：所有人都可以查看和进入
    if (!group.isPublic) {
      // 私有群：检查是否是群成员
      const isMember = group.members.some(m => m.userId.toString() === userId);
      if (!isMember) {
        return res.status(403).json({ msg: 'Not a member of this group' });
      }
    } else {
      // 🌟 公共群：如果用户还没加入，自动加入
      // ⚠️ 但是接龙群不自动加入，必须通过 join-chain 接口缴费
      const isMember = group.members.some(m => m.userId.toString() === userId);
      if (!isMember && !group.settings.isChainRedPacket) {
        group.members.push({
          userId: userId,
          role: 'member',
          joinedAt: new Date()
        });
        group.memberCount += 1;
        await group.save();
        logger.info(`User ${userId} auto-joined public group ${groupId}`);
      }
    }

    logger.info(`User ${userId} fetched group ${groupId} details`);
    res.json(group);
  } catch (err) {
    logger.error('Error getting group details:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// 退出群组
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // 群主不能退出，只能解散
    if (group.owner.toString() === userId) {
      return res.status(400).json({ msg: 'Owner cannot leave group, please disband it' });
    }

    // 移除成员
    group.members = group.members.filter(m => m.userId.toString() !== userId);
    group.memberCount = group.members.length;
    group.updatedAt = Date.now();

    await group.save();

    logger.info(`User ${userId} left group ${groupId}`);
    res.json({ msg: 'Successfully left the group' });
  } catch (err) {
    logger.error('Error leaving group:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// 解散群组（仅群主）
router.delete('/:id', auth, async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // 验证是否是群主
    if (group.owner.toString() !== userId) {
      return res.status(403).json({ msg: 'Only owner can disband the group' });
    }

    await Group.findByIdAndDelete(groupId);

    logger.info(`User ${userId} disbanded group ${groupId}`);
    res.json({ msg: 'Group disbanded successfully' });
  } catch (err) {
    logger.error('Error disbanding group:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// 邀请成员加入群组（普通群聊用）
router.post('/:id/add-members', auth, [
  check('memberIds', 'Member IDs required').isArray({ min: 1 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { memberIds } = req.body;
  const groupId = req.params.id;
  const userId = req.user.id;

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // 检查权限
    const member = group.members.find(m => m.userId.toString() === userId);
    if (!member) {
      return res.status(403).json({ msg: 'Not a member of this group' });
    }

    if (!group.settings.allowMemberInvite && member.role !== 'owner' && member.role !== 'admin') {
      return res.status(403).json({ msg: 'No permission to invite members' });
    }

    // 添加新成员
    const existingMemberIds = group.members.map(m => m.userId.toString());
    const newMembers = [];

    for (const memberId of memberIds) {
      if (!existingMemberIds.includes(memberId)) {
        // 检查用户是否存在
        const user = await User.findById(memberId);
        if (user) {
          newMembers.push({
            userId: memberId,
            role: 'member',
            joinedAt: new Date()
          });
        }
      }
    }

    if (newMembers.length === 0) {
      return res.status(400).json({ msg: 'No valid members to add' });
    }

    group.members.push(...newMembers);
    group.memberCount += newMembers.length;
    group.updatedAt = Date.now();

    await group.save();

    logger.info(`User ${userId} invited ${newMembers.length} members to group ${groupId}`);
    res.json({ msg: 'Members invited successfully', count: newMembers.length });
  } catch (err) {
    logger.error('Error inviting members:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// 🔥 加入普通群（私人群）
router.post('/:id/join', auth, async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;

    // 检查群组是否存在
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // 检查是否接龙群（接龙群必须用 join-chain）
    if (group.settings.isChainRedPacket) {
      return res.status(400).json({ 
        msg: 'This is a chain group. Use /join-chain endpoint instead.',
        useChainEndpoint: true
      });
    }

    // 检查是否已是成员
    const existingMember = group.members.find(m => m.userId.toString() === userId);
    if (existingMember) {
      return res.status(400).json({ msg: 'Already a member of this group' });
    }

    // 检查是否需要审批
    if (group.settings.needApproval) {
      return res.status(403).json({ 
        msg: 'This group requires approval. Wait for admin approval.',
        requiresApproval: true
      });
    }

    // 添加成员
    group.members.push({
      userId,
      role: 'member',
      joinedAt: new Date()
    });
    group.memberCount += 1;
    group.updatedAt = Date.now();
    await group.save();

    // 广播群组列表更新
    const io = global.socketService ? global.socketService.io : null;
    if (io) {
      io.to(`user:${userId}`).emit('groupListUpdated', {
        action: 'joined',
        group: {
          _id: group._id,
          name: group.name,
          avatar: group.avatar,
          memberCount: group.memberCount
        },
        timestamp: Date.now()
      });

      // 让当前用户加入群组房间
      const socketId = global.socketService.onlineUsers.get(userId);
      if (socketId) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
          socket.join(`group:${groupId}`);
        }
      }
    }

    logger.info(`User ${userId} joined group ${groupId}`);

    res.json({
      success: true,
      group: {
        _id: group._id,
        name: group.name,
        avatar: group.avatar,
        description: group.description,
        memberCount: group.memberCount
      },
      message: 'Joined group successfully'
    });

  } catch (err) {
    logger.error('Join group error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// 加入接龙群（自动扣费+发首包）
router.post('/:id/join-chain', auth, async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;

    // 🔍 检查群组类型
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // ⚠️ 自建群必须验证邀请
    if (!group.isPublic && group.settings.isChainRedPacket) {
      const invitation = await GroupInvitation.findOne({
        group: groupId,
        invitee: userId,
        status: 'accepted'
      });

      if (!invitation) {
        return res.status(403).json({ 
          msg: 'This is a private group. You need an invitation to join.',
          requiresInvitation: true
        });
      }
    }

    const result = await ChainRedPacketService.joinChainGroup(groupId, userId);

    // 获取发送者信息
    const sender = await User.findById(userId);

    res.json({ 
      msg: 'Successfully joined the chain group',
      data: {
        group: {
          id: result.group._id,
          name: result.group.name,
          memberCount: result.group.memberCount
        },
        redPacket: {
          id: result.redPacket._id,
          senderId: userId,
          senderName: sender.username,
          senderAvatar: sender.avatar || '',
          totalAmount: result.redPacket.totalAmount,
          count: result.redPacket.count,
          perAmount: result.redPacket.amounts[0],
          message: result.redPacket.message,
          createdAt: result.redPacket.createdAt,
          isChainRedPacket: true
        },
        canGrabAfter: result.canGrabAfter,
        remainingBalance: result.remainingBalance
      }
    });
  } catch (err) {
    logger.error('Error joining chain group:', err);
    res.status(400).json({ msg: err.message });
  }
});

// 获取接龙群个人信息
router.get('/:id/chain-info', auth, async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;

    const info = await ChainRedPacketService.getChainGroupInfo(groupId, userId);

    res.json({
      msg: 'Success',
      data: info
    });
  } catch (err) {
    logger.error('Error getting chain group info:', err);
    res.status(400).json({ msg: err.message });
  }
});

// ==================== 群主管理接口 ====================

// 创建接龙群
router.post('/create-chain', auth, [
  check('name', '群名称必填').not().isEmpty(),
  check('ticketAmount', '门票金额必填').isFloat({ min: 1 }),
  check('firstRedPacketAmount', '首包金额必填').isFloat({ min: 100 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const userId = req.user.id;
    const { 
      name, 
      description = '',
      ticketAmount = 10,
      firstRedPacketAmount = 300,
      redPacketCount = 30,
      redPacketPerAmount = 10,
      kickThreshold = 380,
      waitHours = 3,
      maxMembers = 500
    } = req.body;

    // 创建群组
    const group = new Group({
      name,
      description,
      owner: userId,
      admins: [userId],
      members: [{
        userId,
        role: 'owner',
        joinedAt: new Date()
      }],
      memberCount: 1,
      maxMembers,
      settings: {
        allowMemberInvite: true,
        allowMemberPost: true,
        needApproval: false,
        isChainRedPacket: true,
        ticketAmount,
        firstRedPacketAmount,
        redPacketCount,
        redPacketPerAmount,
        kickThreshold,
        waitHours
      },
      isPublic: false  // 用户创建的群不是公共群
    });

    await group.save();

    logger.info(`用户 ${userId} 创建接龙群: ${group._id}`);

    res.json({
      success: true,
      data: group,
      message: '接龙群创建成功'
    });
  } catch (err) {
    logger.error('创建接龙群失败:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 获取我创建的群列表
router.get('/my-created', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [groups, total] = await Promise.all([
      Group.find({ owner: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Group.countDocuments({ owner: userId })
    ]);

    res.json({
      success: true,
      data: {
        groups,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (err) {
    logger.error('获取我创建的群失败:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 获取我的群收益统计
router.get('/my-income/stats', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await groupOwnerIncomeService.getOwnerIncomeStats(userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    logger.error('获取群主收益统计失败:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 获取我的群收益列表
router.get('/my-income/list', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await groupOwnerIncomeService.getOwnerIncomes(userId, page, limit);

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    logger.error('获取群主收益列表失败:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 获取某个群的收益统计
router.get('/:id/income-stats', auth, async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;

    // 验证是否是群主
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (group.owner.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const stats = await groupOwnerIncomeService.getGroupIncomeStats(groupId);

    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    logger.error('获取群收益统计失败:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== 邀请相关接口 ====================

// 创建邀请（群主/管理员邀请好友）
router.post('/:id/invite', auth, [
  check('inviteeId', '被邀请人ID必填').not().isEmpty()
], async (req, res) => {
  // 🔍 调试日志
  logger.info(`收到邀请请求: groupId=${req.params.id}, body=`, req.body);
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.error('邀请参数验证失败:', errors.array());
    return res.status(400).json({ 
      success: false,
      msg: '参数验证失败',
      details: errors.array() 
    });
  }

  try {
    const groupId = req.params.id;
    const inviterId = req.user.id;
    const { inviteeId, expireDays = 7 } = req.body;

    logger.info(`创建邀请: 群${groupId}, 邀请人${inviterId}, 被邀请人${inviteeId}`);

    const invitation = await groupInvitationService.createInvitation(
      groupId,
      inviterId,
      inviteeId,
      expireDays
    );

    // 📡 通过 Socket 推送邀请通知给被邀请人
    try {
      const io = global.socketService ? global.socketService.getIO() : null;
      if (io) {
        // 获取群信息和邀请人信息
        const group = await Group.findById(groupId);
        const inviter = await User.findById(inviterId);

        // 推送给被邀请人
        io.to(`user:${inviteeId}`).emit('groupInvitation', {
          invitationId: invitation._id,
          invitationCode: invitation.invitationCode,
          group: {
            id: group._id,
            name: group.name,
            avatar: group.avatar,
            description: group.description,
            settings: group.settings
          },
          inviter: {
            id: inviter._id,
            username: inviter.username,
            avatar: inviter.avatar
          },
          expiresAt: invitation.expiresAt,
          createdAt: invitation.createdAt
        });

        logger.info(`📨 已推送邀请通知给用户 ${inviteeId}`);
      } else {
        logger.warn('⚠️ Socket服务未初始化，无法推送邀请通知');
      }
    } catch (socketErr) {
      logger.error('推送邀请通知失败:', socketErr);
      // 不影响邀请创建，只记录错误
    }

    res.json({
      success: true,
      data: invitation,
      msg: '邀请发送成功'
    });
  } catch (err) {
    logger.error('创建邀请失败:', err);
    res.status(400).json({ 
      success: false,
      msg: err.message 
    });
  }
});

// 获取邀请详情（通过邀请码）
router.get('/invitation/:code', auth, async (req, res) => {
  try {
    const invitationCode = req.params.code;
    
    const invitation = await groupInvitationService.getInvitationByCode(invitationCode);

    res.json({
      success: true,
      data: invitation
    });
  } catch (err) {
    logger.error('获取邀请详情失败:', err);
    res.status(400).json({ error: err.message });
  }
});

// 接受邀请
router.post('/invitation/:code/accept', auth, async (req, res) => {
  try {
    const invitationCode = req.params.code;
    const userId = req.user.id;

    const result = await groupInvitationService.acceptInvitation(invitationCode, userId);

    res.json({
      success: true,
      data: result,
      message: '已接受邀请，请缴费进群'
    });
  } catch (err) {
    logger.error('接受邀请失败:', err);
    res.status(400).json({ error: err.message });
  }
});

// 拒绝邀请
router.post('/invitation/:code/reject', auth, async (req, res) => {
  try {
    const invitationCode = req.params.code;
    const userId = req.user.id;
    const { reason } = req.body;

    await groupInvitationService.rejectInvitation(invitationCode, userId, reason);

    res.json({
      success: true,
      message: '已拒绝邀请'
    });
  } catch (err) {
    logger.error('拒绝邀请失败:', err);
    res.status(400).json({ error: err.message });
  }
});

// 获取我的待处理邀请列表
router.get('/invitations/pending', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const invitations = await groupInvitationService.getPendingInvitations(userId);

    res.json({
      success: true,
      data: invitations
    });
  } catch (err) {
    logger.error('获取待处理邀请失败:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 获取群的邀请列表（仅群主/管理员）
router.get('/:id/invitations', auth, async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    // 验证权限
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const isOwner = group.owner.toString() === userId;
    const isAdmin = group.admins.some(id => id.toString() === userId);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await groupInvitationService.getSentInvitations(groupId, page, limit);

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    logger.error('获取邀请列表失败:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== 通用路由（必须放在最后）====================

// 创建群聊（⚠️ 必须放在所有 /:id 路由之后）
router.post('/', auth, [
  check('name', 'Group name is required').not().isEmpty(),
  check('memberIds', 'At least 2 members required').isArray({ min: 2 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description, memberIds } = req.body;
  const userId = req.user.id;

  try {
    // 检查所有成员是否存在
    const members = await User.find({ _id: { $in: memberIds } });
    if (members.length !== memberIds.length) {
      return res.status(404).json({ msg: 'Some members not found' });
    }

    // 🔥 生成 7 位纯数字群组 ID
    const groupId = await IdGenerator.generateGroupId();

    // 构建群组成员列表
    const groupMembers = [
      { userId, role: 'owner', joinedAt: new Date() }
    ];
    
    memberIds.forEach(memberId => {
      groupMembers.push({
        userId: memberId,
        role: 'member',
        joinedAt: new Date()
      });
    });

    // 创建群组
    const group = new Group({
      _id: groupId.toString(),
      name,
      description: description || '',
      owner: userId,
      members: groupMembers,
      memberCount: memberIds.length + 1,
      settings: {
        allowMemberInvite: true,
        allowMemberPost: true,
        needApproval: false
      }
    });

    await group.save();

    // 填充信息
    await group.populate('owner', 'username avatar')
      .populate('members.userId', 'username avatar');

    logger.info(`User ${userId} created group "${name}" with ${groupMembers.length} members`);
    res.json({ msg: 'Group created successfully', group });
  } catch (err) {
    logger.error('Error creating group:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;