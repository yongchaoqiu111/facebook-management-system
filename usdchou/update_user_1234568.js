const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function updateUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/usdchou');
    console.log('✅ 已连接数据库');

    const username = '1234568';
    const newUserId = '100581';
    const newBalance = 10000;

    // 查找用户
    const user = await User.findOne({username: username});
    if (!user) {
      console.error('❌ 用户不存在');
      process.exit(1);
    }

    console.log(`📝 当前用户信息:`);
    console.log(`   用户名: ${user.username}`);
    console.log(`   旧 userId: ${user.userId}`);
    console.log(`   旧余额: ${user.balance}`);

    // 更新 userId 和 balance
    user.userId = newUserId;
    user.balance = newBalance;
    await user.save();

    console.log(`\n✅ 更新成功!`);
    console.log(`   新 userId: ${user.userId}`);
    console.log(`   新余额: ${user.balance} USDT`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ 错误:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

updateUser();
