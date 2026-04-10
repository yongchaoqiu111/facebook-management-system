const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  const RedPacket = require('./models/RedPacket');
  
  // 查找所有红包
  const packets = await RedPacket.find()
    .select('_id roomId sender totalAmount count createdAt')
    .sort({ createdAt: -1 })
    .limit(5);
  
  console.log('最近的红包:');
  packets.forEach(p => {
    console.log(`_id: ${p._id}`);
    console.log(`  roomId: ${p.roomId}`);
    console.log(`  amount: ${p.totalAmount}`);
    console.log(`  count: ${p.count}`);
    console.log('---');
  });
  
  mongoose.disconnect();
}).catch(err => {
  console.error('错误:', err.message);
  process.exit(1);
});
