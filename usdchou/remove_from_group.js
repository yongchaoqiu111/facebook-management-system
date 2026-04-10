const mongoose = require('mongoose');
const Group = require('./models/Group');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  const userId = '69d4b0dd082c65cf20f260c8';
  const groupId = '69d4ac8de8e03b8ae3397bb7';
  
  const group = await Group.findById(groupId);
  
  console.log('=== 修改前 ===');
  console.log('成员数量:', group.memberCount);
  console.log('是否在成员列表中:', group.members.some(m => m.userId.toString() === userId));
  
  // 从members数组中移除该用户
  group.members = group.members.filter(m => m.userId.toString() !== userId);
  group.memberCount = group.members.length;
  
  await group.save();
  
  console.log('\n=== 修改后 ===');
  console.log('成员数量:', group.memberCount);
  console.log('是否在成员列表中:', group.members.some(m => m.userId.toString() === userId));
  
  console.log('\n✅ 已从群组成员列表中移除！前端刷新后会显示 isJoined: false');
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
