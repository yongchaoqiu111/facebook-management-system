const express = require('express');
const { check, validationResult } = require('express-validator');
const auth = require('../middlewares/auth');
const Message = require('../models/Message');
const User = require('../models/User');
const messageCache = require('../services/messageCache');
const logger = require('../config/logger');

const router = express.Router();

router.get('/:receiverId', auth, async (req, res) => {
  try {
    const { receiverId } = req.params;
    
    let messages = await messageCache.getMessages(req.user.id, receiverId);
    
    if (messages.length === 0) {
      messages = await Message.find({
        $or: [
          { sender: req.user.id, receiver: receiverId },
          { sender: receiverId, receiver: req.user.id }
        ]
      }).sort({ createdAt: 'asc' }).populate('sender receiver', 'username avatar');
    }

    // 🚀 将对方发送的未读消息标记为已读
    await Message.updateMany(
      {
        sender: receiverId,
        receiver: req.user.id,
        read: false
      },
      {
        $set: { read: true }
      }
    );

    res.json(messages);
  } catch (err) {
    logger.error('Error getting messages:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', auth, [
  check('receiver', 'Receiver is required').not().isEmpty(),
  check('content', 'Content is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { receiver, content, type, redPacket } = req.body;

  try {
    const message = new Message({
      sender: req.user.id,
      receiver,
      content,
      type: type || 'text',
      redPacket: redPacket || null
    });

    await messageCache.addMessage(message.toObject());

    res.json(message);
  } catch (err) {
    logger.error('Error sending message:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ msg: 'Message not found' });
    }

    if (message.sender.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    await Message.findByIdAndRemove(req.params.id);

    res.json({ msg: 'Message removed' });
  } catch (err) {
    logger.error('Error deleting message:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;