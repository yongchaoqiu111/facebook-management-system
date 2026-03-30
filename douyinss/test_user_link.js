const { DouyinDanmakuAutomation } = require('./js/login.js');

async function testUserLinkExtraction() {
    console.log('=== 测试用户链接提取功能 ===');
    
    const automation = new DouyinDanmakuAutomation();
    
    try {
        // 启动弹幕抓取
        await automation.start('https://live.douyin.com/77994347272');
        
        console.log('测试启动成功，正在监控弹幕...');
        
        // 运行30秒后停止
        setTimeout(async () => {
            console.log('测试结束，正在停止...');
            await automation.stop();
            console.log('测试完成');
        }, 30000);
        
    } catch (error) {
        console.error('测试失败:', error);
        await automation.stop();
    }
}

testUserLinkExtraction();
