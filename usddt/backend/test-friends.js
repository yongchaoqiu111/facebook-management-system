const mongoose = require('mongoose');
const Friend = require('./models/Friend');

async function testFriends() {
  try {
    await mongoose.connect('mongodb://localhost:27017/usddt');
    console.log('✅ 数据库连接成功');
    
    const userId = '10000021';
    console.log(`🔍 查询用户 ${userId} 的好友...`);
    
    const friends = await Friend.find({
      $or: [
        { user1: userId, status: 'accepted' },
        { user2: userId, status: 'accepted' }
      ]
    });
    
    console.log(`📊 找到 ${friends.length} 个好友关系:`);
    friends.forEach(f => {
      console.log(`  - user1: ${f.user1}, user2: ${f.user2}, status: ${f.status}`);
    });
    
    const friendIds = friends.map(f => f.user1 === userId ? f.user2 : f.user1);
    console.log(`👥 好友ID列表:`, friendIds);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ 错误:', err.message);
    process.exit(1);
  }
}

testFriends();
