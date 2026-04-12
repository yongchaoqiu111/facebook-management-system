const express = require('express');
const auth = require('../middlewares/auth');
const GroupAnnouncement = require('../models/GroupAnnouncement');
const lotteryDataService = require('../services/lotteryDataService');
const logger = require('../config/logger');

const router = express.Router();

// ==================== 获取最新开奖结果 ====================
router.get('/latest', async (req, res) => {
  try {
    const result = await lotteryDataService.getLatestResult();
    
    if (!result) {
      return res.status(500).json({ error: '获取开奖数据失败' });
    }

    res.json({
      success: true,
      data: result,
      formatted: lotteryDataService.formatResult(result)
    });
  } catch (err) {
    logger.error('Error getting latest lottery:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== 发布开奖结果到群组（置顶消息）====================
router.post('/announce', auth, async (req, res) => {
  try {
    const { groupId } = req.body;
    
    if (!groupId) {
      return res.status(400).json({ error: '群组ID必填' });
    }

    // 获取最新开奖结果
    const result = await lotteryDataService.getLatestResult();
    
    if (!result) {
      return res.status(500).json({ error: '获取开奖数据失败' });
    }

    // 格式化消息内容
    const content = lotteryDataService.formatResult(result);

    // 删除旧的开奖公告（如果有）
    await GroupAnnouncement.deleteMany({
      groupId,
      type: 'lottery'
    });

    // 创建新的置顶公告
    const announcement = new GroupAnnouncement({
      groupId,
      content,
      type: 'lottery',
      publisher: req.user.id,
      isPinned: true,
      extraData: {
        period: result.period,
        numbers: result.numbers,
        firstNumber: result.firstNumber,
        openTime: result.openTime
      }
    });

    await announcement.save();

    logger.info(`Lottery result announced to group ${groupId}: Period ${result.period}`);

    res.json({
      success: true,
      data: announcement,
      message: '开奖结果已发布'
    });
  } catch (err) {
    logger.error('Error announcing lottery:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== 获取群组置顶消息 ====================
router.get('/group/:groupId/pinned', async (req, res) => {
  try {
    const announcements = await GroupAnnouncement.find({
      groupId: req.params.groupId,
      isPinned: true
    })
    .populate('publisher', 'username avatar')
    .sort({ createdAt: 'desc' });

    res.json({
      success: true,
      data: announcements
    });
  } catch (err) {
    logger.error('Error getting pinned announcements:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
