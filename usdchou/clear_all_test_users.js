const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  const Group = require('./models/Group');
  
  console.log('开始清理所有接龙群，只保留群主...');
  console.log('='.repeat(60));
  
  const groups = await Group.find({'settings.isChainRedPacket': true});
  
  for (const group of groups) {
    const owner = group.members.find(m => m.role === 'owner');
    const beforeCount = group.members.length;
    
    // 只保留群主
    group.members = owner ? [owner] : [];
    group.memberCount = group.members.length;
    
    await group.save();
    
    console.log(`群 '${group.name}': ${beforeCount}人 -> ${group.members.length}人`);
  }
  
  console.log('='.repeat(60));
  console.log('✅ 清理完成！所有测试号已被踢出');
  console.log('现在可以重新测试进群功能了');
  
  process.exit();
});
