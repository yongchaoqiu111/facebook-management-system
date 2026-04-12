const express = require('express');
const { check, validationResult } = require('express-validator');
const auth = require('../middlewares/auth');
const UserFriends = require('../models/UserFriends');
const User = require('../models/User');
const Message = require('../models/Message');
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
      searchCondition = { userId: keyword };
    } else {
      searchCondition = { username: { $regex: keyword, $options: 'i' } };
    }

    const users = await User.find(searchCondition)
      .select('_id userId username avatar')
      .limit(10);

    const filteredUsers = users
      .filter(user => user._id.toString() !== req.user.id)
      .map(user => ({
        _id: user._id,
        userId: user.userId || user._id.toString(),
        username: user.username,
        avatar: user.avatar
      }));

    sendSuccess(res, filteredUsers);
  } catch (err) {
    logger.error('搜索用户失败:', err);
    sendError(ERROR_CODES.INTERNAL_ERROR, res);
  }
});

// 获取好友列表 - 只返回好友ID数组
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    // 查找或创建用户好友记录
    let userFriends = await UserFriends.findOne({ userId });
    
    if (!userFriends) {
      userFriends = new UserFriends({
        userId,
        friendIds: []
      });
      await userFriends.save();
    }
    
    logger.info(`User ${userId} fetched friend list, count: ${userFriends.friendIds.length}`);
    res.json(userFriends.friendIds);
  } catch (err) {
    logger.error('Error getting friend list:', err);
    sendError(ERROR_CODES.INTERNAL_ERROR, res);
  }
});

// 添加好友 - 双向添加
// 🆕 POST /api/friends 已废弃，改用 WebSocket emit('addFriend')
router.post('/', auth, async (req, res) => {
  return sendError(ERROR_CODES.DEPRECATED_API, res, { 
    message: '请使用 WebSocket 添加好友' 
  });
});

// 🆕 DELETE /api/friends/:id 已废弃，改用 WebSocket emit('friend:remove')
router.delete('/:id', auth, async (req, res) => {
  return sendError(ERROR_CODES.DEPRECATED_API, res, { 
    message: '请使用 WebSocket 删除好友' 
  });
});

// 获取好友请求 - 简化为返回好友ID数组
router.get('/requests', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    let userFriends = await UserFriends.findOne({ userId });
    
    if (!userFriends) {
      userFriends = new UserFriends({
        userId,
        friendIds: []
      });
      await userFriends.save();
    }

    logger.info(`User ${userId} fetched friend requests`);
    res.json({
      success: true,
      data: userFriends.friendIds,
      count: userFriends.friendIds.length
    });
  } catch (err) {
    logger.error('Error getting friend requests:', err);
    sendError(ERROR_CODES.INTERNAL_ERROR, res);
  }
});

// 接受好友请求 - 已不需要，保留接口返回成功
router.put('/requests/:id/accept', auth, async (req, res) => {
  sendSuccess(res, null, '操作成功');
});

// 拒绝好友请求 - 已不需要，保留接口返回成功
router.put('/requests/:id/reject', auth, async (req, res) => {
  sendSuccess(res, null, '操作成功');
});

module.exports = router;
