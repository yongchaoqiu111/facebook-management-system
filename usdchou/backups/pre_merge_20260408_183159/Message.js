const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
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
    type: mongoose.Schema.Types.ObjectId,
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