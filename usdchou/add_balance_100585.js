const mongoose = require('mongoose');
require('dotenv').config();

async function addBalance() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/usdchou');
  
  const User = require('./models/User');
  
  // 查找用户ID为100585的用户
  const user = await User.findOne({ userId: 100585 });
  
  if (!user) {
    console.log('❌ 未找到用户 100585');
    await mongoose.disconnect();
    process.exit(1);
  }
  
  console.log(`当前余额: ${user.balance}`);
  
  // 增加100000
  user.balance += 100000;
  await user.save();
  
  console.log(`✅ 已为用户 100585 增加 100000，新余额: ${user.balance}`);
  
  await mongoose.disconnect();
  process.exit(0);
}

addBalance().catch(err => {
  console.error('❌ 错误:', err);
  process.exit(1);
});
