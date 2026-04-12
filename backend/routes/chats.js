const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const sanitizeHtml = require('sanitize-html');
const crypto = require('crypto');
const auth = require('../middlewares/auth');

const Message = require('../models/Message');
const GroupMessage = require('../models/GroupMessage');
const Group = require('../models/Group');
const UserFriends = require('../models/UserFriends');
const rateLimit = require('../middlewares/rateLimit');
const logger = require('../config/logger');

const messageRateLimit = rateLimit('rate:msg', 5, 1);

// 获取聊天列表（群组列表）
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 1. 查询用户已加入的所有群
    const joinedGroups = await Group.find({
      'members.userId': userId
    }).select('_id name avatar settings members createdAt isPublic').lean();
    
    // 2. 查询2个公开群（六合天下、红包接龙）
    const publicGroupNames = ['六合天下', '红包接龙'];
    const publicGroups = await Group.find({
      name: { $in: publicGroupNames },
      isPublic: true
    }).select('_id name avatar settings members createdAt isPublic').lean();
    
    // 3. 合并去重
    const allGroups = [...joinedGroups, ...publicGroups];
    const uniqueGroupsMap = new Map();
    allGroups.forEach(group => {
      if (!uniqueGroupsMap.has(group._id.toString())) {
        uniqueGroupsMap.set(group._id.toString(), group);
      }
    });
    const uniqueGroups = Array.from(uniqueGroupsMap.values());
    
    // 4. 为每个群组添加详细信息
    const chatList = await Promise.all(uniqueGroups.map(async (group) => {
      // 🔍 isJoined = 在成员列表中 且 ticketPaid=true
      const isJoined = group.members.find(m => {
        const memberId = typeof m.userId === 'string' ? m.userId : m.userId.toString();
        return memberId === userId;
      })?.ticketPaid === true;
      
      // 🐛 调试日志
      if (group.name === '红包接龙') {
        console.log('=== 调试: 红包接龙群 ===');
        console.log('用户ID:', userId);
        const member = group.members.find(m => {
          const memberId = typeof m.userId === 'string' ? m.userId : m.userId.toString();
          return memberId === userId;
        });
        console.log('是否找到成员:', !!member);
        if (member) {
          console.log('ticketPaid:', member.ticketPaid);
        }
        console.log('isJoined:', isJoined);
      }
      
      // 获取最后一条消息
      const lastMessage = await GroupMessage.findOne({ groupId: group._id })
        .sort({ createdAt: -1 })
        .populate('sender', 'username avatar')
        .lean();
      
      return {
        _id: group._id.toString(),
        name: group.name,
        avatar: group.avatar || '',
        type: 'group',
        isChainGroup: group.settings?.isChainRedPacket || false,
        isJoined: isJoined,
        isPublic: group.isPublic === true,  // 严格布尔值
        memberCount: group.members.length,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          type: lastMessage.type,
          sender: lastMessage.sender,
          createdAt: lastMessage.createdAt
        } : null,
        unreadCount: 0,
        updatedAt: lastMessage ? lastMessage.createdAt : group.createdAt
      };
    }));
    
    // 5. 按最后更新时间排序
    chatList.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    logger.info('获取聊天列表成功', { userId, groupCount: chatList.length });
    
    // 禁止浏览器缓存
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    res.json({
      success: true,
      data: chatList
    });
  } catch (err) {
    logger.error('获取聊天列表失败', { error: err.message, stack: err.stack });
    res.status(500).json({ 
      success: false, 
      message: '服务器内部错误' 
    });
  }
});

router.post('/messages', auth, messageRateLimit, async (req, res) => {
  try {
    const userId = req.user.id;
    const { groupId, receiverId, content, type = 'text', clientMsgId } = req.body;
    
    console.log('[DEBUG] 收到消息请求:', { userId, groupId, receiverId, clientMsgId });
    
    if (!content || content.length > 2000) {
      return res.status(400).json({ 
        success: false, 
        message: '消息内容不能超过2000字符' 
      });
    }
    
    if (!groupId && !receiverId) {
      return res.status(400).json({ 
        success: false, 
        message: '必须指定groupId或receiverId' 
      });
    }
    
    if (receiverId && !mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ 
        success: false, 
        message: '无效的接收者ID' 
      });
    }
    
    let isAllowed = false;
    
    if (groupId) {
      const group = await Group.findById(groupId).select('members settings');
      if (!group) {
        return res.status(404).json({ 
          success: false, 
          message: '群组不存在' 
        });
      }
      
      isAllowed = group.members.some(m => m.userId.toString() === userId) || group.settings?.isChainRedPacket;
      if (!isAllowed) {
        return res.status(403).json({ 
          success: false, 
          message: '您不是该群组成员' 
        });
      }
      
      if (clientMsgId) {
        const existing = await GroupMessage.findOne({ groupId, clientMsgId });
        if (existing) {
          await existing.populate('sender', 'username avatar');
          return res.json({ success: true, data: existing });
        }
      }
    } else if (receiverId) {
      // 🆕 检查是否是好友
      const userFriends = await UserFriends.findOne({ userId });
      const isFriend = userFriends && userFriends.friendIds.includes(receiverId);
      
      if (!isFriend) {
        return res.status(403).json({ 
          success: false, 
          message: '您与对方不是好友关系' 
        });
      }
      isAllowed = true;
    }
    
    const filteredContent = sanitizeHtml(content, {
      allowedTags: [],
      allowedAttributes: {}
    });
    
    // 如果没有clientMsgId，生成一个唯一的
    const finalClientMsgId = clientMsgId || `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('[DEBUG] finalClientMsgId:', finalClientMsgId);
    
    let message;
    if (groupId) {
      message = new GroupMessage({
        sender: userId,
        groupId,
        content: filteredContent,
        type,
        clientMsgId: finalClientMsgId
      });
    } else {
      message = new Message({
        sender: userId,
        receiver: receiverId,
        content: filteredContent,
        type,
        clientMsgId: finalClientMsgId
      });
    }
    
    await message.save();
    await message.populate('sender', 'username avatar');
    
    const io = global.socketService?.getIO();
    if (io) {
      if (groupId) {
        io.to(`group:${groupId}`).emit('groupMessage', message);
      } else {
        io.to(`user:${receiverId}`).emit('privateMessage', message);
      }
    }
    
    setImmediate(() => {
      const auditClient = global.auditClient;
      if (auditClient) {
        auditClient.log({
          type: 'message:send',
          userId,
          groupId: groupId || null,
          receiverId: receiverId || null,
          contentHash: crypto.createHash('sha256').update(filteredContent).digest('hex'),
          timestamp: Date.now()
        });
      }
    });
    
    logger.info('消息发送成功', { userId, groupId, receiverId, messageId: message._id });
    res.json({ success: true, data: message });
    
  } catch (error) {
    logger.error('发送消息失败', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      success: false, 
      message: '服务器内部错误' 
    });
  }
});

router.get('/messages/:chatId', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;
    
    logger.info('消息查询请求（已弃用，请使用前端IndexedDB）', { userId, chatId });
    
    // ⚠️ 聊天消息已从MongoDB移除，由前端IndexedDB管理
    // 此接口保留仅为兼容性，返回空数组
    res.json({
      success: true,
      data: {
        messages: [],
        total: 0,
        page: 1,
        limit: 0,
        hasMore: false,
        note: '聊天消息已迁移至前端IndexedDB存储，请从本地数据库获取'
      }
    });
    
  } catch (error) {
    logger.error('消息查询失败', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      success: false, 
      message: '服务器内部错误' 
    });
  }
});

module.exports = router;
