const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Group = require('./models/Group');

dotenv.config();

async function checkGroups() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/usdchou', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ 数据库连接成功\n');

    // 查询所有群组
    const groups = await Group.find({});
    
    console.log(`找到 ${groups.length} 个群组:\n`);
    
    groups.forEach((group, index) => {
      console.log(`${index + 1}. 群组名称: ${group.name}`);
      console.log(`   _id (ObjectId): ${group._id}`);
      console.log(`   groupId (业务ID): ${group.groupId || '未设置'}`);
      console.log(`   是否接龙群: ${group.settings?.isChainRedPacket ? '是' : '否'}`);
      console.log(`   是否公开: ${group.isPublic ? '是' : '否'}`);
      console.log(`   成员数: ${group.memberCount}`);
      if (group.settings?.isChainRedPacket) {
        console.log(`   门票: ${group.settings.ticketAmount} USDT`);
        console.log(`   首包: ${group.settings.firstRedPacketAmount} USDT`);
      }
      console.log('');
    });

    process.exit(0);
  } catch (err) {
    console.error('❌ 错误:', err);
    process.exit(1);
  }
}

checkGroups();
