const mongoose = require('mongoose');
const Group = require('./models/Group');

async function checkGroups() {
  await mongoose.connect('mongodb://localhost:27017/usdchou');
  
  const groups = await Group.find({ isPublic: true });
  
  console.log('公共群列表:');
  groups.forEach(g => {
    console.log('- 群名:', g.name);
    console.log('  ID:', g._id.toString());
    console.log('');
  });
  
  process.exit();
}

checkGroups();
