const mongoose = require('mongoose');
const RedPacket = require('./models/RedPacket');
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const Group = require('./models/Group');
require('dotenv').config();

async function sendTestRedPackets() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/usdchou');
    console.log('✅ 已连接数据库');

    const groupId = '69d5079bcf8db40373d27864';
    const group = await Group.findById(groupId);
    
    if (!group) {
      console.error('❌ 群组不存在');
      process.exit(1);
    }
    
    console.log(`📱 群组: ${group.name}`);

    // 获取群主作为发送者
    const sender = await User.findById(group.owner);
    if (!sender) {
      console.error('❌ 群主不存在');
      process.exit(1);
    }

    console.log(`👤 发送者: ${sender.username} (余额: ${sender.balance} USDT)`);

    // 发送3个测试红包
    for (let i = 1; i <= 3; i++) {
      const totalAmount = 50;
      const count = 10;
      const perAmount = totalAmount / count;
      const amounts = Array(count).fill(perAmount);

      // 扣除余额
      sender.balance -= totalAmount;
      
      const redPacket = new RedPacket({
        sender: sender._id,
        type: 'normal',
        totalAmount,
        count,
        message: `测试红包 #${i}`,
        roomId: groupId,
        amounts,
        isChainRedPacket: false
      });

      await redPacket.save();
      await sender.save();

      // 记录交易
      const transaction = new Transaction({
        userId: sender._id,
        type: 'redPacketSend',
        amount: totalAmount,
        status: 'completed'
      });
      await transaction.save();

      console.log(`✅ 红包 #${i} 发送成功: ${totalAmount} USDT / ${count}个`);
    }

    console.log(`\n💰 发送者剩余余额: ${sender.balance} USDT`);
    console.log('\n🎉 测试完成！已发送3个红包到群组');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ 错误:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

sendTestRedPackets();
