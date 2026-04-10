const mongoose = require('mongoose');
const User = require('./models/User');
const Group = require('./models/Group');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  const userId = '69d4b0dd082c65cf20f260c8';
  const groupId = '69d4ac8de8e03b8ae3397bb7';
  
  const user = await User.findOne({ userId: '100584' });
  const group = await Group.findById(groupId);
  
  console.log('=== 修改前 ===');
  console.log('用户余额:', user.balance);
  
  const member = group.members.find(m => m.userId.toString() === userId);
  if (member) {
    console.log('成员状态:');
    console.log('  已付门票:', member.ticketPaid);
    console.log('  已发首包:', member.firstRedPacketSent);
    console.log('  首包红包ID:', member.firstRedPacketId);
    
    // 修改为未付费状态
    member.ticketPaid = false;
    member.firstRedPacketSent = false;
    member.firstRedPacketId = undefined;
    member.kickedOut = true;  // 标记为被踢出，这样可以重新加入
    member.kickReason = '重置测试';
    member.kickedAt = new Date();
    
    await group.save();
    
    console.log('\n=== 修改后 ===');
    console.log('成员状态:');
    console.log('  已付门票:', member.ticketPaid);
    console.log('  已发首包:', member.firstRedPacketSent);
    console.log('  是否被踢:', member.kickedOut);
    console.log('  踢出原因:', member.kickReason);
    
    console.log('\n✅ 修改完成！现在可以重新测试加入接龙群了');
  } else {
    console.log('❌ 用户不在群成员列表中');
  }
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
