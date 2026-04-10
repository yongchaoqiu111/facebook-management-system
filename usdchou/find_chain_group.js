const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Group = require('./models/Group');

dotenv.config();

async function checkAllGroups() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/usdchou', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ 数据库连接成功\n');

    const groups = await Group.find({});
    
    console.log(`找到 ${groups.length} 个群组:\n`);
    
    groups.forEach((group) => {
      console.log(`名称: ${group.name}`);
      console.log(`ID (_id): ${group._id}`);
      console.log(`ID 类型: ${typeof group._id}`);
      console.log(`ID 长度: ${group._id.toString().length}`);
      console.log(`是否接龙群: ${group.settings?.isChainRedPacket ? '是' : '否'}`);
      console.log('---');
    });

    process.exit(0);
  } catch (err) {
    console.error('❌ 错误:', err.message);
    process.exit(1);
  }
}

checkAllGroups();
