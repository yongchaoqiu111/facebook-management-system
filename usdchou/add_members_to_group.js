const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Group = require('./models/Group');

dotenv.config();

async function addMembers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/usdchou');
    
    const group = await Group.findById('1000002');
    
    // 添加 10000001
    if (!group.members.find(m => m.userId === '10000001')) {
      group.members.push({
        userId: '10000001',
        role: 'member',
        joinedAt: new Date(),
        ticketPaid: true,
        firstRedPacketSent: true,
        totalReceived: 0,
        kickedOut: false
      });
      group.memberCount++;
    }
    
    // 添加 10000002
    if (!group.members.find(m => m.userId === '10000002')) {
      group.members.push({
        userId: '10000002',
        role: 'member',
        joinedAt: new Date(),
        ticketPaid: true,
        firstRedPacketSent: true,
        totalReceived: 0,
        kickedOut: false
      });
      group.memberCount++;
    }
    
    await group.save();
    
    console.log('✅ 已添加 10000001 和 10000002');
    console.log(`当前成员数: ${group.members.length}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ 错误:', err.message);
    process.exit(1);
  }
}

addMembers();
