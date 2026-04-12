const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  _id: {
    type: String,  // 🔥 8位纯数字用户ID
    required: true
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  // 用户唯一标识符（纯数字，用于好友搜索，类似QQ号）
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    match: /^[0-9]+$/  // 纯数字，不限长度
  },
  phone: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: ''
  },
  balance: {
    type: Number,
    default: 0
  },
  // TRON 充值地址（平台为用户生成，用户只能充值到这个地址）
  depositAddress: {
    type: String,
    sparse: true,   // sparse: true 表示只索引非 null/undefined 值
    unique: true
  },
  // 充值地址的私钥（平台保管，加密存储）
  depositPrivateKey: {
    type: String,
    default: '',
    select: false  // 默认不查询，保护私钥安全
  },
  // TRON 提现地址（用户自己提供的外部钱包地址）
  withdrawAddress: {
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

module.exports = mongoose.model('User', userSchema);