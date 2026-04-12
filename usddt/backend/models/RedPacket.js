const mongoose = require('mongoose');

const redPacketSchema = new mongoose.Schema({
  _id: {
    type: String,  // 🔥 11位纯数字红包ID
    required: true
  },
  sender: {
    type: String,  // 🔥 用户ID（8位纯数字）
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['lucky', 'normal'],
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  count: {
    type: Number,
    required: true
  },
  message: {
    type: String,
    default: '恭喜发财，大吉大利'
  },
  roomId: {
    type: String,
    required: true
  },
  openedCount: {
    type: Number,
    default: 0
  },
  amounts: {
    type: [Number],
    required: true
  },
  openedBy: [{
    userId: {
      type: String,  // 🔥 用户ID（8位纯数字）
      ref: 'User'
    },
    amount: Number,
    openedAt: Date
  }],
  // 接龙群红包特有字段
  isChainRedPacket: {
    type: Boolean,
    default: false
  },
  chainGroupId: {
    type: String,  // 🔥 群组ID（7位纯数字）
    ref: 'Group'
  },
  // 接龙红包累计领取金额
  totalClaimed: {
    type: Number,
    default: 0
  },
  // 红包状态
  status: {
    type: String,
    enum: ['active', 'finished', 'expired', 'exceeded'],
    default: 'active'
  },
  // 剩余数量
  remainCount: {
    type: Number,
    required: true
  },
  // 剩余金额
  remainAmount: {
    type: Number,
    required: true
  },
  // 私聊红包接收者ID
  receiverId: {
    type: String,  // 🔥 用户ID（8位纯数字）
    ref: 'User'
  },
  // 领取记录
  claims: [{
    userId: {
      type: String,  // 🔥 用户ID（8位纯数字）
      ref: 'User'
    },
    amount: Number,
    claimedAt: Date
  }],
  // 过期时间
  expiredAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('RedPacket', redPacketSchema);