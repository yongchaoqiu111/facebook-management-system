const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/usdchou', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');
  
  try {
    // 查询所有用户
    const users = await User.find({}, { userId: 1, username: 1, balance: 1, _id: 0 });
    
    console.log('所有用户信息:');
    users.forEach(user => {
      console.log(`用户ID: ${user.userId}, 用户名: ${user.username}, 余额: ${user.balance}`);
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
