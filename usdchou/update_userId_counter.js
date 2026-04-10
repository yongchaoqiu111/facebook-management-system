const mongoose = require('mongoose');
require('dotenv').config();

async function updateCounter() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/usdchou');
    console.log('✅ 已连接数据库');

    // 设置计数器为 100580，这样下一个用户ID就是 100581
    const result = await mongoose.connection.db.collection('counters').updateOne(
      {_id: 'userId'}, 
      {$set: {seq: 100580}}, 
      {upsert: true}
    );
    
    console.log('✅ 计数器更新成功');
    
    const counter = await mongoose.connection.db.collection('counters').findOne({_id: 'userId'});
    console.log('当前计数器值:', counter.seq);
    console.log('下一个用户ID将是:', counter.seq + 1);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ 错误:', err.message);
    process.exit(1);
  }
}

updateCounter();
