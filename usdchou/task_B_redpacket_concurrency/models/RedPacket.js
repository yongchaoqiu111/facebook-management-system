const mongoose = require('mongoose');

const redPacketSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['normal', 'chain'],
    default: 'normal'
  },
  totalAmount: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
    min: 0
  },
  count: {
    type: Number,
    required: true,
    min: 1
  },
  remainCount: {
    type: Number,
    required: true,
    min: 0
  },
  remainAmount: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
    min: 0
  },
  totalClaimed: {
    type: mongoose.Schema.Types.Decimal128,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'finished', 'expired', 'exceeded'],
    default: 'active'
  },
  message: {
    type: String,
    default: ''
  },
  roomId: {
    type: String,
    required: true
  },
  amounts: [{
    type: mongoose.Schema.Types.Decimal128
  }],
  isChainRedPacket: {
    type: Boolean,
    default: false
  },
  chainGroupId: {
    type: String
  },
  claims: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    amount: mongoose.Schema.Types.Decimal128,
    claimedAt: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiredAt: {
    type: Date
  }
});

module.exports = mongoose.model('RedPacket', redPacketSchema);