const mongoose = require('mongoose');

const groupMessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'file', 'redpacket', 'system'],
    default: 'text'
  },
  // 文件信息（如果是文件类型）
  fileUrl: {
    type: String,
    default: ''
  },
  fileName: {
    type: String,
    default: ''
  },
  fileSize: {
    type: Number,
    default: 0
  },
  // 红包ID（如果是红包消息）
  redPacketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RedPacket',
    default: null
  },
  // 已读状态
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  // 回复消息
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GroupMessage',
    default: null
  },
  // @提及的用户
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 索引优化查询性能
groupMessageSchema.index({ groupId: 1, createdAt: -1 });
groupMessageSchema.index({ sender: 1 });
groupMessageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('GroupMessage', groupMessageSchema);
