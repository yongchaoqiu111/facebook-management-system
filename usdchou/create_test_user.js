// 创建测试用户
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function createTestUser() {
  try {
    await mongoose.connect('mongodb://localhost:27017/usdchou');
    console.log('✅ 已连接数据库');
    
    const username = 'test_user';
    const password = '123456';
    
    // 检查用户是否已存在
    let user = await User.findOne({ username });
    
    if (user) {
      console.log('⚠️  用户已存在，更新密码...');
      user.password = await bcrypt.hash(password, 10);
      user.balance = 10000;
      await user.save();
      console.log('✅ 用户信息已更新');
    } else {
      // 获取下一个userId
      const Counter = mongoose.connection.collection('counters');
      const counterDoc = await Counter.findOneAndUpdate(
        { _id: 'userId' },
        { $inc: { seq: 1 } },
        { upsert: true, new: true, returnDocument: 'after' }
      );
      
      const userId = counterDoc.seq;
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      user = new User({
        username,
        password: hashedPassword,
        userId: String(userId),
        phone: '13800138000',
        balance: 10000,
        depositAddress: `TTestAddress${Date.now()}`
      });
      
      await user.save();
      console.log('✅ 测试用户创建成功');
    }
    
    console.log('\n📋 测试账号信息:');
    console.log('用户名:', username);
    console.log('密码:', password);
    console.log('用户ID:', user.userId);
    console.log('余额:', user.balance, 'USDT');
    
    await mongoose.disconnect();
    console.log('\n✅ 完成！可以使用此账号登录测试');
    
  } catch (err) {
    console.error('❌ 错误:', err);
    process.exit(1);
  }
}

createTestUser();
