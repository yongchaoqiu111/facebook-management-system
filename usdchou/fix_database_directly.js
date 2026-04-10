const mongoose = require('mongoose');
const Group = require('./models/Group');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  const userId = '69d4b0dd082c65cf20f260c8';
  const groupId = '69d4ac8de8e03b8ae3397bb7';
  
  // 直接使用updateOne修改数据库
  const result = await Group.updateOne(
    { _id: groupId, 'members.userId': userId },
    {
      $set: {
        'members.$.ticketPaid': false,
        'members.$.firstRedPacketSent': false,
        'members.$.firstRedPacketId': null,
        'members.$.kickedOut': true,
        'members.$.kickReason': '手动重置测试',
        'members.$.kickedAt': new Date()
      }
    }
  );
  
  console.log('✅ 数据库修改完成');
  console.log('修改结果:', result);
  
  // 验证修改
  const group = await Group.findById(groupId);
  const member = group.members.find(m => m.userId.toString() === userId);
  
  console.log('\n=== 验证结果 ===');
  console.log('已付门票:', member.ticketPaid);
  console.log('已发首包:', member.firstRedPacketSent);
  console.log('是否被踢:', member.kickedOut);
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
