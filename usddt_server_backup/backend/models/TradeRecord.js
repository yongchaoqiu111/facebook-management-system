const mongoose = require('mongoose');

const tradeRecordSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  symbol: {
    type: String,
    required: true,
    enum: ['BTC', 'ETH', 'BNB', 'SOL', 'XRP']
  },
  type: {
    type: String,
    required: true,
    enum: ['buy', 'sell']
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  timestamp: {
    type: Number,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// 索引优化查询
tradeRecordSchema.index({ userId: 1, timestamp: -1 });
tradeRecordSchema.index({ userId: 1, symbol: 1, timestamp: -1 });

module.exports = mongoose.model('TradeRecord', tradeRecordSchema);
