const mongoose = require('mongoose');
const Transaction = require('./models/Transaction');

mongoose.connect('mongodb://localhost:27017/usdchou', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');
  
  try {
    // 查询用户100584的最近交易记录，特别是chainGroupJoin类型
    const transactions = await Transaction.find({ 
      userId: '69d6443c9aa38cfdc6b1ffce', // 用户100584的ID
      type: 'chainGroupJoin'
    })
      .sort({ createdAt: -1 })
      .limit(5);
    
    console.log('最近进群记录:');
    transactions.forEach(tx => {
      console.log(`  ${new Date(tx.createdAt).toLocaleString()} - ${tx.amount}元 - ${tx.note}`);
    });
    
    // 查询用户最近的红包发送记录
    const redPacketTransactions = await Transaction.find({ 
      userId: '69d6443c9aa38cfdc6b1ffce',
      type: 'redPacketSend'
    })
      .sort({ createdAt: -1 })
      .limit(5);
    
    console.log('\n最近红包发送记录:');
    redPacketTransactions.forEach(tx => {
      console.log(`  ${new Date(tx.createdAt).toLocaleString()} - ${tx.amount}元 - ${tx.note}`);
    });
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB connection closed');
  }
}).catch(err => {
  console.error('MongoDB connection failed:', err);
});
