const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Group = require('./models/Group');

dotenv.config();

async function cleanGroupMembers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/usdchou', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ 数据库连接成功\n');

    const group = await Group.findById('1000002');
    
    console.log('清理前成员数:', group.members.length);
    console.log('成员列表:');
    group.members.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.userId} (${m.role})`);
    });
    
    // 只保留虚拟群主 10000000
    group.members = group.members.filter(m => m.userId === '10000000');
    
    // 确保虚拟群主是 owner
    const ownerMember = group.members.find(m => m.userId === '10000000');
    if (ownerMember) {
      ownerMember.role = 'owner';
      ownerMember.ticketPaid = true;
      ownerMember.firstRedPacketSent = false;
    }
    
    group.memberCount = group.members.length;
    await group.save();
    
    console.log('\n清理后成员数:', group.members.length);
    console.log('成员列表:');
    group.members.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.userId} (${m.role})`);
    });
    
    console.log('\n✅ 清理完成！现在只有虚拟群主 10000000');

    process.exit(0);
  } catch (err) {
    console.error('❌ 错误:', err.message);
    process.exit(1);
  }
}

cleanGroupMembers();
