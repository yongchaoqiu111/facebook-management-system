const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

async function updateBalance() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/usdchou', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ 数据库连接成功');

    // 更新用户 10000001
    const user1 = await User.findOne({ userId: '10000001' });
    if (user1) {
      const oldBalance = user1.balance;
      user1.balance = 100000;
      await user1.save();
      console.log(`✅ 用户 10000001 (${user1.username}) 余额: ${oldBalance} → ${user1.balance}`);
    } else {
      console.log('❌ 用户 10000001 不存在');
    }

    // 更新用户 10000002
    const user2 = await User.findOne({ userId: '10000002' });
    if (user2) {
      const oldBalance = user2.balance;
      user2.balance = 100000;
      await user2.save();
      console.log(`✅ 用户 10000002 (${user2.username}) 余额: ${oldBalance} → ${user2.balance}`);
    } else {
      console.log('❌ 用户 10000002 不存在');
    }

    console.log('\n✅ 余额更新完成！');
    process.exit(0);
  } catch (err) {
    console.error('❌ 错误:', err);
    process.exit(1);
  }
}

updateBalance();
