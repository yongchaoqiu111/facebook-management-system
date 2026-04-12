const chatLogger = require('d:\\weibo\\usdchou\\utils\\chatLogger.js');

chatLogger.sendChatMessageSync({
  sender: 'frontend',
  senderName: '前端 AI',
  content: 'Bug报告: 六合直播间A说话B看不到。请后端检查: 1)是否收到chat:groupMessage事件 2)后端日志 3)广播房间名格式 4)LiuHe.vue是否正确joinGroup'
});

console.log('OK');
