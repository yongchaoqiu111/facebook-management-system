const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Group = require('./models/Group');
const User = require('./models/User');
const RedPacket = require('./models/RedPacket');
const IdGenerator = require('./services/idGenerator');

dotenv.config();

async function testJoinChainGroup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/usdchou', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ 数据库连接成功\n');

    const groupId = '1000002';
    const userId = '10000005'; // 测试用户

    // 1. 创建测试用户（如果不存在）
    let user = await User.findById(userId);
    if (!user) {
      user = new User({
        _id: userId,
        userId: userId,
        username: `测试用户_${userId}`,
        phone: userId,
        password: 'test',
        balance: 100000,
        avatar: '🧪',
        createdAt: new Date()
      });
      await user.save();
      console.log(`✅ 创建测试用户: ${userId}`);
    }
    console.log(`用户余额: ${user.balance} USDT\n`);

    // 2. 获取群组
    const group = await Group.findById(groupId);
    console.log(`群组: ${group.name}`);
    console.log(`当前成员数: ${group.members.length}\n`);

    // 3. 检查是否已是成员
    const existingMember = group.members.find(m => m.userId.toString() === userId);
    if (existingMember && !existingMember.kickedOut) {
      console.log('❌ 用户已是成员，退出测试');
      process.exit(0);
    }

    // 4. 扣款
    const ticketAmount = group.settings.ticketAmount || 10;
    const firstPacketAmount = group.settings.firstRedPacketAmount || 300;
    const totalRequired = ticketAmount + firstPacketAmount;
    
    console.log(`需要扣除: ${totalRequired} USDT (门票${ticketAmount} + 首包${firstPacketAmount})`);
    
    if (user.balance < totalRequired) {
      console.log('❌ 余额不足');
      process.exit(1);
    }
    
    user.balance -= totalRequired;
    await user.save();
    console.log(`✅ 扣款成功，剩余余额: ${user.balance} USDT\n`);

    // 5. 创建红包
    const redPacketId = await IdGenerator.generateRedPacketId();
    const redPacketCount = group.settings.redPacketCount || 30;
    const perAmount = group.settings.redPacketPerAmount || 10;
    const amounts = Array(redPacketCount).fill(perAmount);

    const redPacket = new RedPacket({
      _id: redPacketId.toString(),
      sender: userId,
      type: 'normal',
      totalAmount: firstPacketAmount,
      count: redPacketCount,
      message: '新人首包',
      roomId: groupId,
      amounts,
      isChainRedPacket: true,
      chainGroupId: groupId,
      remainAmount: firstPacketAmount,
      remainCount: redPacketCount
    });

    await redPacket.save();
    console.log(`✅ 创建红包: ${redPacketId}\n`);

    // 6. 添加成员
    const waitSeconds = 3; // 测试模式3秒
    const canGrabAfter = new Date(Date.now() + waitSeconds * 1000);

    if (existingMember && existingMember.kickedOut) {
      existingMember.kickedOut = false;
      existingMember.kickReason = '';
      existingMember.kickedAt = null;
      existingMember.joinedAt = new Date();
      existingMember.ticketPaid = true;
      existingMember.firstRedPacketSent = true;
      existingMember.firstRedPacketId = redPacket._id;
      existingMember.canGrabAfter = canGrabAfter;
      existingMember.totalReceived = 0;
    } else {
      group.members.push({
        userId: userId,
        role: 'member',
        joinedAt: new Date(),
        ticketPaid: true,
        firstRedPacketSent: true,
        firstRedPacketId: redPacket._id,
        canGrabAfter: canGrabAfter,
        totalReceived: 0,
        kickedOut: false
      });
      group.memberCount += 1;
    }

    group.updatedAt = Date.now();
    
    console.log(`准备保存群组，成员数: ${group.members.length}`);
    console.log(`成员列表: ${group.members.map(m => m.userId).join(', ')}\n`);
    
    try {
      await group.save();
      console.log(`✅ 群组成员保存成功\n`);
    } catch (saveErr) {
      console.error(`❌ 群组成员保存失败:`, saveErr.message);
      console.error(saveErr);
      process.exit(1);
    }

    // 7. 验证保存结果
    const savedGroup = await Group.findById(groupId);
    console.log('=== 保存后验证 ===');
    console.log(`成员数: ${savedGroup.members.length}`);
    const savedMember = savedGroup.members.find(m => m.userId === userId);
    if (savedMember) {
      console.log(`✅ 用户 ${userId} 已成功保存到群组`);
      console.log(`   角色: ${savedMember.role}`);
      console.log(`   已付费: ${savedMember.ticketPaid}`);
      console.log(`   已发首包: ${savedMember.firstRedPacketSent}`);
    } else {
      console.log(`❌ 用户 ${userId} 未找到`);
    }

    console.log('\n✅ 测试完成！');
    process.exit(0);
  } catch (err) {
    console.error('❌ 错误:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

testJoinChainGroup();
