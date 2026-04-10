const mongoose = require('mongoose');
const User = require('./models/User');
const Group = require('./models/Group');
const RedPacket = require('./models/RedPacket');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  const userCount = await User.countDocuments();
  const groupCount = await Group.countDocuments();
  const redPacketCount = await RedPacket.countDocuments();
  
  console.log('=== 数据库统计 ===');
  console.log('用户数量:', userCount);
  console.log('群组数量:', groupCount);
  console.log('红包数量:', redPacketCount);
  
  if (userCount > 0) {
    const users = await User.find().select('userId username balance').limit(5);
    console.log('\n前5个用户:');
    users.forEach(u => {
      console.log(`  - ID: ${u.userId}, 用户名: ${u.username}, 余额: ${u.balance}`);
    });
  }
  
  if (groupCount > 0) {
    const groups = await Group.find().select('name members');
    console.log('\n群组列表:');
    groups.forEach(g => {
      console.log(`  - ${g.name} (${g.members.length} 人)`);
    });
  }
  
  process.exit();
}).catch(err => {
  console.error('错误:', err);
  process.exit(1);
});
