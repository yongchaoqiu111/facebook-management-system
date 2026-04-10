const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Group = require('./models/Group');

dotenv.config();

async function removeUserFromGroup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/usdchou', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ 数据库连接成功\n');

    const group = await Group.findById('1000002');
    
    console.log('移除前成员数:', group.members.length);
    
    // 移除用户 10000002
    group.members = group.members.filter(m => m.userId !== '10000002');
    group.memberCount = group.members.length;
    
    await group.save();
    
    console.log('移除后成员数:', group.members.length);
    console.log('✅ 用户 10000002 已从群组移除\n');
    console.log('现在可以重新点击加入接龙群了！');

    process.exit(0);
  } catch (err) {
    console.error('❌ 错误:', err.message);
    process.exit(1);
  }
}

removeUserFromGroup();
