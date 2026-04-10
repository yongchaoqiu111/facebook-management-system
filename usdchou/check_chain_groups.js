const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  const Group = require('./models/Group');
  
  const groups = await Group.find({'settings.isChainRedPacket': true});
  
  console.log('接龙群列表:');
  console.log('='.repeat(50));
  
  groups.forEach((g, i) => {
    console.log(`${i+1}. 群ID: ${g._id}`);
    console.log(`   群名: ${g.name}`);
    console.log(`   成员数: ${g.members.length}`);
    console.log(`   配置:`);
    console.log(`     - 门票: ${g.settings.ticketAmount} USDT`);
    console.log(`     - 首包: ${g.settings.firstRedPacketAmount} USDT`);
    console.log(`     - 红包数: ${g.settings.redPacketCount}个`);
    console.log(`     - 每个: ${g.settings.redPacketPerAmount} USDT`);
    console.log(`     - 踢出阈值: ${g.settings.kickThreshold} USDT`);
    console.log(`     - 等待时间: ${g.settings.waitHours}小时`);
    console.log('');
  });
  
  process.exit();
});
