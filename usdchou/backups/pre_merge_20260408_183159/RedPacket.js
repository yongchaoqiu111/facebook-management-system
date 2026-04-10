const mongoose = require('mongoose');

const redPacketSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
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
      type: mongoose.Schema.Types.ObjectId,
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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('RedPacket', redPacketSchema);