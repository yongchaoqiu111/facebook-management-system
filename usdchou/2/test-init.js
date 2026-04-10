const mongoose = require('mongoose');
const ChainGroup = require('./models/ChainGroup');

async function initTestData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/chain-group');
    console.log('MongoDB连接成功');

    const existingGroup = await ChainGroup.findOne({ groupId: 'test-group-1' });
    if (existingGroup) {
      console.log('测试群组已存在');
      return;
    }

    const testGroup = new ChainGroup({
      groupId: 'test-group-1',
      name: '测试接龙群',
      members: [
        {
          userId: 'user-1',
          totalReceived: 0
        },
        {
          userId: 'user-2',
          totalReceived: 0
        }
      ],
      settings: {
        kickThreshold: 380
      }
    });

    await testGroup.save();
    console.log('测试群组创建成功');
    
  } catch (error) {
    console.error('初始化测试数据失败:', error);
  } finally {
    await mongoose.disconnect();
  }
}

initTestData();