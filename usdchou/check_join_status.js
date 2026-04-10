const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Group = require('./models/Group');
const RedPacket = require('./models/RedPacket');

dotenv.config();

async function checkStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/usdchou', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ 数据库连接成功\n');

    // 检查用户余额
    const user1 = await User.findById('10000001');
    const user2 = await User.findById('10000002');
    
    console.log('=== 用户余额 ===');
    console.log(`用户 10000001: ${user1.balance} USDT`);
    console.log(`用户 10000002: ${user2.balance} USDT`);
    console.log('');

    // 检查群组成员
    const group = await Group.findById('1000002');
    console.log('=== 接龙群成员 ===');
    console.log(`成员数: ${group.members.length}`);
    group.members.forEach((m, i) => {
      console.log(`${i + 1}. ${m.userId} (${m.role}) - 已付费: ${m.ticketPaid ? '是' : '否'}, 已发首包: ${m.firstRedPacketSent ? '是' : '否'}`);
    });
    console.log('');

    // 检查红包
    const redPackets = await RedPacket.find({ isChainRedPacket: true }).sort({ createdAt: -1 }).limit(5);
    console.log('=== 最近的接龙红包 ===');
    redPackets.forEach((rp, i) => {
      console.log(`${i + 1}. 红包ID: ${rp._id}`);
      console.log(`   发送者: ${rp.sender}`);
      console.log(`   总金额: ${rp.totalAmount} USDT`);
      console.log(`   数量: ${rp.count}`);
      console.log(`   创建时间: ${rp.createdAt}`);
      console.log('');
    });

    process.exit(0);
  } catch (err) {
    console.error('❌ 错误:', err.message);
    process.exit(1);
  }
}

checkStatus();
