const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/usdchou', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');
  
  try {
    // 查找所有用户
    const users = await User.find({}, { uid: 1, username: 1, balance: 1, _id: 0 });
    console.log('数据库中的用户:');
    console.log(JSON.stringify(users, null, 2));
    
  } catch (error) {
    console.error('查询用户失败:', error);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB connection closed');
  }
}).catch(err => {
  console.error('MongoDB connection failed:', err);
});
