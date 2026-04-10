const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  const LiuheRedPacket = require('./models/LiuheRedPacket');
  const LiuheBet = require('./models/LiuheBet');
  
  console.log('='.repeat(60));
  console.log('检查待结算的六合红包');
  console.log('='.repeat(60));
  
  // 查找所有open状态的红包
  const openPackets = await LiuheRedPacket.find({ status: 'open' });
  
  console.log(`\n找到 ${openPackets.length} 个未结算的红包\n`);
  
  for (const packet of openPackets) {
    console.log(`红包ID: ${packet._id}`);
    console.log(`  奖池: ${packet.prizePool} USDT`);
    console.log(`  投注截止: ${packet.bettingDeadline}`);
    console.log(`  是否已过期: ${new Date() > packet.bettingDeadline ? '✅ 是' : '❌ 否'}`);
    
    // 统计投注
    const bets = await LiuheBet.find({ redPacket: packet._id });
    console.log(`  投注数: ${bets.length}`);
    console.log(`  状态分布:`);
    
    const statusCount = { pending: 0, won: 0, lost: 0 };
    bets.forEach(b => statusCount[b.status]++);
    console.log(`    - pending: ${statusCount.pending}`);
    console.log(`    - won: ${statusCount.won}`);
    console.log(`    - lost: ${statusCount.lost}`);
    console.log('');
  }
  
  console.log('='.repeat(60));
  process.exit();
});
