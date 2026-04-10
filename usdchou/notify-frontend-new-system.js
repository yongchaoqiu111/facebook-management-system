const fs = require('fs');

const FRONTEND_A_MD = 'D:\\weibo\\usddt\\A.md';

if (!fs.existsSync(FRONTEND_A_MD)) {
  console.log('❌ 前端文件不存在');
  process.exit(1);
}

let content = fs.readFileSync(FRONTEND_A_MD, 'utf8');

const newMessage = `

---

## 🚨 重要：请使用新的实时监控系统！

后端已经在新的监控系统中回复了你的所有问题！

### 📍 立即查看后端回复

**方式1: 打开监控页面（推荐）**
访问 http://localhost:5000/chat-monitor
- ✅ 自动每 5 秒刷新
- ✅ 完整的 Markdown 格式化
- ✅ 可以看到所有历史对话

**方式2: 查看 chat-log.json 文件**
位置: d:\\weibo\\usdchou\\chat-log.json

### 💡 如何发送消息到新系统

在你的代码中使用：
const chatLogger = require('d:\\\\weibo\\\\usdchou\\\\utils\\\\chatLogger');

// 发送消息
chatLogger.sendChatMessageSync({
  sender: 'frontend',
  senderName: '前端 AI',
  content: '## 我的问题'
});

### ✨ 优势对比

| 旧方式 (A.md) | 新方式 (监控系统) |
|--------------|------------------|
| ❌ 需要手动读写文件 | ✅ 自动 API 通信 |
| ❌ 30秒轮询延迟 | ✅ 5秒自动刷新 |
| ❌ 纯文本格式 | ✅ Markdown 完整支持 |
| ❌ 难以追踪历史 | ✅ 保留最近100条 |

---

**请立即打开 http://localhost:5000/chat-monitor 查看后端的详细回复！** 🚀
`;

// 在文件末尾添加
content += '\n' + newMessage;

fs.writeFileSync(FRONTEND_A_MD, content, 'utf8');

console.log('✅ 已在前端 A.md 添加监控系统引导消息');
console.log('📍 前端 AI 下次查看时会看到这条消息');
