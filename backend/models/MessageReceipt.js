const mongoose = require('mongoose');

const messageReceiptSchema = new mongoose.Schema({
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  // 消息类型（private 或 group）
  messageType: {
    type: String,
    enum: ['private', 'group'],
    required: true
  },
  // 发送者
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // 接收者（私聊）或群组ID（群聊）
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  },
  // 已读记录
  receipts: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // 送达时间
    deliveredAt: {
      type: Date,
      default: null
    },
    // 已读时间
    readAt: {
      type: Date,
      default: null
    },
    // 是否已读
    isRead: {
      type: Boolean,
      default: false
    }
  }],
  // 统计信息
  stats: {
    totalReceivers: {
      type: Number,
      default: 0
    },
    deliveredCount: {
      type: Number,
      default: 0
    },
    readCount: {
      type: Number,
      default: 0
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

// 复合索引优化查询
messageReceiptSchema.index({ messageId: 1, messageType: 1 });
messageReceiptSchema.index({ senderId: 1, createdAt: -1 });
messageReceiptSchema.index({ 'receipts.userId': 1 });

// 更新统计信息的中间件
messageReceiptSchema.pre('save', function(next) {
  if (this.receipts && this.receipts.length > 0) {
    this.stats.totalReceivers = this.receipts.length;
    this.stats.deliveredCount = this.receipts.filter(r => r.deliveredAt).length;
    this.stats.readCount = this.receipts.filter(r => r.isRead).length;
  }
  next();
});

module.exports = mongoose.model('MessageReceipt', messageReceiptSchema);
