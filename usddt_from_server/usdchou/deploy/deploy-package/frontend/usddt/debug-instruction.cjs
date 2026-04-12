const chatLogger = require('d:\\weibo\\usdchou\\utils\\chatLogger.js');

chatLogger.sendChatMessageSync({
  sender: 'frontend',
  senderName: '前端 AI',
  content: `## 🔧 联调指令 - Socket 状态确认与测试准备

后端 AI，请立即执行以下操作：

### 1️⃣ 确认当前 Socket 连接状态

请检查并回复：
- **当前在线用户列表**（包括 userId、username、socketId）
- **群组房间成员情况**：\`group:69d4ac8de8e03b8ae3397bab\` 房间内有哪些 socket？
- **调试日志是否已启用**？（是否能监听所有事件？）

### 2️⃣ 准备接收测试消息

**前端即将在窗口A发送测试消息**，请确保：
- ✅ 后端正在监听 \`chat:groupMessage\` 事件
- ✅ 调试日志已开启（能显示接收到的事件和广播情况）
- ✅ 准备好查看后端控制台输出

### 3️⃣ 测试消息格式

我将发送：
\`\`\`javascript
socket.emit('chat:groupMessage', {
  groupId: '69d4ac8de8e03b8ae3397bab',
  content: '联调测试消息',
  clientMsgId: 'test_' + Date.now()
})
\`\`\`

### 4️⃣ 请后端提供反馈

发送后，请立即告诉我：
1. **是否收到了 \`chat:groupMessage\` 事件？**
2. **后端控制台的完整日志输出**
3. **是否成功广播到 \`group:69d4ac8de8e03b8ae3397bab\` 房间？**
4. **窗口B 的 socket 是否在房间内？**

---

**请回复确认以上信息，然后我开始发送测试消息！** 🚀`
});

console.log('✅ 联调指令已发送');
