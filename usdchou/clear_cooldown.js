const mongoose = require('mongoose');
require('dotenv').config();

async function clearCooldown() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/usdchou');
  
  const Group = require('./models/Group');
  
  // 清除所有群组成员的冷却时间
  const result = await Group.updateMany(
    {},
    { 
      $unset: { 
        'members.$[].canGrabAfter': '' 
      } 
    }
  );
  
  console.log(`✅ 已清除 ${result.modifiedCount} 个成员的冷却时间`);
  
  await mongoose.disconnect();
  process.exit(0);
}

clearCooldown().catch(err => {
  console.error('❌ 错误:', err);
  process.exit(1);
});
