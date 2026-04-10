const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  const LiuheBet = require('./models/LiuheBet');
  const LiuheRedPacket = require('./models/LiuheRedPacket');
  const User = require('./models/User');
  
  console.log('='.repeat(60));
  console.log('检查最近的投注单详情');
  console.log('='.repeat(60));
  
  // 查找最近的中奖投注
  const wonBets = await LiuheBet.find({ status: 'won' })
    .populate('user', 'userId username balance')
    .populate('redPacket', 'prizePool winningNumbers')
    .sort({ createdAt: -1 })
    .limit(5);
  
  console.log(`\n找到 ${wonBets.length} 个中奖投注\n`);
  
  for (const bet of wonBets) {
    console.log(`投注ID: ${bet._id}`);
    console.log(`  用户: ${bet.user.username} (当前余额: ${bet.user.balance})`);
    console.log(`  投注号码: ${bet.numbers.join(', ')}`);
    console.log(`  每注金额: ${bet.amountPerNumber} USDT`);
    console.log(`  总投注: ${bet.totalAmount} USDT`);
    console.log(`  中奖号码: ${bet.winningNumbers?.join(', ')}`);
    console.log(`  毛收益: ${bet.grossPayout} USDT`);
    console.log(`  净收益: ${bet.netPayout} USDT`);
    console.log(`  红包奖池: ${bet.redPacket.prizePool} USDT`);
    console.log(`  开奖号码: ${bet.redPacket.winningNumbers?.join(', ')}`);
    
    // 验证计算
    const matchedCount = bet.numbers.filter(n => 
      bet.redPacket.winningNumbers.includes(parseInt(n))
    ).length;
    const expectedPayout = matchedCount * bet.amountPerNumber * 40;
    
    console.log(`  \n  验证:`);
    console.log(`    匹配号码数: ${matchedCount}`);
    console.log(`    预期奖金: ${matchedCount} × ${bet.amountPerNumber} × 40 = ${expectedPayout}`);
    console.log(`    实际奖金: ${bet.grossPayout}`);
    console.log(`    是否一致: ${expectedPayout === bet.grossPayout ? '✅' : '❌ 不一致!'}`);
    console.log('');
  }
  
  process.exit();
});
