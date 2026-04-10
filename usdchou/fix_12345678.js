const mongoose = require('mongoose');
const Group = require('./models/Group');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  const userId = '69d658d7cb4369f44d6918bd'; // 12345678用户
  const groupId = '69d4ac8de8e03b8ae3397bb7';
  
  const group = await Group.findById(groupId);
  
  console.log('=== 修改前 ===');
  const member = group.members.find(m => m.userId.toString() === userId);
  if (member) {
    console.log('ticketPaid:', member.ticketPaid);
  } else {
    console.log('用户不在成员列表中');
  }
  
  // 如果用户在成员列表中，修改ticketPaid
  if (member) {
    member.ticketPaid = false;
    await group.save();
    console.log('\n=== 修改后 ===');
    console.log('ticketPaid:', member.ticketPaid);
    console.log('\n✅ 完成！');
  } else {
    console.log('\n❌ 用户不在成员列表中，无法修改');
  }
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
