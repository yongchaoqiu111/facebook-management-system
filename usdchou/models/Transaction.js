const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: String,  // 🔥 用户ID（8位纯数字）
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['recharge', 'withdraw', 'redPacketSend', 'redPacketReceive', 'chainGroupJoin', 'chainRedPacketReceive'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  txId: {
    type: String,
    default: ''
  },
  walletAddress: {
    type: String,
    default: ''
  },
  fee: {
    type: Number,
    default: 0
  },
  note: {
    type: String,
    default: ''
  },
  groupId: {
    type: String,  // 🔥 群组ID（7位纯数字）
    ref: 'Group'
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

module.exports = mongoose.model('Transaction', transactionSchema);