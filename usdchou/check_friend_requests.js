const mongoose = require('mongoose');
const dotenv = require('dotenv');
const FriendRequest = require('./models/FriendRequest');

dotenv.config();

async function checkRequests() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/usdchou');
    
    const requests = await FriendRequest.find({
      $or: [
        { senderId: '10000001', receiverId: '10000002' },
        { senderId: '10000002', receiverId: '10000001' }
      ]
    }).sort({ createdAt: -1 });
    
    console.log(`找到 ${requests.length} 条好友请求:`);
    requests.forEach((req, i) => {
      console.log(`${i+1}. ${req.senderId} -> ${req.receiverId}, 状态: ${req.status}, 时间: ${req.createdAt}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('❌ 错误:', err.message);
    process.exit(1);
  }
}

checkRequests();
