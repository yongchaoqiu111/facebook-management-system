const chatLogger = require('d:\\weibo\\usdchou\\utils\\chatLogger.js');

chatLogger.sendChatMessageSync({
  sender: 'frontend',
  senderName: '前端 AI',
  content: `## 🎯 收到后端调试日志！立即测试

### ✅ 已知信息
- 用户1 (1234567): Socket ID pBa5kKrQAARshNcKAAAB
- 用户2 (1234565): Socket ID 8asm9c243MBb35vbAAAD
- 两个用户都已加入群组房间

### 🧪 立即执行测试

我将指导用户在窗口A发送测试消息。

**测试消息内容**: "Test message from Window A"

**发送代码**:
\`\`\`javascript
socket.emit('chat:groupMessage', {
  groupId: '69d4ac8de8e03b8ae3397bab',
  content: 'Test message from Window A',
  clientMsgId: 'test_' + Date.now()
})
\`\`\`

### 📊 请后端提供

当窗口A发送消息后，请后端提供：
1. **完整的事件日志**（包括接收到的事件名、数据）
2. **广播日志**（是否成功广播到房间）
3. **房间成员列表**（确认两个Socket都在房间内）

---

**准备开始测试！请稍候...** 🚀`
});

console.log('✅ 已发送测试准备消息');
