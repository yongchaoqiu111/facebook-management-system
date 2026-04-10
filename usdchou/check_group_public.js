const mongoose = require('mongoose');
const Group = require('./models/Group');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  const group = await Group.findById('69d4ac8de8e03b8ae3397bb7');
  
  console.log('=== 红包接龙群信息 ===');
  console.log('群组ID:', group._id);
  console.log('群组名称:', group.name);
  console.log('是否公开:', group.isPublic);
  console.log('是否接龙群:', group.settings?.isChainRedPacket);
  console.log('成员数量:', group.memberCount);
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
