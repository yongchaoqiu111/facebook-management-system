const mongoose = require('mongoose');
const Group = require('./models/Group');

mongoose.connect('mongodb://localhost:27017/usdchou', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');
  
  try {
    const groupId = '69d4ac8de8e03b8ae3397bb7'; // 红包接龙群ID
    
    const group = await Group.findById(groupId);
    
    if (group) {
      console.log(`群组名称: ${group.name}`);
      console.log(`群组ID: ${group._id}`);
      console.log('\n接龙群配置:');
      console.log(`  是否接龙群: ${group.settings.isChainRedPacket}`);
      console.log(`  门票金额: ${group.settings.ticketAmount || 10}`);
      console.log(`  首包金额: ${group.settings.firstRedPacketAmount || 300}`);
      console.log(`  踢出阈值: ${group.settings.kickThreshold || 380}`);
      console.log(`  冷却时间(小时): ${group.settings.waitHours || 3}`);
      console.log(`  红包数量: ${group.settings.redPacketCount || 30}`);
      console.log(`  每个红包金额: ${group.settings.redPacketPerAmount || 10}`);
      
      const totalRequired = (group.settings.ticketAmount || 10) + (group.settings.firstRedPacketAmount || 300);
      console.log(`\n总费用: ${totalRequired}`);
      
    } else {
      console.log('群组未找到');
    }
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB connection closed');
  }
}).catch(err => {
  console.error('MongoDB connection failed:', err);
});
