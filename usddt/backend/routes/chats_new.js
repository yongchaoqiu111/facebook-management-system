const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const sanitizeHtml = require('sanitize-html');
const crypto = require('crypto');

const Message = require('../models/Message');
const GroupMessage = require('../models/GroupMessage');
const Group = require('../models/Group');
const Friend = require('../models/Friend');
const rateLimit = require('../middlewares/rateLimit');
const logger = require('../config/logger');

const messageRateLimit = rateLimit('rate:msg', 5, 1);

router.post('/messages', messageRateLimit, async (req, res) => {
  try {
    const userId = req.user.id;
    const { groupId, receiverId, content, type = 'text', clientMsgId } = req.body;
    
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
      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({ 
          success: false, 
          message: '群组不存在' 
        });
      }
      
      isAllowed = group.members.some(m => m.userId.toString() === userId) || group.isPublic;
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
      const friend = await Friend.findOne({
        $or: [
          { user1: userId, user2: receiverId, status: 'accepted' },
          { user1: receiverId, user2: userId, status: 'accepted' }
        ]
      });
      
      if (!friend) {
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
    
    let message;
    if (groupId) {
      message = new GroupMessage({
        sender: userId,
        groupId,
        content: filteredContent,
        type,
        clientMsgId
      });
    } else {
      message = new Message({
        sender: userId,
        receiver: receiverId,
        content: filteredContent,
        type,
        clientMsgId
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

router.get('/messages/:chatId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;
    
    const isValidObjectId = mongoose.Types.ObjectId.isValid(chatId);
    
    let messages, total;
    
    if (isValidObjectId) {
      const group = await Group.findById(chatId);
      
      if (group) {
        const isMember = group.members.some(m => m.userId.toString() === userId);
        if (!isMember && !group.isPublic) {
          return res.status(403).json({ 
            success: false, 
            message: '您不是该群组成员' 
          });
        }
        
        [messages, total] = await Promise.all([
          GroupMessage.find({ groupId: chatId })
            .populate('sender', 'username avatar')
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(limit),
          GroupMessage.countDocuments({ groupId: chatId })
        ]);
      } else {
        const friend = await Friend.findOne({
          $or: [
            { user1: userId, user2: chatId, status: 'accepted' },
            { user1: chatId, user2: userId, status: 'accepted' }
          ]
        });
        
        if (!friend) {
          return res.status(403).json({ 
            success: false, 
            message: '您与对方不是好友关系' 
          });
        }
        
        [messages, total] = await Promise.all([
          Message.find({
            $or: [
              { sender: userId, receiver: chatId },
              { sender: chatId, receiver: userId }
            ]
          })
            .populate('sender', 'username avatar')
            .populate('receiver', 'username avatar')
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(limit),
          Message.countDocuments({
            $or: [
              { sender: userId, receiver: chatId },
              { sender: chatId, receiver: userId }
            ]
          })
        ]);
      }
    } else {
      return res.status(400).json({ 
        success: false, 
        message: '无效的聊天ID' 
      });
    }
    
    logger.info('消息查询成功', { userId, chatId, page, limit, messageCount: messages.length });
    res.json({
      success: true,
      data: {
        messages,
        total,
        page,
        limit,
        hasMore: skip + messages.length < total
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
