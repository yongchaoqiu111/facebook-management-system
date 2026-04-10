const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/usdchou', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');
  
  try {
    // 更新用户余额
    const user = await User.findOneAndUpdate(
      { userId: '100584' },
      { balance: 800000 },
      { new: true }
    );
    
    if (user) {
      console.log(`用户 ${user.username} (userId: ${user.userId}) 余额已更新为: ${user.balance}`);
    } else {
      console.log('用户未找到');
    }
    
  } catch (error) {
    console.error('更新余额失败:', error);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB connection closed');
  }
}).catch(err => {
  console.error('MongoDB connection failed:', err);
});
