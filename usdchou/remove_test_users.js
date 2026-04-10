const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Group = require('./models/Group');

dotenv.config();

async function removeUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/usdchou');
    
    const group = await Group.findById('1000002');
    group.members = group.members.filter(m => m.userId !== '10000001' && m.userId !== '10000002');
    group.memberCount = group.members.length;
    await group.save();
    
    console.log('✅ 已移除 10000001 和 10000002');
    console.log(`当前成员数: ${group.members.length}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ 错误:', err.message);
    process.exit(1);
  }
}

removeUsers();
