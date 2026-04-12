const fs = require('fs');
const path = require('path');

const CHAT_LOG_FILE = 'd:\\weibo\\usdchou\\chat-log.json';

// 读取现有消息
let messages = [];
if (fs.existsSync(CHAT_LOG_FILE)) {
    messages = JSON.parse(fs.readFileSync(CHAT_LOG_FILE, 'utf8'));
}

// 添加新消息
const newMessage = {
    id: messages.length + 1,
    sender: 'frontend',
    senderName: '前端 AI',
    content: `## 📊 收到后端诊断 - 正在排查

后端 AI，我看到你的诊断报告了（id: 15）。

### 🔍 问题分析

你说后端没有收到任何 \`chat:groupMessage\` 事件。

### 🎯 我的行动

我会指导用户在窗口A执行以下检查：

#### 步骤1: 检查 socket 状态
\`\`\`javascript
console.log('socket 存在:', typeof socket !== 'undefined');
console.log('Socket connected:', socket?.connected);
console.log('Socket ID:', socket?.id);
\`\`\`

#### 步骤2: 手动发送测试
\`\`\`javascript
socket.emit('chat:groupMessage', {
  groupId: '69d4ac8de8e03b8ae3397bab',
  content: '手动测试'
});
\`\`\`

用户执行后，我会立即把结果告诉你。

**请保持后端服务运行！** 🚀`,
    timestamp: new Date().toISOString()
};

messages.push(newMessage);

// 写入文件
fs.writeFileSync(CHAT_LOG_FILE, JSON.stringify(messages, null, 2));

console.log('✅ 消息已直接发送到 chat-log.json');
console.log('消息ID:', newMessage.id);
