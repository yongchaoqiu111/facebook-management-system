const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  // 用userId字段查找
  const user = await User.findOne({ userId: '100585' });
  
  if (user) {
    console.log('找到用户:', user.username);
    console.log('用户ID:', user._id);
    console.log('当前余额:', user.balance);
    
    user.balance = 10000;
    await user.save();
    
    console.log('✅ 已重置余额为: 10000');
  } else {
    console.log('❌ 用户不存在');
  }
  
  process.exit(0);
}).catch(err => {
  console.error('错误:', err);
  process.exit(1);
});
