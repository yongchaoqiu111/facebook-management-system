const mongoose = require('mongoose');

const RedPacketSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => mongoose.Types.ObjectId().toString()
  },
  type: {
    type: String,
    enum: ['normal', 'chain'],
    required: true
  },
  roomId: {
    type: String,
    required: true
  },
  chainGroupId: {
    type: String,
    default: null
  },
  senderId: {
    type: String,
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  remainAmount: {
    type: Number,
    required: true
  },
  totalCount: {
    type: Number,
    required: true
  },
  remainCount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'finished', 'expired', 'exceeded'],
    default: 'active'
  },
  expiredAt: {
    type: Date,
    required: true
  },
  message: {
    type: String,
    default: '恭喜发财，大吉大利'
  },
  claims: [{
    userId: {
      type: String,
      required: true
    },
    username: {
      type: String,
      required: true
    },
    avatar: {
      type: String,
      default: ''
    },
    amount: {
      type: Number,
      required: true
    },
    claimedAt: {
      type: Date,
      default: Date.now
    }
  }],
  totalClaimed: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

RedPacketSchema.index({ roomId: 1, status: 1 });
RedPacketSchema.index({ expiredAt: 1, status: 1 });

module.exports = mongoose.model('RedPacket', RedPacketSchema);