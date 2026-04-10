const mongoose = require('mongoose');
require('dotenv').config();

async function addIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/usdchou');
    console.log('✅ 已连接数据库');
    
    const GroupMessage = require('../models/GroupMessage');
    const groupIndexes = await GroupMessage.collection.getIndexes();
    if (!groupIndexes['groupId_1_createdAt_-1']) {
      await GroupMessage.collection.createIndex({ groupId: 1, createdAt: -1 });
      console.log('✅ GroupMessage 时间索引创建完成');
    } else {
      console.log('✅ GroupMessage 时间索引已存在');
    }
    
    if (!groupIndexes['groupId_1_clientMsgId_1']) {
      await GroupMessage.collection.createIndex(
        { groupId: 1, clientMsgId: 1 },
        { sparse: true }
      );
      console.log('✅ GroupMessage clientMsgId索引创建完成');
    } else {
      console.log('✅ GroupMessage clientMsgId索引已存在');
    }
    
    const Message = require('../models/Message');
    const messageIndexes = await Message.collection.getIndexes();
    if (!messageIndexes['sender_1_receiver_1_createdAt_-1']) {
      await Message.collection.createIndex({ sender: 1, receiver: 1, createdAt: -1 });
      console.log('✅ Message 时间索引创建完成');
    } else {
      console.log('✅ Message 时间索引已存在');
    }
    
    if (!messageIndexes['sender_1_receiver_1_clientMsgId_1']) {
      await Message.collection.createIndex(
        { sender: 1, receiver: 1, clientMsgId: 1 },
        { sparse: true }
      );
      console.log('✅ Message clientMsgId索引创建完成');
    } else {
      console.log('✅ Message clientMsgId索引已存在');
    }
    
    console.log('🎉 所有索引创建成功');
    process.exit(0);
  } catch (err) {
    console.error('❌ 错误:', err.message);
    process.exit(1);
  }
}

addIndexes();
