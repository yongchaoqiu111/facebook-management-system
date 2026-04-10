const { io } = require('socket.io-client');

console.log('🚀 创建 Socket 连接...');

// 使用测试用户的 token
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWQ0YjExZjJiNjU3NzM3ZDIyMDZiZTciLCJ1c2VybmFtZSI6IjEyMzQ1NjciLCJpYXQiOjE3NDQwMTAwMDB9.test';

const socket = io('http://localhost:5000', {
    transports: ['websocket'],
    auth: {
        token: token
    }
});

socket.on('connect', () => {
    console.log('✅ Socket 已连接, ID:', socket.id);
    
    // 加入群组
    socket.emit('joinGroup', '69d4ac8de8e03b8ae3397bab');
    console.log('✅ 已加入群组');
    
    // 等待1秒后发送消息
    setTimeout(() => {
        console.log('📤 发送测试消息...');
        socket.emit('chat:groupMessage', {
            groupId: '69d4ac8de8e03b8ae3397bab',
            content: '自动化测试消息 - ' + new Date().toLocaleTimeString()
        });
        console.log('✅ 消息已发送！');
        
        // 等待2秒后断开
        setTimeout(() => {
            socket.disconnect();
            console.log('🔌 已断开连接');
            process.exit(0);
        }, 2000);
    }, 1000);
});

socket.on('connect_error', (err) => {
    console.error('❌ 连接错误:', err.message);
    process.exit(1);
});

socket.on('disconnect', () => {
    console.log('🔌 Socket 已断开');
});
