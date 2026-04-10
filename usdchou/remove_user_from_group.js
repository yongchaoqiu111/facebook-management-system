const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  const Group = require('./models/Group');
  
  const groupId = '69d4ac8de8e03b8ae3397bb7';
  const userId = '69d4b0dd082c65cf20f260c8';
  
  const group = await Group.findById(groupId);
  
  console.log('移除前成员数:', group.members.length);
  
  group.members = group.members.filter(m => m.userId.toString() !== userId);
  group.memberCount = group.members.length;
  
  await group.save();
  
  console.log('移除后成员数:', group.members.length);
  console.log('✅ 已从"红包接龙"群移除，现在可以重新测试进群了');
  
  process.exit();
});
