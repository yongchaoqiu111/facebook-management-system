const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  const RedPacket = require('./models/RedPacket');
  const User = require('./models/User');
  
  console.log('='.repeat(60));
  console.log('检查接龙红包记录');
  console.log('='.repeat(60));
  
  const chainRedPackets = await RedPacket.find({ isChainRedPacket: true })
    .sort({ createdAt: -1 })
    .limit(10);
  
  console.log(`\n共找到 ${chainRedPackets.length} 个接龙红包\n`);
  
  for (const rp of chainRedPackets) {
    const sender = await User.findById(rp.sender);
    console.log(`红包ID: ${rp._id}`);
    console.log(`  发送者: ${sender ? sender.username : '未知'}`);
    console.log(`  总金额: ${rp.totalAmount} USDT`);
    console.log(`  数量: ${rp.count}个`);
    console.log(`  已抢: ${rp.openedCount}个`);
    console.log(`  群组: ${rp.chainGroupId}`);
    console.log(`  创建时间: ${rp.createdAt}`);
    console.log('');
  }
  
  console.log('='.repeat(60));
  process.exit();
});
