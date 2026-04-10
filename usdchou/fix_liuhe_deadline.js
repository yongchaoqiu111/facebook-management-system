const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  const LiuheRedPacket = require('./models/LiuheRedPacket');
  
  console.log('='.repeat(60));
  console.log('修改红包投注截止时间为1小时前');
  console.log('='.repeat(60));
  
  // 查找所有open状态的红包
  const openPackets = await LiuheRedPacket.find({ status: 'open' });
  
  console.log(`\n找到 ${openPackets.length} 个红包\n`);
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  for (const packet of openPackets) {
    packet.bettingDeadline = oneHourAgo;
    await packet.save();
    console.log(`✅ 红包 ${packet._id} 已修改截止时间为: ${oneHourAgo}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ 所有红包的投注截止时间已改为1小时前');
  console.log('现在可以手动触发结算了');
  console.log('='.repeat(60));
  
  process.exit();
});
