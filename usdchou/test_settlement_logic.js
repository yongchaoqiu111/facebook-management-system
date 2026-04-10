const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/usdchou').then(async () => {
  const liuheSettlementService = require('./services/liuheSettlementService');
  
  console.log('='.repeat(60));
  console.log('测试六合彩结算逻辑');
  console.log('='.repeat(60));
  
  // 测试计算函数
  const testBet = {
    numbers: [10, 22, 34, 46, 5, 12],
    amountPerNumber: 10,
    totalAmount: 60
  };
  
  const winningNumbers = [28, 8, 44, 26, 29, 46, 11];
  
  const result = liuheSettlementService.calculateBetResult(testBet, winningNumbers);
  
  console.log('\n测试用例：');
  console.log(`  投注号码: ${testBet.numbers.join(', ')}`);
  console.log(`  每注金额: ${testBet.amountPerNumber} USDT`);
  console.log(`  总投注: ${testBet.totalAmount} USDT`);
  console.log(`  开奖号码: ${winningNumbers.join(', ')}`);
  console.log(`\n结算结果:`);
  console.log(`  是否中奖: ${result.isWin ? '✅ 是' : '❌ 否'}`);
  console.log(`  匹配号码: ${result.matchedNumbers.join(', ')}`);
  console.log(`  毛收益(49倍): ${result.grossPayout} USDT`);
  console.log(`  平台抽成(1倍): ${result.platformFee} USDT`);
  console.log(`  实际到手(48倍): ${result.netPayout} USDT`);
  
  console.log('\n' + '='.repeat(60));
  console.log('预期结果：');
  console.log('  中了1个号(46)');
  console.log('  毛收益: 1 × 10 × 49 = 490 USDT');
  console.log('  平台抽成: 1 × 10 × 1 = 10 USDT');
  console.log('  实际到手: 490 - 10 = 480 USDT');
  console.log('='.repeat(60));
  
  process.exit();
});
