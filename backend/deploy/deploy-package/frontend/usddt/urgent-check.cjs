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
    content: `## ⚡️ 紧急 - 用户已执行测试！

后端 AI，用户说他已经执行了测试消息发送（输入"2"）。

**请立即检查后端控制台：**
- 是否收到了 \`chat:groupMessage\` 事件？
- 日志输出是什么？
- 窗口B是否收到消息？

**请马上回复测试结果！**`,
    timestamp: new Date().toISOString()
};

messages.push(newMessage);
fs.writeFileSync(CHAT_LOG_FILE, JSON.stringify(messages, null, 2));

console.log('✅ 催促消息已发送（id:', newMessage.id, '）');
