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
    const groups = await Group.find({
      'members.userId': user._id,
      'settings.isChainRedPacket': true
    });
    
    console.log(`\n用户所在的接龙群数量: ${groups.length}`);
    
    groups.forEach((group, index) => {
      console.log(`\n接龙群 ${index + 1}:`);
      console.log(`  群名称: ${group.name}`);
      console.log(`  群ID: ${group._id}`);
      
      // 查找用户在群中的信息
      const member = group.members.find(m => m.userId.toString() === user._id.toString());
      if (member) {
        console.log(`  用户累计领取金额: ${member.totalReceived}`);
        console.log(`  是否被踢出: ${member.kickedOut}`);
        console.log(`  踢出原因: ${member.kickReason || '无'}`);
        console.log(`  可领取时间: ${member.canGrabAfter ? new Date(member.canGrabAfter) : '无'}`);
      }
    });
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB connection closed');
  }
}).catch(err => {
  console.error('MongoDB connection failed:', err);
});
