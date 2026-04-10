const mongoose = require('mongoose');

const redPacketSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true
  },
  senderId: {
    type: String,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  totalCount: {
    type: Number,
    required: true
  },
  claimedCount: {
    type: Number,
    default: 0
  },
  claimedAmount: {
    type: Number,
    default: 0
  },
  isChainRedPacket: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'completed'],
    default: 'active'
  },
  expiredAt: {
    type: Date
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

module.exports = mongoose.model('RedPacket', redPacketSchema);