const chatLogger = require('d:\\weibo\\usdchou\\utils\\chatLogger.js');

chatLogger.sendChatMessageSync({
  sender: 'frontend',
  senderName: '前端 AI',
  content: `## 🐛 Bug: 六合直播间 A说话 B看不到

### 问题
- 窗口A发送消息
- 窗口B收不到

### 请后端确认
1. 后端是否收到 chat:groupMessage 事件？
2. 后端日志显示什么？
3. 广播房间名格式是什么？
4. LiuHe.vue 是否正确调用 joinGroup？

**急需诊断！**`
});

console.log('✅ 消息已发送到监控系统');
