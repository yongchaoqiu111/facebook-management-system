const mongoose = require('mongoose');
const Group = require('./models/Group');

mongoose.connect('mongodb://localhost:27017/usdchou', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');
  
  try {
    const groupId = '69d4ac8de8e03b8ae3397bb7'; // 红包接龙群ID
    
    // 更新冷却时间为3秒（0.00083小时）
    const group = await Group.findByIdAndUpdate(
      groupId,
      {
        'settings.waitHours': 0.00083 // 3秒 = 3/3600小时 ≈ 0.00083小时
      },
      { new: true }
    );
    
    if (group) {
      console.log(`群组 ${group.name} 冷却时间已更新:`);
      console.log(`  等待时间(小时): ${group.settings.waitHours}`);
      console.log(`  等待时间(秒): ${group.settings.waitHours * 3600}`);
    } else {
      console.log('群组未找到');
    }
    
  } catch (error) {
    console.error('更新冷却时间失败:', error);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB connection closed');
  }
}).catch(err => {
  console.error('MongoDB connection failed:', err);
});
