const express = require('express');
const router = express.Router();
const ChainGroup = require('../models/ChainGroup');
const User = require('../models/User');
const chainGroupService = require('../services/chainGroupService');
const { io } = require('../app');

router.get('/chain/status/:groupId/:userId', async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    
    console.log('检查用户状态:', { groupId, userId });
    
    const result = await chainGroupService.checkUserKickedStatus(groupId, userId);
    
    console.log('用户踢出状态:', result.isKicked);
    
    if (result.isKicked) {
      return res.json({
        success: true,
        data: {
          status: 'kicked',
          totalReceived: result.totalReceived,
          kickThreshold: result.kickThreshold
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        status: 'normal'
      }
    });
  } catch (error) {
    console.error('检查用户状态错误:', error);
    res.status(500).json({
      success: false,
      message: '检查用户状态失败'
    });
  }
});

router.post('/chain/join', async (req, res) => {
  try {
    const { groupId, userId } = req.body;
    
    console.log('重新进群请求:', req.body);
    
    const result = await chainGroupService.rejoinChainGroup(groupId, userId);
    
    io.emit('chainGroupJoined', {
      groupId: result.group.groupId,
      user: {
        userId: result.user._id,
        nickname: result.user.nickname,
        avatar: result.user.avatar
      },
      timestamp: new Date()
    });
    
    res.json({
      success: true,
      data: {
        group: result.group,
        user: result.user,
        message: '重新进群成功'
      }
    });
  } catch (error) {
    console.error('重新进群错误:', error);
    res.status(500).json({
      success: false,
      message: error.message || '重新进群失败'
    });
  }
});

router.post('/chain/packet', async (req, res) => {
  try {
    const { groupId, userId, amount } = req.body;
    
    const result = await chainGroupService.distributePacket(groupId, userId, amount);
    
    io.emit('packetDistributed', {
      groupId,
      userId,
      amount,
      totalReceived: result.member.totalReceived,
      isKicked: result.isKicked
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('发放红包错误:', error);
    res.status(500).json({
      success: false,
      message: error.message || '发放红包失败'
    });
  }
});

router.post('/chain/create', async (req, res) => {
  try {
    const { groupId, name, creatorId } = req.body;
    
    const user = await User.findById(creatorId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    const newGroup = new ChainGroup({
      groupId,
      name,
      creatorId,
      members: [{
        userId: user._id,
        nickname: user.nickname,
        avatar: user.avatar
      }]
    });
    
    await newGroup.save();
    
    res.json({
      success: true,
      data: newGroup
    });
  } catch (error) {
    console.error('创建接龙群错误:', error);
    res.status(500).json({
      success: false,
      message: '创建接龙群失败'
    });
  }
});

module.exports = router;