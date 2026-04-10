const mongoose = require('mongoose');
const User = require('./models/User');
const Transaction = require('./models/Transaction');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  const user = await User.findOne({ userId: '100584' });
  
  console.log('=== 用户信息 ===');
  console.log('用户ID:', user.userId);
  console.log('用户名:', user.username);
  console.log('当前余额:', user.balance);
  
  console.log('\n=== 最近交易记录 ===');
  const transactions = await Transaction.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .limit(5);
    
  transactions.forEach((t, i) => {
    console.log(`${i+1}. 类型: ${t.type}`);
    console.log(`   金额: ${t.amount}`);
    console.log(`   状态: ${t.status}`);
    console.log(`   时间: ${t.createdAt}`);
    console.log(`   备注: ${t.note}`);
    console.log('');
  });
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
