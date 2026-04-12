const mongoose = require('mongoose');

const groupAnnouncementSchema = new mongoose.Schema({
  // 关联的群组
  groupId: {
    type: String,
    required: true,
    index: true
  },
  
  // 消息内容
  content: {
    type: String,
    required: true
  },
  
  // 消息类型
  type: {
    type: String,
    enum: ['text', 'lottery', 'system'],
    default: 'text'
    // text: 普通文本
    // lottery: 开奖结果
    // system: 系统通知
  },
  
  // 发布者
  publisher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // 是否置顶
  isPinned: {
    type: Boolean,
    default: true
  },
  
  // 过期时间（null表示永久）
  expireAt: {
    type: Date,
    default: null
  },
  
  // 额外数据（用于存储结构化信息，如开奖号码）
  extraData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
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

// 索引
groupAnnouncementSchema.index({ groupId: 1, isPinned: 1 });
groupAnnouncementSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('GroupAnnouncement', groupAnnouncementSchema);
