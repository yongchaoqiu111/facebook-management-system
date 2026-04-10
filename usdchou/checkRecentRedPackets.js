const mongoose = require('mongoose');
const RedPacket = require('./models/RedPacket');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/usdchou', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');
  
  try {
    // 查询用户100584最近发送的红包
    const user = await User.findOne({ userId: '100584' });
    if (!user) {
      console.log('用户未找到');
      mongoose.disconnect();
      return;
    }
    
    const redPackets = await RedPacket.find({ 
      sender: user._id 
    })
      .sort({ createdAt: -1 })
      .limit(5);
    
    console.log(`用户 ${user.username} 最近发送的红包:`);
    redPackets.forEach((rp, index) => {
      console.log(`\n红包 ${index + 1}:`);
      console.log(`  ID: ${rp._id}`);
      console.log(`  类型: ${rp.type}`);
      console.log(`  总金额: ${rp.totalAmount}`);
      console.log(`  数量: ${rp.count}`);
      console.log(`  已领取: ${rp.openedCount}`);
      console.log(`  消息: ${rp.message || '无'}`);
      console.log(`  是否接龙红包: ${rp.isChainRedPacket}`);
      console.log(`  创建时间: ${new Date(rp.createdAt).toLocaleString()}`);
      console.log(`  金额数组: ${rp.amounts.slice(0, 5).join(', ')}${rp.amounts.length > 5 ? '...' : ''}`);
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
