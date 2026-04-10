const mongoose = require('mongoose');
const Group = require('./models/Group');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  const g = await Group.findById('69d4ac8de8e03b8ae3397bb7');
  const m = g.members.find(x => x.userId.toString() === '69d658d7cb4369f44d6918bd');
  
  console.log('ticketPaid:', m.ticketPaid);
  console.log('kickedOut:', m.kickedOut);
  
  process.exit(0);
});
