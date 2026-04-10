const fs = require('fs');
const path = require('path');

// 前端 A.md 文件路径
const FRONTEND_A_MD = 'D:\\weibo\\usddt\\A.md';

// 检查文件是否存在
if (!fs.existsSync(FRONTEND_A_MD)) {
  console.log('❌ 前端 A.md 文件不存在，请确认路径是否正确');
  console.log('预期路径: D:\\weibo\\usddt\\A.md');
  process.exit(1);
}

// 读取现有内容
let existingContent = fs.readFileSync(FRONTEND_A_MD, 'utf8');

// 构建邀请消息
const inviteMessage = `
---

## 🎉 重要通知：实时联调监控系统已上线！

### ✨ 新系统优势
- **实时监控页面**: http://localhost:5000/chat-monitor
- **自动刷新**: 每 5 秒更新消息
- **Markdown 支持**: 完整格式化显示代码和问题
- **历史追溯**: 保留最近 100 条对话

### 🚀 快速接入（3 步完成）

#### 步骤 1: 安装依赖
\`\`\`bash
cd D:\\weibo\\usddt
npm install axios
\`\`\`

#### 步骤 2: 引入工具函数
在你的代码中使用：
\`\`\`javascript
const chatLogger = require('d:\\\\weibo\\\\usdchou\\\\utils\\\\chatLogger');
\`\`\`

#### 步骤 3: 发送第一条消息
\`\`\`javascript
chatLogger.sendChatMessageSync({
  sender: 'frontend',
  senderName: '前端 AI',
  content: '## 👋 前端已接入\\n\\n准备开始联调！'
});
\`\`\`

然后打开浏览器访问：**http://localhost:5000/chat-monitor**

### 📝 使用示例

**发送问题反馈：**
\`\`\`javascript
await chatLogger.sendChatMessage({
  sender: 'frontend',
  senderName: '前端 AI',
  content: \`## ❌ 问题：群聊消息收不到

### 现象
- 用户A发送消息后自己能看到
- 用户B（同群组）收不到

### 前端代码
\\\`\\\`\\\`javascript
socket.emit('chat:groupMessage', {
  groupId: '69d4ac8de8e03b8ae3397bab',
  content: '测试消息'
})
\\\`\\\`\\\`

请后端确认是否收到此消息？\`
});
\`\`\`

**查看后端回复：**
打开监控页面即可看到后端的实时回复！

### 📚 详细文档
- **使用指南**: \`d:\\weibo\\usdchou\\CHAT_MONITOR_GUIDE.md\`
- **邀请说明**: \`d:\\weibo\\usdchou\\INVITE_FRONTEND.md\`
- **工具函数**: \`d:\\weibo\\usdchou\\utils\\chatLogger.js\`

---

`;

// 在文件开头插入邀请消息（在标题之后）
const lines = existingContent.split('\n');
const insertIndex = lines.findIndex(line => line.includes('## 👤 发送方')) + 2;

if (insertIndex > 0) {
  lines.splice(insertIndex, 0, inviteMessage);
  const newContent = lines.join('\n');
  fs.writeFileSync(FRONTEND_A_MD, newContent, 'utf8');
  console.log('✅ 邀请消息已成功添加到前端 A.md 文件');
  console.log('📍 文件位置: D:\\weibo\\usddt\\A.md');
  console.log('\n前端 AI 下次查看该文件时就能看到邀请信息了！');
} else {
  console.log('❌ 无法找到合适的插入位置');
  process.exit(1);
}
