const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  const User = require('./models/User');
  const Group = require('./models/Group');
  
  console.log('='.repeat(60));
  console.log('查找所有用户');
  console.log('='.repeat(60));
  
  const users = await User.find().select('username _id').limit(10);
  
  console.log('\n用户列表:');
  users.forEach((u, i) => {
    console.log(`${i+1}. ${u.username} - ${u._id}`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('接龙群成员状态');
  console.log('='.repeat(60));
  
  const groups = await Group.find({'settings.isChainRedPacket': true});
  
  for (const group of groups) {
    console.log(`\n群: ${group.name} (${group.members.length}人)`);
    group.members.forEach((m, i) => {
      console.log(`  ${i+1}. ${m.userId} - ${m.role}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  process.exit();
});
