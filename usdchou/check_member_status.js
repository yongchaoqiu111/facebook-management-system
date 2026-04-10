const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Group = require('./models/Group');

dotenv.config();

async function checkMemberStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/usdchou', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ 数据库连接成功\n');

    const group = await Group.findById('1000002');
    
    console.log('群组名称:', group.name);
    console.log('成员列表:\n');
    
    group.members.forEach((member, index) => {
      console.log(`${index + 1}. 用户ID: ${member.userId}`);
      console.log(`   角色: ${member.role}`);
      console.log(`   已付门票: ${member.ticketPaid ? '是' : '否'}`);
      console.log(`   已发首包: ${member.firstRedPacketSent ? '是' : '否'}`);
      console.log(`   被踢出: ${member.kickedOut ? '是' : '否'}`);
      console.log(`   累计领取: ${member.totalReceived} USDT`);
      if (member.canGrabAfter) {
        console.log(`   可领取时间: ${member.canGrabAfter}`);
      }
      console.log('');
    });

    process.exit(0);
  } catch (err) {
    console.error('❌ 错误:', err.message);
    process.exit(1);
  }
}

checkMemberStatus();
