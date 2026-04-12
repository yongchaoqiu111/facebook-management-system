const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  _id: {
    type: String,  // 🔥 7位纯数字群组ID
    required: true
  },
  name: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  owner: {
    type: String,  // 🔥 用户ID（8位纯数字）
    ref: 'User',
    required: true
  },
  admins: [{
    type: String,  // 🔥 用户ID（8位纯数字）
    ref: 'User'
  }],
  members: [{
    userId: {
      type: String,  // 🔥 用户ID（8位纯数字）
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    // 接龙群特有字段
    ticketPaid: {
      type: Boolean,
      default: false
    },
    firstRedPacketSent: {
      type: Boolean,
      default: false
    },
    firstRedPacketId: {
      type: String,  // 🔥 红包ID（11位纯数字）
      ref: 'RedPacket'
    },
    canGrabAfter: {
      type: Date
    },
    totalReceived: {
      type: Number,
      default: 0
    },
    kickedOut: {
      type: Boolean,
      default: false
    },
    kickReason: {
      type: String
    },
    kickedAt: {
      type: Date
    }
  }],
  memberCount: {
    type: Number,
    default: 1
  },
  maxMembers: {
    type: Number,
    default: 500
  },
  settings: {
    allowMemberInvite: {
      type: Boolean,
      default: true
    },
    allowMemberPost: {
      type: Boolean,
      default: true
    },
    needApproval: {
      type: Boolean,
      default: false
    },
    // 接龙群配置
    isChainRedPacket: {
      type: Boolean,
      default: false
    },
    ticketAmount: {
      type: Number,
      default: 10
    },
    firstRedPacketAmount: {
      type: Number,
      default: 300
    },
    redPacketCount: {
      type: Number,
      default: 30
    },
    redPacketPerAmount: {
      type: Number,
      default: 10
    },
    kickThreshold: {
      type: Number,
      default: 380
    },
    waitHours: {
      type: Number,
      default: 3
    }
  },
  isPublic: {
    type: Boolean,
    default: false,  // 是否为公共群（所有用户可见且自动加入）
    index: true
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

module.exports = mongoose.model('Group', groupSchema);