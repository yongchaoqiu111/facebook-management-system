const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  const Group = require('./models/Group');
  
  const groups = await Group.find({'settings.isChainRedPacket': true});
  
  console.log('开始清理接龙群...');
  console.log('='.repeat(50));
  
  for (const group of groups) {
    const owner = group.members.find(m => m.role === 'owner');
    group.members = owner ? [owner] : [];
    group.memberCount = group.members.length;
    await group.save();
    console.log(`群 '${group.name}' 已清理，剩余成员: ${group.members.length}`);
  }
  
  console.log('='.repeat(50));
  console.log('所有接龙群已清理完成！');
  console.log('现在可以重新测试进群功能了。');
  
  process.exit();
});
