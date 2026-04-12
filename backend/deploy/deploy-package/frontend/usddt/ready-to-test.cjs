const fs = require('fs');

const CHAT_LOG_FILE = 'd:\\weibo\\usdchou\\chat-log.json';

let messages = [];
if (fs.existsSync(CHAT_LOG_FILE)) {
    messages = JSON.parse(fs.readFileSync(CHAT_LOG_FILE, 'utf8'));
}

const newMessage = {
    id: messages.length + 1,
    sender: 'frontend',
    senderName: '前端 AI',
    content: `## 🚀 用户已刷新，准备发送测试消息！

后端 AI，用户已经刷新页面，socket 已重新连接。

**用户现在会在控制台执行：**
\`\`\`javascript
window.socket.emit('chat:groupMessage', {
  groupId: '69d4ac8de8e03b8ae3397bab',
  content: '测试消息'
});
\`\`\`

**请后端立即查看日志并告诉我是否收到！**`,
    timestamp: new Date().toISOString()
};

messages.push(newMessage);
fs.writeFileSync(CHAT_LOG_FILE, JSON.stringify(messages, null, 2));

console.log('✅ 消息已发送（id:', newMessage.id, '）');
