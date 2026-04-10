const express = require('express');
const auth = require('../middlewares/auth');
const Message = require('../models/Message');
const Friend = require('../models/Friend');
const Group = require('../models/Group');
const logger = require('../config/logger');

const router = express.Router();

// 获取聊天列表（最近消息）
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. 获取所有好友ID
    const friends = await Friend.find({
      $or: [
        { user1: userId, status: 'accepted' },
        { user2: userId, status: 'accepted' }
      ]
    });

    const friendIds = friends.map(f => 
      f.user1.toString() === userId ? f.user2.toString() : f.user1.toString()
    );

    // 2. 获取所有群组ID（包括已加入的私有群 + 所有公共群）
    const groups = await Group.find({
      $or: [
        { 'members.userId': userId }, // 用户已加入的群
        { isPublic: true }            // 所有公共群
      ]
    });

    const groupIds = groups.map(g => g._id.toString());

    // 3. 获取最新的私聊消息
    const privateMessages = await Message.find({
      $or: [
        { sender: userId },
        { receiver: userId }
      ],
      type: 'text'
    })
    .populate('sender', 'username avatar')
    .populate('receiver', 'username avatar')
    .sort({ createdAt: 'desc' })
    .limit(100);

    // 4. 整理聊天列表 - 按联系人分组
    const chatMap = new Map();

    privateMessages.forEach(msg => {
      const otherUserId = msg.sender._id.toString() === userId 
        ? msg.receiver._id.toString() 
        : msg.sender._id.toString();
      
      const otherUser = msg.sender._id.toString() === userId 
        ? msg.receiver 
        : msg.sender;

      if (!chatMap.has(otherUserId)) {
        chatMap.set(otherUserId, {
          id: otherUserId,
          type: 'private',
          name: otherUser.username,
          avatar: otherUser.avatar || '👤',
          lastMessage: msg.content,
          lastMessageTime: msg.createdAt,
          unreadCount: 0, // TODO: 需要消息已读状态
          isPinned: false, // TODO: 需要置顶功能
          online: false // TODO: 需要在线状态
        });
      }
    });

    // 5. 整理群组聊天列表
    const groupChats = groups.map(group => {
      // TODO: 获取群组最后一条消息
      return {
        id: group._id.toString(),
        type: 'group',
        name: group.name,
        avatar: group.avatar || '👥',
        lastMessage: '暂无消息',
        lastMessageTime: group.updatedAt,
        unreadCount: 0,
        isPinned: false,
        memberCount: group.memberCount
      };
    });

    // 6. 转换为数组并排序
    const chats = Array.from(chatMap.values())
      .sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

    // 7. 分离置顶聊天和普通聊天
    const pinnedChats = chats.filter(c => c.isPinned);
    const normalChats = chats.filter(c => !c.isPinned);

    logger.info(`User ${userId} fetched chat list: ${chats.length} private, ${groupChats.length} groups`);
    
    res.json({
      success: true,
      data: {
        chats: normalChats,
        pinnedChats,
        groupChats
      }
    });
  } catch (err) {
    logger.error('Error getting chat list:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// 创建群聊
router.post('/group', auth, async (req, res) => {
  try {
    const { name, memberIds } = req.body;
    const userId = req.user.id;

    if (!name || !memberIds || memberIds.length < 2) {
      return res.json({
        success: false,
        message: '请至少选择2位好友'
      });
    }

    // 查找群组
    let group = await Group.findOne({ 
      name,
      owner: userId 
    });

    if (group) {
      return res.json({
        success: false,
        message: '群组名称已存在'
      });
    }

    // 构建群组成员
    const members = [{
      userId,
      role: 'owner',
      joinedAt: new Date()
    }];

    memberIds.forEach(memberId => {
      members.push({
        userId: memberId,
        role: 'member',
        joinedAt: new Date()
      });
    });

    // 创建群组
    group = new Group({
      name,
      owner: userId,
      members,
      memberCount: members.length,
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

    logger.info(`User ${userId} created group "${name}"`);
    
    res.json({
      success: true,
      data: group,
      message: '群聊创建成功'
    });
  } catch (err) {
    logger.error('Error creating group chat:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// 获取聊天消息列表（支持私聊和群聊）
router.get('/messages/:chatId', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    // 判断是私聊还是群聊
    // 如果 chatId 是 ObjectId 格式且存在于 Group 中，则是群聊
    // 否则是私聊（对方用户ID）
    
    let messages = [];
    let chatType = 'private';
    let chatInfo = null;

    // 尝试查找群组
    const group = await Group.findById(chatId);
    
    if (group) {
      // 群聊
      chatType = 'group';
      chatInfo = {
        id: group._id,
        name: group.name,
        avatar: group.avatar || '👥',
        type: 'group',
        memberCount: group.memberCount
      };

      // 检查是否是群成员（公共群不需要检查）
      if (!group.isPublic) {
        const isMember = group.members.some(m => m.userId.toString() === userId);
        if (!isMember) {
          return res.status(403).json({ 
            success: false,
            message: 'Not a member of this group' 
          });
        }
      }

      // TODO: 获取群聊消息（需要从 GroupMessage 模型查询）
      // 暂时返回空数组
      messages = [];
    } else {
      // 私聊
      chatType = 'private';
      
      // 检查是否是好友
      const friend = await Friend.findOne({
        $or: [
          { user1: userId, user2: chatId, status: 'accepted' },
          { user1: chatId, user2: userId, status: 'accepted' }
        ]
      }).populate('user1 user2', 'username avatar');

      if (!friend) {
        return res.status(403).json({ 
          success: false,
          message: 'Not friends with this user' 
        });
      }

      // 获取对方信息
      const otherUser = friend.user1._id.toString() === userId ? friend.user2 : friend.user1;
      chatInfo = {
        id: otherUser._id,
        name: otherUser.username,
        avatar: otherUser.avatar || '👤',
        type: 'private'
      };

      // 获取私聊消息
      messages = await Message.find({
        $or: [
          { sender: userId, receiver: chatId },
          { sender: chatId, receiver: userId }
        ]
      })
      .populate('sender', 'username avatar')
      .populate('receiver', 'username avatar')
      .sort({ createdAt: 'asc' });

      // 标记对方发送的消息为已读
      await Message.updateMany(
        {
          sender: chatId,
          receiver: userId,
          read: false
        },
        {
          $set: { read: true }
        }
      );
    }

    logger.info(`User ${userId} fetched ${chatType} messages for ${chatId}`);

    res.json({
      success: true,
      data: {
        chatInfo,
        chatType,
        messages
      }
    });
  } catch (err) {
    logger.error('Error getting chat messages:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router;