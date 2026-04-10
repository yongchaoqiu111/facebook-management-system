const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/usdchou').then(async () => {
  const liuheSettlementService = require('./services/liuheSettlementService');
  
  console.log('='.repeat(60));
  console.log('手动触发六合彩结算');
  console.log('='.repeat(60));
  
  try {
    // 调用结算服务
    await liuheSettlementService.checkAndSettle();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ 结算完成！');
    console.log('请检查:');
    console.log('1. 投注单状态是否从 pending 变成 won/lost');
    console.log('2. 中奖用户余额是否增加');
    console.log('3. 红包状态是否变成 settled');
    console.log('4. 账单页面是否正确显示');
    console.log('='.repeat(60));
    
  } catch (err) {
    console.error('❌ 结算失败:', err);
  }
  
  process.exit();
});
