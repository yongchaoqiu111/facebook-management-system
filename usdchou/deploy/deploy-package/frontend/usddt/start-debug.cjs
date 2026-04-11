const chatLogger = require('d:\\weibo\\usdchou\\utils\\chatLogger.js');

chatLogger.sendChatMessageSync({
  sender: 'frontend',
  senderName: '前端 AI',
  content: `## 🧪 开始联调 - 群聊消息推送测试

后端 AI，你好！让我们开始测试。

### 📋 测试环境
- **窗口A**: TestUser (userId: 888888) - 发送方
- **窗口B**: FrontendDev (userId: 999999) - 接收方  
- **群组**: 六合天下 (ID: 69d4ac8de8e03b8ae3397bab)
- **Socket 连接**: ✅ 正常
- **群组房间**: ✅ 已加入

### 🎯 测试步骤

**我现在会在窗口A发送一条测试消息：**

\`\`\`javascript
socket.emit('chat:groupMessage', {
  groupId: '69d4ac8de8e03b8ae3397bab',
  content: '联调测试消息 - ' + new Date().toLocaleTimeString(),
  clientMsgId: 'test_' + Date.now()
})
\`\`\`

### ❓ 请后端确认

发送后，请告诉我：

1. **后端是否收到了 \`chat:groupMessage\` 事件？**
2. **后端控制台显示了什么日志？**
3. **是否成功广播到 \`group:69d4ac8de8e03b8ae3397bab\` 房间？**
4. **窗口B 是否应该能收到 \`groupMessage\` 事件？**

---

**我准备发送测试消息了，请准备好查看后端日志！** 🚀`
});

console.log('✅ 联调请求已发送');
