const mongoose = require('mongoose');
const User = require('./models/User');
const Group = require('./models/Group');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  console.log('=== 开始创建测试数据 ===\n');

  // 1. 创建测试用户
  console.log('1. 创建测试用户...');
  
  const userA = await User.findOneAndUpdate(
    { userId: '12345678' },
    {
      userId: '12345678',
      username: '测试用户A',
      password: '$2a$10$YourHashedPasswordHere',
      phone: '13800138001',
      depositAddress: 'TTestAddressA123456789012345678',
      balance: 100000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    { upsert: true, new: true }
  );
  console.log(`   ✅ 用户A: ID=${userA.userId}, 用户名=${userA.username}, 余额=${userA.balance}`);

  const userB = await User.findOneAndUpdate(
    { userId: '64262782' },
    {
      userId: '64262782',
      username: '测试用户B',
      password: '$2a$10$YourHashedPasswordHere',
      phone: '13800138002',
      depositAddress: 'TTestAddressB123456789012345678',
      balance: 60000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    { upsert: true, new: true }
  );
  console.log(`   ✅ 用户B: ID=${userB.userId}, 用户名=${userB.username}, 余额=${userB.balance}`);

  // 2. 创建"六合天下"群组
  console.log('\n2. 创建六合天下群组...');
  
  let group = await Group.findOne({ name: '六合天下' });
  
  if (!group) {
    group = new Group({
      name: '六合天下',
      type: 'public',
      description: '六合彩红包专属群组',
      members: [
        { userId: userA._id, role: 'member', joinedAt: new Date() },
        { userId: userB._id, role: 'member', joinedAt: new Date() }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await group.save();
    console.log(`   ✅ 群组创建成功: ${group.name} (${group.members.length} 人)`);
  } else {
    // 如果群组已存在，确保两个用户都在里面
    const memberIds = group.members.map(m => m.userId.toString());
    if (!memberIds.includes(userA._id.toString())) {
      group.members.push({ userId: userA._id, role: 'member', joinedAt: new Date() });
    }
    if (!memberIds.includes(userB._id.toString())) {
      group.members.push({ userId: userB._id, role: 'member', joinedAt: new Date() });
    }
    await group.save();
    console.log(`   ✅ 群组已存在，已添加成员: ${group.name} (${group.members.length} 人)`);
  }

  console.log('\n=== 测试数据创建完成 ===');
  console.log(`群组ID: ${group._id}`);
  console.log('\n现在可以刷新前端页面进行测试了！');
  
  process.exit();
}).catch(err => {
  console.error('错误:', err);
  process.exit(1);
});
