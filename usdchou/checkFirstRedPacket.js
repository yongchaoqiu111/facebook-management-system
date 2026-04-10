const mongoose = require('mongoose');
const User = require('./models/User');
const Group = require('./models/Group');
const RedPacket = require('./models/RedPacket');

mongoose.connect('mongodb://localhost:27017/usdchou', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');
  
  try {
    // 查找用户100584
    const user = await User.findOne({ userId: '100584' });
    if (!user) {
      console.log('用户未找到');
      mongoose.disconnect();
      return;
    }
    
    console.log(`用户信息: ${user.username} (userId: ${user.userId})`);
    console.log(`当前余额: ${user.balance}`);
    
    // 查找用户所在的接龙群
    const group = await Group.findOne({
      'members.userId': user._id,
      'settings.isChainRedPacket': true
    });
    
    if (!group) {
      console.log('用户不在接龙群中');
      mongoose.disconnect();
      return;
    }
    
    console.log(`\n接龙群信息:`);
    console.log(`  群名称: ${group.name}`);
    console.log(`  群ID: ${group._id}`);
    
    // 查找用户在群中的信息
    const member = group.members.find(m => m.userId.toString() === user._id.toString());
    if (member) {
      console.log(`\n用户在群中的状态:`);
      console.log(`  是否发送首包: ${member.firstRedPacketSent}`);
      console.log(`  首包ID: ${member.firstRedPacketId}`);
      console.log(`  累计领取金额: ${member.totalReceived}`);
      
      // 如果有首包ID，查询红包信息
      if (member.firstRedPacketId) {
        const redPacket = await RedPacket.findById(member.firstRedPacketId);
        if (redPacket) {
          console.log(`\n首包信息:`);
          console.log(`  红包ID: ${redPacket._id}`);
          console.log(`  总金额: ${redPacket.totalAmount}`);
          console.log(`  数量: ${redPacket.count}`);
          console.log(`  已领取: ${redPacket.openedCount}`);
          console.log(`  是否接龙红包: ${redPacket.isChainRedPacket}`);
          console.log(`  创建时间: ${new Date(redPacket.createdAt)}`);
        } else {
          console.log(`\n❌ 首包ID存在但未找到红包记录`);
        }
      } else {
        console.log(`\n❌ 首包ID为空`);
      }
    }
    
    // 查询用户最近的交易记录
    const Transaction = require('./models/Transaction');
    const transactions = await Transaction.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(10);
    
    console.log(`\n最近交易记录:`);
    transactions.forEach(tx => {
      console.log(`  ${new Date(tx.createdAt).toLocaleString()} - ${tx.type}: ${tx.amount} - ${tx.note}`);
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
