const mongoose = require('mongoose');
const Group = require('./models/Group');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  const userId = '69d4b0dd082c65cf20f260c8'; // 用户100584的ObjectId
  
  console.log('=== 检查用户是否在群组中 ===\n');
  
  // 检查用户已加入的所有群
  const joinedGroups = await Group.find({
    'members.userId': userId
  }).select('_id name settings members');
  
  console.log('用户已加入的群组数量:', joinedGroups.length);
  joinedGroups.forEach((group, i) => {
    console.log(`${i+1}. ${group.name} (ID: ${group._id})`);
    console.log(`   是否接龙群: ${group.settings?.isChainRedPacket}`);
    
    const member = group.members.find(m => m.userId.toString() === userId);
    if (member) {
      console.log(`   成员状态: 已加入`);
      console.log(`   已付门票: ${member.ticketPaid}`);
      console.log(`   已发首包: ${member.firstRedPacketSent}`);
    }
    console.log('');
  });
  
  // 特别检查"红包接龙"群
  const hongbaoGroup = await Group.findOne({ name: '红包接龙' });
  if (hongbaoGroup) {
    console.log('=== 红包接龙群详情 ===');
    console.log('群组ID:', hongbaoGroup._id);
    console.log('是否公开:', hongbaoGroup.isPublic);
    console.log('成员数量:', hongbaoGroup.memberCount);
    
    const member = hongbaoGroup.members.find(m => m.userId.toString() === userId);
    if (member) {
      console.log('❌ 用户仍在群成员列表中');
      console.log('   需要手动移除');
    } else {
      console.log('✅ 用户不在群成员列表中');
    }
  }
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
