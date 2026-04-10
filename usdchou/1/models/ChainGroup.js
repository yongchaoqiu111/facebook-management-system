const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  nickname: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: ''
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  totalReceived: {
    type: Number,
    default: 0
  },
  kicked: {
    type: Boolean,
    default: false
  },
  lastPacketAt: {
    type: Date
  }
});

const ChainGroupSchema = new mongoose.Schema({
  groupId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [memberSchema],
  settings: {
    entryFee: {
      type: Number,
      default: 100
    },
    firstPacketAmount: {
      type: Number,
      default: 280
    },
    kickThreshold: {
      type: Number,
      default: 380
    }
  },
  status: {
    type: String,
    enum: ['active', 'closed'],
    default: 'active'
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

module.exports = mongoose.model('ChainGroup', ChainGroupSchema);