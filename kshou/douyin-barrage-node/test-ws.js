const WebSocket = require('ws');

// 创建WebSocket客户端连接
const ws = new WebSocket('ws://127.0.0.1:8888');

ws.on('open', () => {
    console.log('✅ WebSocket连接成功');
    ws.send('测试消息');
});

ws.on('message', (message) => {
    console.log('收到消息:', message);
});

ws.on('close', () => {
    console.log('🔌 WebSocket连接已关闭');
});

ws.on('error', (error) => {
    console.error('❌ WebSocket错误:', error);
});

// 3秒后关闭连接
setTimeout(() => {
    ws.close();
}, 3000);