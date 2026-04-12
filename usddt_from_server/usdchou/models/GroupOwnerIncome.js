const mongoose = require('mongoose');

const groupOwnerIncomeSchema = new mongoose.Schema({
  // 群主
  owner: {
    type: String,  // 🔥 8位纯数字用户ID
    ref: 'User',
    required: true,
    index: true
  },
  
  // 群组
  group: {
    type: String,  // 🔥 7位纯数字群组ID
    ref: 'Group',
    required: true,
    index: true
  },
  
  // 进群的成员
  member: {
    type: String,  // 🔥 8位纯数字用户ID
    ref: 'User',
    required: true
  },
  
  // 门票金额
  ticketAmount: {
    type: Number,
    required: true
  },
  
  // 群主分成（50%）
  ownerShare: {
    type: Number,
    required: true
  },
  
  // 平台分成（50%）
  platformShare: {
    type: Number,
    required: true
  },
  
  // 分成比例
  shareRatio: {
    type: Number,
    default: 0.5  // 50%
  },
  
  // 状态
  status: {
    type: String,
    enum: ['pending', 'paid', 'withdrawn'],
    default: 'pending'
  },
  
  // 支付时间
  paidAt: {
    type: Date
  },
  
  // 提现时间
  withdrawnAt: {
    type: Date
  },
  
  // 交易ID（关联到Transaction）
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  
  // 备注
  note: {
    type: String
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 索引
groupOwnerIncomeSchema.index({ owner: 1, status: 1 });
groupOwnerIncomeSchema.index({ group: 1, createdAt: -1 });
groupOwnerIncomeSchema.index({ createdAt: -1 });

module.exports = mongoose.model('GroupOwnerIncome', groupOwnerIncomeSchema);
