const mongoose = require('mongoose');
const User = require('./models/User');
const RedPacket = require('./models/RedPacket');
const Group = require('./models/Group');

mongoose.connect('mongodb://localhost:27017/usdchou', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');
  
  try {
    // 查找用户100585
    const user = await User.findOne({ userId: '100585' });
    if (!user) {
      console.log('用户未找到');
      mongoose.disconnect();
      return;
    }
    
    console.log(`用户信息: ${user.username} (userId: ${user.userId})`);
    
    // 查找用户参与的接龙红包
    const chainRedPackets = await RedPacket.find({
      isChainRedPacket: true,
      'openedBy.userId': user._id
    }).populate('sender', 'username userId');
    
    console.log(`\n用户参与的接龙红包数量: ${chainRedPackets.length}`);
    
    chainRedPackets.forEach((rp, index) => {
      console.log(`\n红包 ${index + 1}:`);
      console.log(`  ID: ${rp._id}`);
      console.log(`  发送者: ${rp.sender.username} (userId: ${rp.sender.userId})`);
      console.log(`  总金额: ${rp.totalAmount}`);
      console.log(`  红包数量: ${rp.count}`);
      console.log(`  单个金额: ${rp.amounts[0]}`);
      console.log(`  已领取数量: ${rp.openedCount}`);
      console.log(`  红包金额数组: ${rp.amounts}`);
      
      // 查找用户领取的金额
      const userClaim = rp.openedBy.find(item => item.userId.toString() === user._id.toString());
      if (userClaim) {
        console.log(`  用户领取金额: ${userClaim.amount}`);
        console.log(`  领取时间: ${userClaim.openedAt}`);
      }
    });
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB connection closed');
  }
}).catch(err => {
  console.error('MongoDB connection failed:', err);
});
