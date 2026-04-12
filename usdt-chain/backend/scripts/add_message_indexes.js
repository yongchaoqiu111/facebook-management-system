const mongoose = require('mongoose');
require('dotenv').config();

async function addIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/usdchou');
    console.log('✅ 已连接数据库');
    
    const GroupMessage = require('../models/GroupMessage');
    
    console.log('创建 GroupMessage 索引...');
    await GroupMessage.collection.createIndex({ groupId: 1, createdAt: -1 });
    console.log('  ✅ { groupId: 1, createdAt: -1 }');
    
    await GroupMessage.collection.createIndex(
      { groupId: 1, clientMsgId: 1 },
      { unique: true, sparse: true }
    );
    console.log('  ✅ { groupId: 1, clientMsgId: 1 } (unique, sparse)');
    
    const Message = require('../models/Message');
    
    console.log('创建 Message 索引...');
    await Message.collection.createIndex({ sender: 1, receiver: 1, createdAt: -1 });
    console.log('  ✅ { sender: 1, receiver: 1, createdAt: -1 }');
    
    await Message.collection.createIndex(
      { sender: 1, receiver: 1, clientMsgId: 1 },
      { unique: true, sparse: true }
    );
    console.log('  ✅ { sender: 1, receiver: 1, clientMsgId: 1 } (unique, sparse)');
    
    console.log('\n🎉 所有消息索引创建成功');
    process.exit(0);
  } catch (err) {
    console.error('❌ 错误:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

addIndexes();