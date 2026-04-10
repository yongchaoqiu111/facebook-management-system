const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  const Group = require('./models/Group');
  
  const userId = '69d4b0dd082c65cf20f260c8';
  
  console.log('开始清理所有接龙群...');
  console.log('='.repeat(60));
  
  const groups = await Group.find({'settings.isChainRedPacket': true});
  
  for (const group of groups) {
    const beforeCount = group.members.length;
    group.members = group.members.filter(m => m.userId.toString() !== userId);
    group.memberCount = group.members.length;
    await group.save();
    
    console.log(`群 '${group.name}': ${beforeCount}人 -> ${group.members.length}人`);
  }
  
  console.log('='.repeat(60));
  console.log('✅ 清理完成！现在可以重新测试了');
  
  process.exit();
});
