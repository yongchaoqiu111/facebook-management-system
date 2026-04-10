const mongoose = require('mongoose');
const Group = require('./models/Group');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  const group = await Group.findOne({name: '红包接龙'});
  
  if (group) {
    console.log('群组名称:', group.name);
    console.log('kickThreshold:', group.settings.kickThreshold);
    console.log('成员数量:', group.members.length);
    console.log('\n所有成员:');
    group.members.forEach((m, index) => {
      console.log(`${index + 1}. userId: ${m.userId}, totalReceived: ${m.totalReceived}, kickedOut: ${m.kickedOut}`);
    });
  } else {
    console.log('找不到红包接龙群');
  }
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
