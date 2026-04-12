const mongoose = require('mongoose');
require('dotenv').config();

async function addIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/usdchou');
    console.log('✅ 已连接数据库');
    
    const RedPacket = require('../models/RedPacket');
    
    console.log('创建 RedPacket 索引...');
    
    await RedPacket.collection.createIndex({ roomId: 1, createdAt: -1 });
    console.log('  ✅ { roomId: 1, createdAt: -1 }');
    
    await RedPacket.collection.createIndex({ isChainRedPacket: 1, status: 1 });
    console.log('  ✅ { isChainRedPacket: 1, status: 1 }');
    
    await RedPacket.collection.createIndex({ expiredAt: 1, status: 1 });
    console.log('  ✅ { expiredAt: 1, status: 1 }');
    
    console.log('\n🎉 所有红包索引创建成功');
    process.exit(0);
  } catch (err) {
    console.error('❌ 错误:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

addIndexes();