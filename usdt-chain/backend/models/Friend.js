const mongoose = require('mongoose');

const friendSchema = new mongoose.Schema({
  user1: {
    type: String,  // 🔥 用户ID（8位纯数字）
    ref: 'User',
    required: true
  },
  user2: {
    type: String,  // 🔥 用户ID（8位纯数字）
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'blocked'],
    default: 'pending'
  },
  // 备注名
  remark: {
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

// 确保好友关系唯一性
friendSchema.index({ user1: 1, user2: 1 }, { unique: true });

module.exports = mongoose.model('Friend', friendSchema);