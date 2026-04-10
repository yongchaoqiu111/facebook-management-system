const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  const Group = require('./models/Group');
  
  const groups = await Group.find().select('_id name members');
  
  console.log('所有群组:');
  groups.forEach(g => {
    console.log(`\n${g.name} (ID: ${g._id})`);
    console.log(`  成员数: ${g.members.length}`);
  });
  
  mongoose.disconnect();
}).catch(err => console.error('错误:', err));
