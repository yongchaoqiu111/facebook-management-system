const express = require('express');
const { check, validationResult } = require('express-validator');
const auth = require('../middlewares/auth');
const Friend = require('../models/Friend');
const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');
const Message = require('../models/Message');  // 🚀 添加 Message 模型
const logger = require('../config/logger');
const { sendError, sendSuccess, ERROR_CODES } = require('../utils/responseHelper');

const router = express.Router();

// 搜索用户（通过 userId 或 username）
router.get('/search', auth, async (req, res) => {
  try {
    const { keyword } = req.query;
    
    if (!keyword || keyword.length < 2) {
      return sendError(ERROR_CODES.VALIDATION_ERROR, res, { 
        message: '搜索关键词至少2个字符' 
      });
    }

    // 判断是否为纯数字（userId）
    const isNumeric = /^\d+$/.test(keyword);
    
    let searchCondition;
    if (isNumeric) {
      // 纯数字：精确匹配 userId
      searchCondition = { userId: keyword };
    } else {
      // 非数字：模糊匹配 username
      searchCondition = { username: { $regex: keyword, $options: 'i' } };
    }

    // 搜索用户
    const users = await User.find(searchCondition)
      .select('_id userId username avatar')
      .limit(10);

    // 过滤掉自己并确保 userId 字段存在
    const filteredUsers = users
      .filter(user => user._id.toString() !== req.user.id)
      .map(user => ({
        _id: user._id,
        userId: user.userId || user._id.toString(), // 如果 userId 为空，使用 _id 作为 fallback
        username: user.username,
        avatar: user.avatar
      }));

    sendSuccess(res, filteredUsers);
  } catch (err) {
    logger.error('搜索用户失败:', err);
    sendError(ERROR_CODES.INTERNAL_ERROR, res);
  }
});

// 获取好友列表
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 查找所有已接受的好友关系
    const friends = await Friend.find({
      $or: [
        { user1: userId, status: 'accepted' },
        { user2: userId, status: 'accepted' }
      ]
    }).populate('user1', 'username avatar phone')
      .populate('user2', 'username avatar phone')
      .sort({ updatedAt: 'desc' });
    
    // 格式化返回数据
    const friendList = await Promise.all(friends.map(async (friend) => {
      const isUser1 = friend.user1._id.toString() === userId;
      const friendInfo = isUser1 ? friend.user2 : friend.user1;
      
      // 🚀 计算未读消息数
      const unreadCount = await Message.countDocuments({
        sender: friendInfo._id,
        receiver: userId,
        read: false
      });
      
      return {
        id: friendInfo._id,
        username: friendInfo.username,
        avatar: friendInfo.avatar || '👤',
        phone: friendInfo.phone,
        remark: friend.remark,
        status: friend.status,
        unreadCount: unreadCount,  // 未读消息数
        createdAt: friend.createdAt,
        updatedAt: friend.updatedAt
      };
    }));
    
    logger.info(`User ${userId} fetched friend list, count: ${friendList.length}`);
    res.json(friendList);
  } catch (err) {
    logger.error('Error getting friend list:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// 添加好友
router.post('/', auth, [
  check('userId', 'User ID is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, message } = req.body;
  const currentUserId = req.user.id;

  try {
    // 不能添加自己为好友
    if (userId === currentUserId) {
      return sendError(ERROR_CODES.CANNOT_ADD_SELF, res);
    }

    // 检查目标用户是否存在（支持通过 userId 字段或 _id 查找）
    let targetUser;
    
    // 先尝试作为 userId 字段查找
    targetUser = await User.findOne({ userId });
    
    // 如果没找到，再尝试作为 _id 查找
    const mongoose = require('mongoose');
    if (!targetUser && mongoose.Types.ObjectId.isValid(userId)) {
      targetUser = await User.findById(userId);
    }
    
    if (!targetUser) {
      return sendError(ERROR_CODES.USER_NOT_FOUND, res, { 
        message: '用户不存在，请检查用户ID' 
      });
    }

    // 检查是否已经是好友（使用 userId 字符串）
    const existingFriend = await Friend.findOne({
      $or: [
        { user1: currentUserId, user2: userId },
        { user1: userId, user2: currentUserId }
      ]
    });

    if (existingFriend && existingFriend.status === 'accepted') {
      return sendError(ERROR_CODES.ALREADY_FRIENDS, res);
    }

    if (existingFriend && existingFriend.status === 'blocked') {
      return sendError(ERROR_CODES.USER_BLOCKED, res);
    }

    // 检查是否已经有待处理的请求（使用 userId 字符串）
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: currentUserId, receiver: userId, status: 'pending' },
        { sender: userId, receiver: currentUserId, status: 'pending' }
      ]
    });

    if (existingRequest) {
      return sendError(ERROR_CODES.FRIEND_REQUEST_SENT, res);
    }

    // 创建好友请求（使用目标用户的 userId）
    const friendRequest = new FriendRequest({
      sender: currentUserId,  // 当前用户的 userId
      receiver: userId,  // 目标用户的 userId
      message: message || ''
    });

    await friendRequest.save();

    // 填充发送者信息
    await friendRequest.populate('sender', 'username avatar');

    logger.info(`User ${currentUserId} sent friend request to ${userId}`);
    sendSuccess(res, { friendRequest }, '好友请求发送成功');
  } catch (err) {
    logger.error('Error adding friend:', err);
    sendError(ERROR_CODES.INTERNAL_ERROR, res);
  }
});

