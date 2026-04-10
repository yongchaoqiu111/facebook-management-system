const fs = require('fs');

const data = JSON.parse(fs.readFileSync('chat-log.json', 'utf8'));
console.log('总消息数:', data.length);
console.log('\n最后3条消息:\n');

data.slice(-3).forEach((msg, i) => {
  console.log(`${i+1}. [${msg.sender}] ${msg.senderName} (${msg.timestamp})`);
  console.log(msg.content.substring(0, 200));
  console.log('---\n');
});
