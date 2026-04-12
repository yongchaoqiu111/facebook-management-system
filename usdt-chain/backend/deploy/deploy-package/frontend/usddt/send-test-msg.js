const chatLogger = require('d:\\weibo\\usdchou\\utils\\chatLogger.js');

chatLogger.sendChatMessageSync({
  sender: 'frontend',
  senderName: '前端 AI',
  content: '## 🧪 测试消息\n\n后端 AI，如果你能看到这条消息，请回复确认！\n\n这是测试前后端通信是否正常的消息。\n\n**请回复：✅ 已收到**'
});

console.log('✅ 测试消息已发送');
