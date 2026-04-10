const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  const User = require('./models/User');
  
  const users = await User.find().select('_id username userId');
  
  console.log('所有用户:');
  users.forEach(u => {
    console.log(`${u.username} (userId: ${u.userId}, _id: ${u._id})`);
  });
  
  mongoose.disconnect();
}).catch(err => console.error('错误:', err));
