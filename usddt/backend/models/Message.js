const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  _id: {
    type: String,  // 🔥 12位纯数字消息ID
    required: true
  },
  sender: {
    type: String,  // 🔥 用户ID（8位纯数字）
    ref: 'User',
    required: true
  },
  receiver: {
    type: String,  // 🔥 用户ID（8位纯数字）
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'redPacket'],
    default: 'text'
  },
  redPacket: {
    type: String,  // 🔥 红包ID（11位纯数字）
    ref: 'RedPacket',
    default: null
  },
  read: {
    type: Boolean,
    default: false  // 标记消息是否已读
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Message', messageSchema);