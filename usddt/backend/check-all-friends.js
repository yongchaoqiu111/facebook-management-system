const mongoose = require('mongoose');
const Friend = require('./models/Friend');

async function checkAllFriends() {
  try {
    await mongoose.connect('mongodb://localhost:27017/usddt');
    console.log('✅ 数据库连接成功');
    
    const allFriends = await Friend.find({});
    console.log(`📊 Friend 表总共有 ${allFriends.length} 条记录:`);
    
    if (allFriends.length === 0) {
      console.log('⚠️  Friend 表为空，没有任何好友关系');
    } else {
      allFriends.forEach(f => {
        console.log(`  - user1: ${f.user1}, user2: ${f.user2}, status: ${f.status}`);
      });
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ 错误:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

checkAllFriends();
