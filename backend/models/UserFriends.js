const mongoose = require('mongoose');

const userFriendsSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true  // 添加索引加速查询
  },
  friendIds: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('UserFriends', userFriendsSchema);
