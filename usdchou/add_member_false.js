const mongoose = require('mongoose');
const Group = require('./models/Group');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  const userId = '69d4b0dd082c65cf20f260c8';
  const groupId = '69d4ac8de8e03b8ae3397bb7';
  
  const group = await Group.findById(groupId);
  
  // 添加成员记录，ticketPaid=false
  group.members.push({
    userId: userId,
    role: 'member',
    joinedAt: new Date(),
    ticketPaid: false,
    firstRedPacketSent: false,
    totalReceived: 0,
    kickedOut: false
  });
  group.memberCount = group.members.length;
  
  await group.save();
  
  console.log('✅ 完成！ticketPaid=false');
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
