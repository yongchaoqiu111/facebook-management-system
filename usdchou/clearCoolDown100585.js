const mongoose = require('mongoose');
const Group = require('./models/Group');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/usdchou', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');
  
  try {
    const groupId = '69d4ac8de8e03b8ae3397bb7'; // 红包接龙群ID
    
    // 查找用户100585
    const user = await User.findOne({ userId: '100585' });
    if (!user) {
      console.log('用户未找到');
      mongoose.disconnect();
      return;
    }
    
    const userId = user._id.toString();
    
    // 查找并更新用户的冷却时间
    const group = await Group.findOne({
      _id: groupId,
      'members.userId': userId
    });
    
    if (!group) {
      console.log('群组或用户未找到');
      mongoose.disconnect();
      return;
    }
    
    // 找到用户在群中的记录
    const memberIndex = group.members.findIndex(m => m.userId.toString() === userId);
    if (memberIndex === -1) {
      console.log('用户不在群中');
      mongoose.disconnect();
      return;
    }
    
    // 清除冷却时间
    group.members[memberIndex].canGrabAfter = null;
    await group.save();
    
    console.log('✅ 用户100585的冷却时间已清除，现在可以抢红包了！');
    
  } catch (error) {
    console.error('清除冷却时间失败:', error);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB connection closed');
  }
}).catch(err => {
  console.error('MongoDB connection failed:', err);
});