// 删除好友
router.delete('/:id', auth, async (req, res) => {
  try {
    const friendId = req.params.id;
    const userId = req.user.id;

    // 查找好友关系
    const friend = await Friend.findOne({
      $or: [
        { user1: userId, user2: friendId, status: 'accepted' },
        { user1: friendId, user2: userId, status: 'accepted' }
      ]
    });

    if (!friend) {
      return sendError(ERROR_CODES.USER_NOT_FOUND, res, { message: '好友不存在' });
    }

    // 删除好友关系
    await Friend.findByIdAndDelete(friend._id);

    logger.info(`User ${userId} deleted friend ${friendId}`);
    sendSuccess(res, null, '好友删除成功');
  } catch (err) {
    logger.error('Error deleting friend:', err);
    sendError(ERROR_CODES.INTERNAL_ERROR, res);
  }
});

// 获取好友请求（收到的请求）
router.get('/requests', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // 获取收到的待处理请求
    const receivedRequests = await FriendRequest.find({
      receiver: userId,
      status: 'pending'
    }).populate('sender', 'username avatar phone')
      .sort({ createdAt: 'desc' });

    // 获取发送的待处理请求
    const sentRequests = await FriendRequest.find({
      sender: userId,
      status: 'pending'
    }).populate('receiver', 'username avatar phone')
      .sort({ createdAt: 'desc' });

    logger.info(`User ${userId} fetched friend requests`);
    res.json({
      received: receivedRequests,
      sent: sentRequests
    });
  } catch (err) {
    logger.error('Error getting friend requests:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// 接受好友请求
router.put('/requests/:id/accept', auth, async (req, res) => {
  try {
    const requestId = req.params.id;
    const userId = req.user.id;

    // 查找好友请求
    const friendRequest = await FriendRequest.findById(requestId);

    if (!friendRequest) {
      return sendError(ERROR_CODES.FRIEND_REQUEST_NOT_FOUND, res);
    }

    // 验证是否是接收者
    if (friendRequest.receiver.toString() !== userId) {
      return sendError(ERROR_CODES.NOT_AUTHORIZED, res);
    }

    // 检查请求状态
    if (friendRequest.status !== 'pending') {
      return sendError(ERROR_CODES.REQUEST_ALREADY_PROCESSED, res);
    }

    // 更新请求状态
    friendRequest.status = 'accepted';
    friendRequest.updatedAt = Date.now();
    await friendRequest.save();

    // 创建好友关系
    const friend = new Friend({
      user1: friendRequest.sender,
      user2: friendRequest.receiver,
      status: 'accepted'
    });

    await friend.save();

    // 填充信息
    await friendRequest.populate('sender', 'username avatar');
    await Friend.findById(friend._id)
      .populate('user1', 'username avatar')
      .populate('user2', 'username avatar');

    logger.info(`User ${userId} accepted friend request from ${friendRequest.sender}`);
    sendSuccess(res, { friendRequest, friend }, '好友请求已接受');
  } catch (err) {
    logger.error('Error accepting friend request:', err);
    sendError(ERROR_CODES.INTERNAL_ERROR, res);
  }
});

// 拒绝好友请求
router.put('/requests/:id/reject', auth, async (req, res) => {
  try {
    const requestId = req.params.id;
    const userId = req.user.id;

    // 查找好友请求
    const friendRequest = await FriendRequest.findById(requestId);

    if (!friendRequest) {
      return sendError(ERROR_CODES.FRIEND_REQUEST_NOT_FOUND, res);
    }

    // 验证是否是接收者
    if (friendRequest.receiver.toString() !== userId) {
      return sendError(ERROR_CODES.NOT_AUTHORIZED, res);
    }

    // 检查请求状态
    if (friendRequest.status !== 'pending') {
      return sendError(ERROR_CODES.REQUEST_ALREADY_PROCESSED, res);
    }

    // 更新请求状态
    friendRequest.status = 'rejected';
    friendRequest.updatedAt = Date.now();
    await friendRequest.save();

    logger.info(`User ${userId} rejected friend request from ${friendRequest.sender}`);
    sendSuccess(res, { friendRequest }, '好友请求已拒绝');
  } catch (err) {
    logger.error('Error rejecting friend request:', err);
    sendError(ERROR_CODES.INTERNAL_ERROR, res);
  }
});

module.exports = router;