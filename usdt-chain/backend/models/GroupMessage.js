const mongoose = require('mongoose');

const groupMessageSchema = new mongoose.Schema({
  _id: {
    type: String,  // 🔥 12位纯数字消息ID
    required: true
  },
  sender: {
    type: String,  // 🔥 用户ID（8位纯数字）
    ref: 'User',
    required: true
  },
  groupId: {
    type: String,  // 🔥 群组ID（7位纯数字）
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
    type: String,  // 🔥 红包ID（11位纯数字）
    ref: 'RedPacket',
    default: null
  },
  // 已读状态
  readBy: [{
    userId: {
      type: String,  // 🔥 用户ID（8位纯数字）
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  // 回复消息
  replyTo: {
    type: String,  // 🔥 消息ID（12位纯数字）
    ref: 'GroupMessage',
    default: null
  },
  // @提及的用户
  mentions: [{
    type: String,  // 🔥 用户ID（8位纯数字）
    ref: 'User'
  }],
  // 客户端消息ID（用于去重）
  clientMsgId: {
    type: String,
    sparse: true,
    unique: true
  },
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
