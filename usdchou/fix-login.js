const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  console.log('=== 创建可登录的测试账号 ===\n');

  // 生成真正的密码哈希
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('123456', salt);

  // 创建用户A
  let userA = await User.findOne({ userId: '12345678' });
  if (userA) {
    userA.password = hashedPassword;
    await userA.save();
    console.log('✅ 用户A (12345678) 密码已更新为: 123456');
  } else {
    userA = new User({
      userId: '12345678',
      username: '测试用户A',
      phone: '13800138001',
      password: hashedPassword,
      depositAddress: 'TTestAddressA123456789012345678',
      balance: 100000
    });
    await userA.save();
    console.log('✅ 用户A (12345678) 创建成功，密码: 123456');
  }

  // 创建用户B
  let userB = await User.findOne({ userId: '64262782' });
  if (userB) {
    userB.password = hashedPassword;
    await userB.save();
    console.log('✅ 用户B (64262782) 密码已更新为: 123456');
  } else {
    userB = new User({
      userId: '64262782',
      username: '测试用户B',
      phone: '13800138002',
      password: hashedPassword,
      depositAddress: 'TTestAddressB123456789012345678',
      balance: 60000
    });
    await userB.save();
    console.log('✅ 用户B (64262782) 创建成功，密码: 123456');
  }

  console.log('\n=== 登录信息 ===');
  console.log('用户名/手机号: 12345678 或 64262782');
  console.log('密码: 123456');
  
  process.exit();
}).catch(err => {
  console.error('错误:', err);
  process.exit(1);
});
