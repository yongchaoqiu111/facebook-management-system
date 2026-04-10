const mongoose = require('mongoose');
const Group = require('./models/Group');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  const groups = await Group.find({});
  
  for (const group of groups) {
    const member = group.members.find(m => m.userId === '100585');
    if (member) {
      console.log('群组:', group.name);
      console.log('kickThreshold:', group.settings.kickThreshold);
      console.log('成员信息:');
      console.log('  - totalReceived:', member.totalReceived);
      console.log('  - kickedOut:', member.kickedOut);
      console.log('  - kickReason:', member.kickReason);
      console.log('  - canGrabAfter:', member.canGrabAfter);
    }
  }
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
