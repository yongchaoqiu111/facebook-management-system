const express = require('express');
const { check, validationResult } = require('express-validator');
const auth = require('../middlewares/auth');
const LiuheRedPacket = require('../models/LiuheRedPacket');
const LiuheBet = require('../models/LiuheBet');
const User = require('../models/User');
const Group = require('../models/Group');
const LIUHE_CONFIG = require('../utils/liuheConfig');
const logger = require('../config/logger');

// 🎯 六合红包专用群组名称（六合天下）
const LIUHE_GROUP_NAME = '六合天下';

const router = express.Router();

// ==================== 做庄发红包 ====================
router.post('/create', auth, [
  check('prizePool', '奖池金额必填').isFloat({ min: LIUHE_CONFIG.minPrizePool }),
  check('groupId', '群组ID必填').not().isEmpty(),
  check('bettingDuration', '投注时长必填（分钟）').isInt({ min: 5, max: 1440 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { prizePool, groupId, bettingDuration } = req.body;
  const userId = req.user.id;

  try {
    // 1. 验证群组（六合红包只能在"六合天下"群发）
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(400).json({ error: '群组不存在' });
    }
    
    if (group.name !== LIUHE_GROUP_NAME) {
      return res.status(400).json({ 
        error: `六合红包只能在「${LIUHE_GROUP_NAME}」群发送`,
        allowedGroup: {
          _id: group._id,
          name: LIUHE_GROUP_NAME
        }
      });
    }

    // 2. 检查用户余额
    const user = await User.findById(userId);
    if (user.balance < prizePool) {
      return res.status(400).json({ error: '余额不足' });
    }

    // 2. 计算投注截止时间
    const bettingDeadline = new Date(Date.now() + bettingDuration * 60 * 1000);

    // 3. 扣款
    user.balance -= prizePool;
    await user.save();

    // 4. 创建红包
    const redPacket = new LiuheRedPacket({
      banker: userId,
      prizePool,
      groupId,
      bettingDeadline,
      status: 'open',
      betsByNumber: new Map()
    });

    await redPacket.save();

    logger.info(`User ${userId} created liuhe red packet ${redPacket._id}, pool: ${prizePool}`);

    // 5. 📡 通过Socket推送到群组（先 populate banker 信息）
    try {
      const io = global.socketService ? global.socketService.getIO() : null;
      if (io) {
        // 重新查询并填充 banker 信息
        const populatedRedPacket = await LiuheRedPacket.findById(redPacket._id)
          .populate('banker', 'userId username avatar');
        
        // 推送到群组房间
        io.to(`group:${groupId}`).emit('newLiuheRedPacket', {
          success: true,
          data: populatedRedPacket,
          message: '六合红包创建成功'
        });
        
        logger.info(`Liuhe red packet ${redPacket._id} pushed to group ${groupId}`);
      }
    } catch (err) {
      logger.error('Error pushing liuhe red packet to socket:', err);
    }

    res.json({
      success: true,
      data: redPacket,
      message: '六合红包创建成功'
    });
  } catch (err) {
    logger.error('Error creating liuhe red packet:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== 玩家投注 ====================
router.post('/:id/bet', auth, [
  check('numbers', '号码必填').isArray({ min: 1 }),
  check('amountPerNumber', '每个号码投注金额必填').isFloat({ min: LIUHE_CONFIG.minBetPerNumber })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { numbers, amountPerNumber } = req.body;
  const redPacketId = req.params.id;
  const userId = req.user.id;

  try {
    // 1. 获取红包
    const redPacket = await LiuheRedPacket.findById(redPacketId);
    if (!redPacket) {
      return res.status(404).json({ error: '红包不存在' });
    }

    // 2. 验证投注
    try {
      LIUHE_CONFIG.validateBet(redPacket, numbers, amountPerNumber);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    // 3. 检查用户余额
    const user = await User.findById(userId);
    const totalAmount = numbers.length * amountPerNumber;
    
    if (user.balance < totalAmount) {
      return res.status(400).json({ error: '余额不足' });
    }

    // 4. 扣款
    user.balance -= totalAmount;
    await user.save();

    // 5. 创建投注记录
    const bet = new LiuheBet({
      user: userId,
      redPacket: redPacketId,
      numbers,
      amountPerNumber,
      totalAmount,
      status: 'pending'
    });

    await bet.save();

    // 6. 更新红包统计
    redPacket.totalBets += 1;
    redPacket.totalBetAmount += totalAmount;
    
    // 更新每个号码的投注总额
    for (const num of numbers) {
      const currentBet = redPacket.betsByNumber.get(String(num)) || 0;
      redPacket.betsByNumber.set(String(num), currentBet + amountPerNumber);
    }
    
    await redPacket.save();

    logger.info(`User ${userId} placed bet on red packet ${redPacketId}: ${numbers.join(',')}`);

    res.json({
      success: true,
      data: bet,
      message: '投注成功'
    });
  } catch (err) {
    logger.error('Error placing bet:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== 获取群组内的红包列表 ====================
router.get('/group/:groupId', auth, async (req, res) => {
  try {
    const redPackets = await LiuheRedPacket.find({
      groupId: req.params.groupId
    })
    .populate('banker', 'username avatar userId')
    .sort({ createdAt: 'desc' });

    res.json({
      success: true,
      data: redPackets
    });
  } catch (err) {
    logger.error('Error getting group red packets:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== 获取号码剩余额度 ====================
router.get('/:id/limits', auth, async (req, res) => {
  try {
    const redPacket = await LiuheRedPacket.findById(req.params.id);
    
    if (!redPacket) {
      return res.status(404).json({ error: '红包不存在' });
    }

    const limits = {};
    const maxBet = LIUHE_CONFIG.getMaxBetPerNumber(redPacket.prizePool);
    
    // 计算每个号码的剩余额度
    for (let i = 1; i <= 49; i++) {
      const currentBet = redPacket.betsByNumber.get(String(i)) || 0;
      limits[i] = Math.max(0, maxBet - currentBet);
    }

    res.json(limits);
  } catch (err) {
    logger.error('Error getting limits:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== 📊 个人账单 ====================
router.get('/my-bills', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. 作为庄家的红包记录
    const bankerRecords = await LiuheRedPacket.find({ banker: userId })
      .populate('banker', 'userId username avatar')
      .sort({ createdAt: -1 })
      .lean();

    // 为每个红包获取投注明细
    for (let record of bankerRecords) {
      // 获取该红包的所有投注
      const bets = await LiuheBet.find({ redPacket: record._id })
        .populate('user', 'userId username avatar')
        .lean();
      
      // 计算总投注金额
      const totalBetAmount = bets.reduce((sum, bet) => sum + bet.totalAmount, 0);
      
      // 统计每个号码的投注情况
      const betsByNumber = {};
      bets.forEach(bet => {
        bet.numbers.forEach(num => {
          if (!betsByNumber[num]) {
            betsByNumber[num] = {
              number: num,
              totalBet: 0,
              betCount: 0,
              bettors: []
            };
          }
          betsByNumber[num].totalBet += bet.amountPerNumber;
          betsByNumber[num].betCount += 1;
          betsByNumber[num].bettors.push({
            userId: bet.user.userId,
            username: bet.user.username,
            amount: bet.amountPerNumber
          });
        });
      });
      
      // 计算盈亏
      const totalPayout = bets
        .filter(b => b.status === 'won')
        .reduce((sum, b) => sum + (b.grossPayout || 0), 0);
      const profit = record.prizePool - totalPayout;
      
      // 添加详细信息到记录
      record.betsSummary = {
        totalBets: bets.length,
        totalBetAmount,
        uniqueNumbers: Object.keys(betsByNumber).length,
        betsByNumber,
        totalPayout,
        profit
      };
      
      // 添加投注列表（简化版，只显示用户和金额）
      record.betList = bets.map(bet => ({
        _id: bet._id,
        user: {
          userId: bet.user.userId,
          username: bet.user.username
        },
        numbers: bet.numbers,
        amountPerNumber: bet.amountPerNumber,
        totalAmount: bet.totalAmount,
        status: bet.status,
        createdAt: bet.createdAt
      }));
    }

    // 2. 作为玩家的投注记录
    const betRecords = await LiuheBet.find({ user: userId })
      .populate('redPacket', 'prizePool groupId status lotteryPeriod winningNumbers createdAt')
      .populate('user', 'userId username avatar')
      .sort({ createdAt: -1 })
      .lean();

    // 3. 统计数据
    const stats = {
      // 庄家统计
      bankerStats: {
        totalPackets: bankerRecords.length,
        totalPrizePool: bankerRecords.reduce((sum, r) => sum + r.prizePool, 0),
        openPackets: bankerRecords.filter(r => r.status === 'open').length,
        settledPackets: bankerRecords.filter(r => r.status === 'settled').length,
        refundedPackets: bankerRecords.filter(r => r.status === 'refunded').length,
        totalProfit: bankerRecords
          .filter(r => r.status === 'settled')
          .reduce((sum, r) => sum + (r.bankerProfit || 0), 0)
      },
      
      // 玩家统计
      playerStats: {
        totalBets: betRecords.length,
        totalBetAmount: betRecords.reduce((sum, b) => sum + b.totalAmount, 0),
        wonBets: betRecords.filter(b => b.status === 'won').length,
        lostBets: betRecords.filter(b => b.status === 'lost').length,
        pendingBets: betRecords.filter(b => b.status === 'pending').length,
        totalWon: betRecords
          .filter(b => b.status === 'won')
          .reduce((sum, b) => sum + (b.netPayout || 0), 0),
        totalLost: betRecords
          .filter(b => b.status === 'lost')
          .reduce((sum, b) => sum + b.totalAmount, 0)
      }
    };

    res.json({
      success: true,
      data: {
        stats,
        bankerRecords,
        betRecords
      }
    });
  } catch (err) {
    logger.error('Error getting bills:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== 获取红包详情 ====================
router.get('/:id', auth, async (req, res) => {
  try {
    const redPacket = await LiuheRedPacket.findById(req.params.id)
      .populate('banker', 'username avatar userId');
    
    if (!redPacket) {
      return res.status(404).json({ error: '红包不存在' });
    }

    // 获取当前用户的投注
    const userBet = await LiuheBet.findOne({
      redPacket: redPacket._id,
      user: req.user.id
    });

    res.json({
      success: true,
      data: {
        redPacket,
        userBet
      }
    });
  } catch (err) {
    logger.error('Error getting red packet:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
