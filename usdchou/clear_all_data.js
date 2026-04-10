const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  console.log('🗑️  开始清空所有数据...');
  
  // 清空所有集合
  await mongoose.connection.db.collection('users').deleteMany({});
  await mongoose.connection.db.collection('groups').deleteMany({});
  await mongoose.connection.db.collection('redpackets').deleteMany({});
  await mongoose.connection.db.collection('messages').deleteMany({});
  await mongoose.connection.db.collection('groupmessages').deleteMany({});
  await mongoose.connection.db.collection('transactions').deleteMany({});
  await mongoose.connection.db.collection('friends').deleteMany({});
  await mongoose.connection.db.collection('friendrequests').deleteMany({});
  await mongoose.connection.db.collection('counters').deleteMany({});
  
  console.log('✅ 所有数据已清空！');
  console.log('✅ ID 计数器已重置！');
  console.log('\n📝 下次注册将从标准ID开始：');
  console.log('   - 用户ID: 10000000');
  console.log('   - 群组ID: 1000000');
  console.log('   - 红包ID: 10000000000');
  
  process.exit(0);
}).catch(err => {
  console.error('❌ 错误:', err);
  process.exit(1);
});
