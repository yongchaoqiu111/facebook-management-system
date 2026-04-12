const mongoose = require('mongoose');
const User = require('./models/User');

async function checkUsers() {
  try {
    await mongoose.connect('mongodb://localhost:27017/usdchou');
    console.log('✅ 数据库连接成功\n');
    
    const users = await User.find({}).select('_id userId username').limit(5);
    console.log(`📊 用户列表 (${users.length} 个):\n`);
    
    users.forEach(u => {
      console.log(`  _id: ${u._id}`);
      console.log(`  userId: ${u.userId} (类型: ${typeof u.userId})`);
      console.log(`  username: ${u.username}`);
      console.log('');
    });
    
    process.exit(0);
  } catch (err) {
    console.error('❌ 错误:', err.message);
    process.exit(1);
  }
}

checkUsers();
