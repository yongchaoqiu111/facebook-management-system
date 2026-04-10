const mongoose = require('mongoose');

const liuheBetSchema = new mongoose.Schema({
  // 用户信息
  user: {
    type: String,  // 🔥 8位纯数字用户ID
    ref: 'User',
    required: true
  },
  
  // 关联的红包
  redPacket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LiuheRedPacket',
    required: true
  },
  
  // 投注号码（可以选多个）
  numbers: [{
    type: Number,
    min: 1,
    max: 49,
    required: true
  }],
  
  // 每个号码的投注金额
  amountPerNumber: {
    type: Number,
    required: true,
    min: 10  // 最小10 USDT
  },
  
  // 总投注金额
  totalAmount: {
    type: Number,
    required: true
  },
  
  // 投注状态
  status: {
    type: String,
    enum: ['pending', 'won', 'lost'],
    default: 'pending'
  },
  
  // 中奖信息
  matchedNumbers: [{
    type: Number
  }],
  
  // 奖金信息
  grossPayout: {
    type: Number,
    default: 0  // 税前奖金
  },
  
  platformFee: {
    type: Number,
    default: 0  // 平台抽成
  },
  
  netPayout: {
    type: Number,
    default: 0  // 实得奖金
  },
  
  // 时间戳
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
liuheBetSchema.index({ redPacket: 1, user: 1 });
liuheBetSchema.index({ status: 1 });

module.exports = mongoose.model('LiuheBet', liuheBetSchema);
