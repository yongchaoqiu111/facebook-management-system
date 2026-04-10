const mongoose = require('mongoose');
const User = require('./models/User');
const Group = require('./models/Group');

mongoose.connect('mongodb://localhost:27017/usdchou', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');
  
  try {
    // 查找用户100585
    const user = await User.findOne({ userId: '100585' });
    if (!user) {
      console.log('用户未找到');
      mongoose.disconnect();
      return;
    }
    
    console.log(`用户信息: ${user.username} (userId: ${user.userId})`);
    console.log(`当前余额: ${user.balance}`);
    
    // 查找用户所在的接龙群
    const group = await Group.findOne({
      'members.userId': user._id,
      'settings.isChainRedPacket': true
    });
    
    if (!group) {
      console.log('用户不在接龙群中');
      mongoose.disconnect();
      return;
    }
    
    console.log(`\n接龙群信息:`);
    console.log(`  群名称: ${group.name}`);
    console.log(`  群ID: ${group._id}`);
    
    // 查找用户在群中的信息
    const member = group.members.find(m => m.userId.toString() === user._id.toString());
    if (member) {
      console.log(`\n用户在群中的状态:`);
      console.log(`  是否被踢出: ${member.kickedOut}`);
      console.log(`  踢出原因: ${member.kickReason || '无'}`);
      console.log(`  累计领取金额: ${member.totalReceived}`);
      console.log(`  可领取时间: ${member.canGrabAfter ? new Date(member.canGrabAfter) : '无'}`);
      console.log(`  门票是否已付: ${member.ticketPaid}`);
      console.log(`  是否发送首包: ${member.firstRedPacketSent}`);
      console.log(`  加入时间: ${new Date(member.joinedAt)}`);
      
      // 检查冷却时间
      const now = new Date();
      if (member.canGrabAfter && now < member.canGrabAfter) {
        const waitSeconds = Math.ceil((member.canGrabAfter - now) / 1000);
        console.log(`\n⚠️ 冷却时间还剩: ${waitSeconds}秒`);
      } else {
        console.log(`\n✅ 可以抢红包`);
      }
    }
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB connection closed');
  }
}).catch(err => {
  console.error('MongoDB connection failed:', err);
});
