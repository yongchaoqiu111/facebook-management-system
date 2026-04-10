const mongoose = require('mongoose');
const User = require('./models/User');
const Transaction = require('./models/Transaction');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  const userId = '69d658d7cb4369f44d6918bd';
  
  const user = await User.findById(userId);
  console.log('当前余额:', user.balance);
  
  // 查询最近的交易记录
  const transactions = await Transaction.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(5);
  
  console.log('\n最近5笔交易:');
  transactions.forEach((t, i) => {
    console.log(`${i+1}. 类型: ${t.type}, 金额: ${t.amount}, 时间: ${t.createdAt}`);
  });
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
