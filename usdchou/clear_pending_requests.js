const mongoose = require('mongoose');
const dotenv = require('dotenv');
const FriendRequest = require('./models/FriendRequest');

dotenv.config();

async function clearPendingRequests() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/usdchou');
    
    const result = await FriendRequest.deleteMany({
      status: 'pending',
      $or: [
        { sender: '10000001' },
        { sender: '10000002' },
        { receiver: '10000001' },
        { receiver: '10000002' }
      ]
    });
    
    console.log(`✅ 已删除 ${result.deletedCount} 条 pending 状态的好友请求`);
    process.exit(0);
  } catch (err) {
    console.error('❌ 错误:', err.message);
    process.exit(1);
  }
}

clearPendingRequests();
