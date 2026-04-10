const mongoose = require('mongoose');

async function checkDatabase() {
  try {
    await mongoose.connect('mongodb://localhost:27017/usdchou');
    console.log('Connected to MongoDB');
    
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const users = await User.find({});
    
    console.log('\n=== 用户数据 ===');
    console.log(`总用户数: ${users.length}`);
    if (users.length > 0) {
      users.forEach(user => {
        console.log(`\n用户 ${user._id}:`);
        console.log('  - 用户名:', user.username);
        console.log('  - 手机号:', user.phone);
        console.log('  - 余额:', user.balance);
        console.log('  - 创建时间:', user.createdAt);
      });
    } else {
      console.log('数据库中没有用户数据');
    }
    
    mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkDatabase();
