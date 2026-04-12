const mongoose = require('mongoose');

const friendRequestSchema = new mongoose.Schema({
  sender: {
    type: String,  // 🔥 用户ID（8位纯数字）
    ref: 'User',
    required: true
  },
  receiver: {
    type: String,  // 🔥 用户ID（8位纯数字）
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  message: {
    type: String,
    default: ''
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

// 防止重复好友请求
friendRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });

module.exports = mongoose.model('FriendRequest', friendRequestSchema);