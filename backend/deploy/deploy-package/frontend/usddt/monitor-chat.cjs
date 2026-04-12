const fs = require('fs');
const path = require('path');

const CHAT_LOG_FILE = 'd:\\weibo\\usdchou\\chat-log.json';
let lastMessageCount = 0;

console.log('🔍 开始监控 chat-log.json...');
console.log('按 Ctrl+C 停止监控\n');

// 初始读取
if (fs.existsSync(CHAT_LOG_FILE)) {
    const data = JSON.parse(fs.readFileSync(CHAT_LOG_FILE, 'utf8'));
    lastMessageCount = data.length;
    console.log(`📊 当前消息数: ${lastMessageCount}\n`);
}

// 每秒检查一次
setInterval(() => {
    try {
        if (!fs.existsSync(CHAT_LOG_FILE)) {
            return;
        }

        const data = JSON.parse(fs.readFileSync(CHAT_LOG_FILE, 'utf8'));
        const currentCount = data.length;

        if (currentCount > lastMessageCount) {
            const newMessages = data.slice(lastMessageCount);
            
            newMessages.forEach(msg => {
                console.log(`\n${'='.repeat(60)}`);
                console.log(`📨 新消息 [ID: ${msg.id}]`);
                console.log(`👤 发送者: ${msg.senderName} (${msg.sender})`);
                console.log(`⏰ 时间: ${new Date(msg.timestamp).toLocaleString('zh-CN')}`);
                console.log(`${'='.repeat(60)}`);
                console.log(msg.content);
                console.log(`${'='.repeat(60)}\n`);
            });

            lastMessageCount = currentCount;
        }
    } catch (err) {
        console.error('❌ 读取文件失败:', err.message);
    }
}, 1000);

// 保持进程运行
process.on('SIGINT', () => {
    console.log('\n\n✅ 监控已停止');
    process.exit(0);
});
