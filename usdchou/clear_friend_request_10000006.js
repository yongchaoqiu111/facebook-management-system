const mongoose = require('mongoose');
require('dotenv').config();

async function clearFriendRequest() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/usdchou', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ 已连接到 MongoDB');
    
    const FriendRequest = require('./models/FriendRequest');
    
    // 查找并删除重复的好友请求
    const result = await FriendRequest.deleteMany({
      sender: '10000006',
      receiver: '10000001'
    });
    
    console.log(`🗑️  已删除 ${result.deletedCount} 条好友请求记录`);
    console.log('   - 发送者: 10000006');
    console.log('   - 接收者: 10000001');
    
    // 也可以反向删除（如果存在）
    const result2 = await FriendRequest.deleteMany({
      sender: '10000001',
      receiver: '10000006'
    });
    
    if (result2.deletedCount > 0) {
      console.log(`🗑️  已删除 ${result2.deletedCount} 条反向好友请求记录`);
    }
    
    console.log('\n✅ 清理完成！现在可以重新发送好友请求了');
    
    await mongoose.disconnect();
    console.log('🔌 已断开数据库连接');
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

clearFriendRequest();
