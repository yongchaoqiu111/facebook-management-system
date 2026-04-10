const mongoose = require('mongoose');
require('dotenv').config();

async function checkGroupMembership() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/usdchou', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ 已连接到 MongoDB\n');
    
    const Group = require('./models/Group');
    const User = require('./models/User');
    
    // 查找用户 10000001
    const user = await User.findOne({ userId: '10000001' });
    if (!user) {
      console.log('❌ 用户 10000001 不存在');
      await mongoose.disconnect();
      return;
    }
    
    console.log('👤 用户信息:');
    console.log(`   userId: ${user.userId}`);
    console.log(`   username: ${user.username}`);
    console.log(`   balance: ${user.balance}\n`);
    
    // 查找所有接龙群
    const chainGroups = await Group.find({ 
      'settings.isChainRedPacket': true 
    });
    
    console.log(`📦 找到 ${chainGroups.length} 个接龙群:\n`);
    
    for (const group of chainGroups) {
      console.log(`群组: ${group.name} (ID: ${group._id})`);
      console.log(`   isPublic: ${group.isPublic}`);
      
      // 检查用户是否在成员列表中
      const member = group.members.find(m => {
        const memberId = m.user ? m.user.toString() : (m.userId ? m.userId.toString() : null);
        return memberId === user._id.toString();
      });
      
      if (member) {
        console.log(`   ✅ 是群成员`);
        console.log(`   - joinedAt: ${member.joinedAt}`);
        console.log(`   - canGrabAfter: ${member.canGrabAfter || '无限制'}`);
        console.log(`   - totalReceived: ${member.totalReceived || 0}`);
      } else {
        console.log(`   ❌ 不是群成员（已被踢出或未加入）`);
      }
      console.log('');
    }
    
    await mongoose.disconnect();
    console.log('🔌 已断开数据库连接');
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

checkGroupMembership();
