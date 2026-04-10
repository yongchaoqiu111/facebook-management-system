const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Group = require('./models/Group');
const User = require('./models/User');
const IdGenerator = require('./services/idGenerator');

dotenv.config();

async function setupVirtualOwner() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/usdchou', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ 数据库连接成功\n');

    // 使用固定的虚拟群主ID（从10000000开始，避免与正常注册用户冲突）
    const virtualOwnerId = '10000000';
    console.log(`虚拟群主ID: ${virtualOwnerId}`);

    let virtualOwner = await User.findById(virtualOwnerId.toString());
    
    if (!virtualOwner) {
      virtualOwner = new User({
        _id: virtualOwnerId.toString(),
        userId: virtualOwnerId.toString(),
        username: `群主_${virtualOwnerId}`,
        phone: `${virtualOwnerId}`, // 虚拟手机号
        password: 'dummy_password_hash', // 虚拟密码
        balance: 999999, // 巨额余额
        avatar: '👑',
        createdAt: new Date()
      });
      await virtualOwner.save();
      console.log(`✅ 创建虚拟群主: ${virtualOwner.username} (ID: ${virtualOwnerId})`);
    } else {
      console.log(`✅ 虚拟群主已存在: ${virtualOwner.username}`);
    }

    // 更新接龙群的群主
    const group = await Group.findById('1000002');
    console.log(`\n当前群主: ${group.owner}`);
    
    group.owner = virtualOwnerId.toString();
    
    // 移除 10000001
    group.members = group.members.filter(m => m.userId !== '10000001');
    
    // 添加虚拟群主为 owner
    const isOwnerMember = group.members.some(m => m.userId === virtualOwnerId.toString());
    if (!isOwnerMember) {
      group.members.unshift({
        userId: virtualOwnerId.toString(),
        role: 'owner',
        joinedAt: new Date(),
        ticketPaid: true,
        firstRedPacketSent: false
      });
    } else {
      // 如果已存在，更新角色
      const ownerMember = group.members.find(m => m.userId === virtualOwnerId.toString());
      ownerMember.role = 'owner';
    }
    
    group.memberCount = group.members.length;
    await group.save();
    
    console.log(`✅ 群主已更新为: ${virtualOwnerId}`);
    console.log(`✅ 已移除用户 10000001`);
    console.log(`\n当前成员数: ${group.members.length}`);
    console.log('成员列表:');
    group.members.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.userId} (${m.role})`);
    });

    process.exit(0);
  } catch (err) {
    console.error('❌ 错误:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

setupVirtualOwner();
