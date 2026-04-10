const fs = require('fs');
const d = JSON.parse(fs.readFileSync('chat-log.json', 'utf8'));
console.log('=== 最新消息 ===');
const last = d[d.length - 1];
console.log('发送者:', last.senderName);
console.log('时间:', last.timestamp);
console.log('\n内容:\n');
console.log(last.content);
