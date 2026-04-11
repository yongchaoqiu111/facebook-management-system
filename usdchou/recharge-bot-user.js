const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  await User.findByIdAndUpdate('10000002', { $set: { balance: 999999999999 } });
  console.log('✅ 已充值 999999999999 USDT');
  process.exit(0);
});
