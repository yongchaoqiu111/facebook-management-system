const mongoose = require('mongoose');
const User = require('./models/User');
const Transaction = require('./models/Transaction');

mongoose.connect('mongodb://localhost:27017/usdchou', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');
  
  try {
    // 查找用户100585
    const user = await User.findOne({ userId: '100585' });
    if (!user) {
      console.log('用户未找到');
      mongoose.disconnect();
      return;
    }
    
    console.log(`用户信息: ${user.username} (userId: ${user.userId})`);
    console.log(`当前余额: ${user.balance}`);
    
    // 查找用户的交易记录
    const transactions = await Transaction.find({
      userId: user._id
    }).sort({ createdAt: -1 });
    
    console.log(`\n交易记录数量: ${transactions.length}`);
    
    let runningBalance = user.balance;
    
    console.log('\n交易历史（按时间倒序）:');
    console.log('时间\t\t\t类型\t\t金额\t余额变化');
    console.log('-------------------------------------------------------------');
    
    transactions.forEach((tx, index) => {
      let change = 0;
      if (tx.type.includes('Receive') || tx.type.includes('Recharge')) {
        change = tx.amount;
        runningBalance -= tx.amount;
      } else {
        change = -tx.amount;
        runningBalance += tx.amount;
      }
      
      const time = new Date(tx.createdAt).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      console.log(`${time}\t${tx.type}\t\t${change > 0 ? '+' : ''}${change}\t${runningBalance}`);
    });
    
    console.log('-------------------------------------------------------------');
    console.log('初始余额估算:', runningBalance);
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB connection closed');
  }
}).catch(err => {
  console.error('MongoDB connection failed:', err);
});
