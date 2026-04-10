const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Message = require('../models/Message');
const GroupMessage = require('../models/GroupMessage');
const auditClient = require('../services/auditClient');

router.post('/send', async (req, res) => {
  try {
    const { userId, receiverId, groupId, type = 'text', content } = req.body;
    
    if (!userId || !content || (!receiverId && !groupId)) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    let message;
    const filteredContent = content.trim();
    
    if (groupId) {
      message = new GroupMessage({
        groupId,
        sender: userId,
        content: filteredContent,
        type
      });
    } else {
      message = new Message({
        sender: userId,
        receiver: receiverId,
        content: filteredContent,
        type
      });
    }
    
    await message.save();
    
    setImmediate(() => {
      auditClient.log({
        type: 'message:send',
        userId: userId,
        groupId: groupId || null,
        receiverId: receiverId || null,
        messageType: type,
        contentHash: crypto.createHash('sha256').update(filteredContent).digest('hex'),
        timestamp: Date.now()
      });
    });
    
    res.json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;