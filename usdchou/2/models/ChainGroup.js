const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  totalReceived: {
    type: Number,
    default: 0
  },
  kicked: {
    type: Boolean,
    default: false
  },
  kickedAt: {
    type: Date,
    default: null
  }
});

const chainGroupSchema = new mongoose.Schema({
  groupId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  members: [memberSchema],
  settings: {
    kickThreshold: {
      type: Number,
      default: 380
    }
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

chainGroupSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('ChainGroup', chainGroupSchema);