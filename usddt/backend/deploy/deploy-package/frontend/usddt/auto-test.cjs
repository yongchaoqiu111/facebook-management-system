const puppeteer = require('puppeteer');

(async () => {
    console.log('🚀 启动浏览器...');
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    
    console.log('📄 打开页面...');
    await page.goto('http://localhost:5173/#/liuhe');
    
    // 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🔍 检查 socket 状态...');
    const socketStatus = await page.evaluate(() => {
        // 尝试从 window 对象获取（如果已暴露）
        if (window.__VUE_APP__ && window.__VUE_APP__.socket) {
            const s = window.__VUE_APP__.socket;
            return {
                exists: true,
                connected: s.connected,
                id: s.id
            };
        }
        
        // 或者检查是否有全局 socket
        if (typeof socket !== 'undefined') {
            return {
                exists: true,
                connected: socket.connected,
                id: socket.id
            };
        }
        
        return { exists: false, connected: false, id: null };
    });
    
    console.log('Socket 状态:', socketStatus);
    
    if (socketStatus.exists && socketStatus.connected) {
        console.log('✅ 发送测试消息...');
        await page.evaluate(() => {
            socket.emit('chat:groupMessage', {
                groupId: '69d4ac8de8e03b8ae3397bab',
                content: '自动化测试消息'
            });
        });
        
        console.log('✅ 消息已发送！');
    } else {
        console.log('❌ Socket 未连接');
    }
    
    // 保持浏览器打开
    console.log('浏览器已打开，按 Ctrl+C 关闭');
})();
