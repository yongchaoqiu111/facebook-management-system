const mongoose = require('mongoose');
const Group = require('./models/Group');

mongoose.connect('mongodb://localhost:27017/usdchou', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');
  
  try {
    // 更新接龙群配置
    const groupId = '69d4ac8de8e03b8ae3397bb7'; // 红包接龙群ID
    const group = await Group.findByIdAndUpdate(
      groupId,
      {
        'settings.firstRedPacketAmount': 20 // 首包金额改为20元
      },
      { new: true }
    );
    
    if (group) {
      console.log(`群组 ${group.name} 配置已更新:`);
      console.log(`  门票金额: ${group.settings.ticketAmount}`);
      console.log(`  首包金额: ${group.settings.firstRedPacketAmount}`);
      console.log(`  踢出阈值: ${group.settings.kickThreshold}`);
    } else {
      console.log('群组未找到');
    }
    
  } catch (error) {
    console.error('更新配置失败:', error);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB connection closed');
  }
}).catch(err => {
  console.error('MongoDB connection failed:', err);
});
