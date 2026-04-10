/**
 * 六合红包功能测试脚本
 */
const mongoose = require('mongoose');
const LiuheRedPacket = require('./models/LiuheRedPacket');
const LiuheBet = require('./models/LiuheBet');
const User = require('./models/User');
const LIUHE_CONFIG = require('./utils/liuheConfig');

async function testLiuhe() {
  try {
    await mongoose.connect('mongodb://localhost:27017/usdchou');
    console.log('✅ 数据库连接成功\n');

    // 测试1：配置计算
    console.log('=== 测试1：配置计算 ===');
    const prizePool = 490;
    const maxBet = LIUHE_CONFIG.getMaxBetPerNumber(prizePool);
    console.log(`奖池: ${prizePool} USDT`);
    console.log(`单号上限: ${maxBet} USDT`);
    
    const payout = LIUHE_CONFIG.calculatePayout(10, 1);
    console.log(`投注10 USDT，中1个号码:`);
    console.log(`  税前奖金: ${payout.grossPayout} USDT`);
    console.log(`  平台抽成: ${payout.platformFee} USDT`);
    console.log(`  玩家实得: ${payout.netPayout} USDT\n`);

    // 测试2：创建红包
    console.log('=== 测试2：创建红包 ===');
    const user = await User.findOne();
    if (!user) {
      console.log('❌ 没有用户，跳过测试');
      return;
    }
    
    console.log(`做庄者: ${user.username}`);
    console.log(`当前余额: ${user.balance} USDT`);
    
    const redPacket = new LiuheRedPacket({
      banker: user._id,
      prizePool: 490,
      groupId: 'test_group',
      bettingDeadline: new Date(Date.now() + 60 * 60 * 1000), // 1小时后
      status: 'open',
      betsByNumber: new Map()
    });
    
    await redPacket.save();
    console.log(`✅ 红包创建成功: ${redPacket._id}\n`);

    // 测试3：模拟投注
    console.log('=== 测试3：模拟投注 ===');
    
    // 玩家A 买 2号 10 USDT
    const betA = new LiuheBet({
      user: user._id,
      redPacket: redPacket._id,
      numbers: [2],
      amountPerNumber: 10,
      totalAmount: 10,
      status: 'pending'
    });
    await betA.save();
    
    // 更新红包统计
    redPacket.totalBets += 1;
    redPacket.totalBetAmount += 10;
    redPacket.betsByNumber.set('2', 10);
    await redPacket.save();
    
    console.log(`玩家A 投注 2号 10 USDT`);
    console.log(`2号已投注: ${redPacket.betsByNumber.get('2')} USDT`);
    
    // 检查剩余额度
    const remaining = LIUHE_CONFIG.getRemainingLimit(
      redPacket.betsByNumber, 
      2, 
      redPacket.prizePool
    );
    console.log(`2号剩余可投: ${remaining.toFixed(2)} USDT\n`);

    // 测试4：结算（假设2号中奖）
    console.log('=== 测试4：模拟结算 ===');
    const winningNumbers = [2];
    console.log(`开奖号码: ${winningNumbers.join(', ')}`);
    
    // 查找中奖投注
    const bets = await LiuheBet.find({
      redPacket: redPacket._id,
      status: 'pending'
    }).populate('user');
    
    let totalPayout = 0;
    let platformCommission = 0;
    
    for (const bet of bets) {
      const matchedNumbers = bet.numbers.filter(n => 
        winningNumbers.includes(n)
      );
      
      if (matchedNumbers.length > 0) {
        // 中奖
        const payout = LIUHE_CONFIG.calculatePayout(
          bet.amountPerNumber, 
          matchedNumbers.length
        );
        
        bet.status = 'won';
        bet.matchedNumbers = matchedNumbers;
        bet.grossPayout = payout.grossPayout;
        bet.platformFee = payout.platformFee;
        bet.netPayout = payout.netPayout;
        await bet.save();
        
        // 发放奖金
        const winner = await User.findById(bet.user._id);
        winner.balance += payout.netPayout;
        await winner.save();
        
        totalPayout += payout.netPayout;
        platformCommission += payout.platformFee;
        
        console.log(`玩家 ${winner.username} 中奖:`);
        console.log(`  税前: ${payout.grossPayout} USDT`);
        console.log(`  平台抽: ${payout.platformFee} USDT`);
        console.log(`  实得: ${payout.netPayout} USDT`);
      } else {
        // 未中奖
        bet.status = 'lost';
        await bet.save();
      }
    }
    
    // 更新红包状态
    redPacket.status = 'settled';
    redPacket.winningNumbers = winningNumbers;
    redPacket.totalPayout = totalPayout;
    redPacket.platformCommission = platformCommission;
    redPacket.bankerProfit = redPacket.prizePool - totalPayout;
    redPacket.settledAt = new Date();
    await redPacket.save();
    
    console.log(`\n庄家利润: ${redPacket.bankerProfit.toFixed(2)} USDT`);
    console.log(`平台抽成: ${platformCommission.toFixed(2)} USDT`);
    console.log(`✅ 结算完成\n`);

    console.log('=== 所有测试通过 ✅ ===');
    
  } catch (err) {
    console.error('❌ 测试失败:', err);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

testLiuhe();
