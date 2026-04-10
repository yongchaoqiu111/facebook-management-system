const mongoose = require('mongoose');
const User = require('./models/User');
const Group = require('./models/Group');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  const user = await User.findOne({ userId: '100584' });
  const group = await Group.findById('69d4ac8de8e03b8ae3397bb7');
  
  console.log('=== 修复前 ===');
  console.log('当前余额:', user.balance);
  
  // 恢复余额到10000
  user.balance = 10000;
  await user.save();
  
  // 从群组中移除该成员
  group.members = group.members.filter(m => m.userId.toString() !== user._id.toString());
  group.memberCount = group.members.length;
  await group.save();
  
  console.log('\n=== 修复后 ===');
  console.log('余额已恢复:', user.balance);
  console.log('已从群组移除');
  console.log('群组成员数:', group.memberCount);
  
  console.log('\n✅ 修复完成！可以重新尝试加入接龙群了');
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
