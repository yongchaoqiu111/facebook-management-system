const express = require('express');
const { check, validationResult } = require('express-validator');
const auth = require('../middlewares/auth');
const Group = require('../models/Group');
const logger = require('../config/logger');

const router = express.Router();

// 创建接龙群
router.post('/', auth, [
  check('name', 'Group name is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description, ticketAmount, firstRedPacketAmount, kickThreshold, waitHours } = req.body;
  const userId = req.user.id;

  try {
    const IdGenerator = require('../services/idGenerator');
    
    // 生成群组ID
    const groupId = await IdGenerator.generateGroupId();
    
    const group = new Group({
      _id: groupId.toString(),
      name,
      description: description || '',
      owner: userId,
      isPublic: true,  // 🔥 个人创建的接龙群默认为公开
      members: [
        {
          userId,
          role: 'owner',
          joinedAt: new Date(),
          ticketPaid: true,
          firstRedPacketSent: false,
          totalReceived: 0,
          kickedOut: false
        }
      ],
      memberCount: 1,
      settings: {
        allowMemberInvite: true,
        allowMemberPost: true,
        needApproval: false,
        isChainRedPacket: true,
        ticketAmount: ticketAmount || 10,
        firstRedPacketAmount: firstRedPacketAmount || 300,
        redPacketCount: 30,
        redPacketPerAmount: 10,
        kickThreshold: kickThreshold || 380,
        waitHours: waitHours || 3
      }
    });

    await group.save();
    await group.populate('owner', 'username avatar');

    logger.info(`User ${userId} created chain group "${name}"`);
    res.json({ msg: 'Chain group created successfully', group });
  } catch (err) {
    logger.error('Error creating chain group:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// 获取接龙群列表
router.get('/list', auth, async (req, res) => {
  try {
    const groups = await Group.find({
      'settings.isChainRedPacket': true
    }).populate('owner', 'username avatar')
      .sort({ createdAt: 'desc' });

    res.json({
      msg: 'Success',
      data: groups
    });
  } catch (err) {
    logger.error('Error getting chain groups:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
