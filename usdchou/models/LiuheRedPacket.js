const mongoose = require('mongoose');

const liuheRedPacketSchema = new mongoose.Schema({
  // 做庄者信息
  banker: {
    type: String,  // 🔥 8位纯数字用户ID
    ref: 'User',
    required: true
  },
  
  // 红包基本信息
  prizePool: {
    type: Number,
    required: true,
    min: 490  // 最小奖池 490 USDT
  },
  
  // 关联的群组或聊天
  groupId: {
    type: String,
    required: true
  },
  
  // 状态
  status: {
    type: String,
    enum: ['open', 'closed', 'settled', 'refunded'],
    default: 'open'
    // open: 投注中
    // closed: 已截止，等待开奖
    // settled: 已结算
    // refunded: 已退款（无人参与）
  },
  
  // 投注截止时间
  bettingDeadline: {
    type: Date,
    required: true
  },
  
  // 开奖期号（从外部API获取）
  lotteryPeriod: {
    type: String,
    default: ''
  },
  
  // 开奖号码
  winningNumbers: [{
    type: Number,
    min: 1,
    max: 49
  }],
  
  // 统计信息
  totalBets: {
    type: Number,
    default: 0  // 总投注人数
  },
  
  totalBetAmount: {
    type: Number,
    default: 0  // 总投注金额
  },
  
  // 每个号码的投注总额（用于风控）
  betsByNumber: {
    type: Map,
    of: Number,
    default: {}
    // 格式: { "1": 100, "2": 210, ... }
  },
  
  // 结算信息
  totalPayout: {
    type: Number,
    default: 0  // 总赔付金额
  },
  
  platformCommission: {
    type: Number,
    default: 0  // 平台抽成总额
  },
  
  bankerProfit: {
    type: Number,
    default: 0  // 庄家利润
  },
  
  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  settledAt: {
    type: Date
  }
});

// 索引
liuheRedPacketSchema.index({ status: 1 });
liuheRedPacketSchema.index({ bettingDeadline: 1 });
liuheRedPacketSchema.index({ groupId: 1 });

module.exports = mongoose.model('LiuheRedPacket', liuheRedPacketSchema);
