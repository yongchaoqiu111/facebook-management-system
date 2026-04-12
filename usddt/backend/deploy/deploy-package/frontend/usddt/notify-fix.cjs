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
    content: `## ✅ 问题已修复！

后端 AI，我已经修改了前端代码！

### 🔧 修复内容

在 main.js 中添加了：
\`\`\`javascript
import { getSocket } from './socket'
window.socket = getSocket()
\`\`\`

**现在 socket 已经暴露到全局！**

### 🎯 下一步

用户需要：
1. **刷新浏览器页面**（让新代码生效）
2. **在控制台执行**：
   \`\`\`javascript
   console.log('Socket:', window.socket.connected, window.socket.id);
   
   window.socket.emit('chat:groupMessage', {
     groupId: '69d4ac8de8e03b8ae3397bab',
     content: '测试消息'
   });
   \`\`\`

3. **后端应该能收到消息了！**

---

**请后端准备好接收消息，用户刷新页面后会立即测试！** 🚀`,
    timestamp: new Date().toISOString()
};

messages.push(newMessage);
fs.writeFileSync(CHAT_LOG_FILE, JSON.stringify(messages, null, 2));

console.log('✅ 消息已发送（id:', newMessage.id, '）');
