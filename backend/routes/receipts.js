const express = require('express');
const auth = require('../middlewares/auth');
const MessageReceipt = require('../models/MessageReceipt');
const Message = require('../models/Message');
const GroupMessage = require('../models/GroupMessage');
const logger = require('../config/logger');

const router = express.Router();

// 标记消息为已送达
router.post('/delivered', auth, async (req, res) => {
  try {
    const { messageId, messageType } = req.body;
    const userId = req.user.id;

    let receipt = await MessageReceipt.findOne({ messageId });

    if (!receipt) {
      return res.status(404).json({ msg: 'Message receipt not found' });
    }

    // 查找或创建用户的回执记录
    const userReceipt = receipt.receipts.find(r => r.userId.toString() === userId);
    
    if (userReceipt) {
      userReceipt.deliveredAt = new Date();
    } else {
      receipt.receipts.push({
        userId,
        deliveredAt: new Date(),
        isRead: false
      });
    }

    receipt.updatedAt = Date.now();
    await receipt.save();

    logger.info(`Message ${messageId} marked as delivered to user ${userId}`);
    res.json({ msg: 'Message marked as delivered', receipt });
  } catch (err) {
    logger.error('Error marking message as delivered:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// 标记消息为已读
router.post('/read', auth, async (req, res) => {
  try {
    const { messageId, messageType } = req.body;
    const userId = req.user.id;

    let receipt = await MessageReceipt.findOne({ 
      messageId,
      messageType 
    });

    if (!receipt) {
      // 如果回执不存在，创建一个新的
      const message = await Message.findById(messageId) || await GroupMessage.findById(messageId);
      
      if (!message) {
        return res.status(404).json({ msg: 'Message not found' });
      }

      receipt = new MessageReceipt({
        messageId,
        messageType,
        senderId: message.sender,
        receiverId: message.receiver || null,
        groupId: message.groupId || null,
        receipts: [{
          userId,
          deliveredAt: new Date(),
          readAt: new Date(),
          isRead: true
        }]
      });
    } else {
      // 更新现有回执
      const userReceipt = receipt.receipts.find(r => r.userId.toString() === userId);
      
      if (userReceipt) {
        userReceipt.readAt = new Date();
        userReceipt.isRead = true;
      } else {
        receipt.receipts.push({
          userId,
          deliveredAt: new Date(),
          readAt: new Date(),
          isRead: true
        });
      }
    }

    receipt.updatedAt = Date.now();
    await receipt.save();

    logger.info(`Message ${messageId} marked as read by user ${userId}`);
    res.json({ msg: 'Message marked as read', receipt });
  } catch (err) {
    logger.error('Error marking message as read:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// 获取消息的已读状态
router.get('/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { messageType } = req.query;

    const receipt = await MessageReceipt.findOne({ 
      messageId,
      messageType 
    }).populate('receipts.userId', 'username avatar');

    if (!receipt) {
      return res.status(404).json({ msg: 'Message receipt not found' });
    }

    logger.info(`User ${req.user.id} fetched receipt for message ${messageId}`);
    res.json(receipt);
  } catch (err) {
    logger.error('Error getting message receipt:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// 批量标记消息为已读
router.post('/batch-read', auth, async (req, res) => {
  try {
    const { messages } = req.body; // [{ messageId, messageType }]
    const userId = req.user.id;

    const results = [];

    for (const { messageId, messageType } of messages) {
      try {
        let receipt = await MessageReceipt.findOne({ messageId, messageType });

        if (!receipt) {
          continue;
        }

        const userReceipt = receipt.receipts.find(r => r.userId.toString() === userId);
        
        if (userReceipt) {
          userReceipt.readAt = new Date();
          userReceipt.isRead = true;
        } else {
          receipt.receipts.push({
            userId,
            deliveredAt: new Date(),
            readAt: new Date(),
            isRead: true
          });
        }

        receipt.updatedAt = Date.now();
        await receipt.save();

        results.push({ messageId, status: 'marked_as_read' });
      } catch (err) {
        logger.error(`Error processing message ${messageId}:`, err);
      }
    }

    logger.info(`User ${userId} batch marked ${results.length} messages as read`);
    res.json({ msg: 'Messages marked as read', results });
  } catch (err) {
    logger.error('Error in batch read:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
