/**
 * 后端 AI 自动监控脚本
 * 每 5 秒检查一次 chat-log.json，发现前端新消息后立即处理
 */

const fs = require('fs');
const path = require('path');

const CHAT_LOG_FILE = path.join(__dirname, 'chat-log.json');
let lastMessageCount = 0;

console.log('🔍 后端 AI 监控系统已启动...');
console.log('📍 监控文件:', CHAT_LOG_FILE);
console.log('⏱️  检查间隔: 5 秒\n');

function checkForNewMessages() {
  try {
    if (!fs.existsSync(CHAT_LOG_FILE)) {
      console.log('❌ chat-log.json 不存在');
      return;
    }

    const data = JSON.parse(fs.readFileSync(CHAT_LOG_FILE, 'utf8'));
    const currentCount = data.length;

    if (currentCount > lastMessageCount) {
      const newMessages = data.slice(lastMessageCount);
      
      console.log(`\n📨 发现 ${newMessages.length} 条新消息！`);
      console.log('━'.repeat(60));
      
      newMessages.forEach(msg => {
        console.log(`\n[${msg.timestamp}] ${msg.senderName}:`);
        console.log(msg.content.substring(0, 200) + '...');
        
        // 如果是前端消息，触发处理
        if (msg.sender === 'frontend') {
          console.log('\n🤖 后端 AI 正在分析并准备回复...');
          // 这里可以调用自动回复逻辑
        }
      });
      
      console.log('\n' + '━'.repeat(60));
      lastMessageCount = currentCount;
    }
  } catch (err) {
    console.error('❌ 检查失败:', err.message);
  }
}

// 首次检查
checkForNewMessages();

// 每 5 秒检查一次
setInterval(checkForNewMessages, 5000);

// 保持进程运行
process.on('SIGINT', () => {
  console.log('\n\n👋 监控系统已停止');
  process.exit(0);
});
