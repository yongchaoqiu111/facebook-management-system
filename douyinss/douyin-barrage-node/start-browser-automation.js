const DouyinBrowserAutomation = require('./browser-automation');

// 默认直播间URL
const DEFAULT_ROOM_URL = 'https://live.douyin.com/85101249452';

// 获取命令行参数
const roomUrl = process.argv[2] || DEFAULT_ROOM_URL;

console.log('=============================================');
console.log('          抖音弹幕抓取 - 浏览器自动化');
console.log('=============================================');
console.log(`直播间URL: ${roomUrl}`);
console.log('');
console.log('正在启动浏览器自动化...');
console.log('');
console.log('请确保浏览器代理已设置为: http://127.0.0.1:12345');
console.log('测试页面: file:///D:/weibo/douyinss/douyin-barrage-node/test.html');
console.log('=============================================');
console.log('');

// 创建并启动自动化实例
const automation = new DouyinBrowserAutomation();

automation.start(roomUrl)
    .then(() => {
        console.log('✅ 浏览器自动化已成功启动！');
        console.log('');
        console.log('📋 操作说明:');
        console.log('   1. 浏览器会自动打开抖音直播间');
        console.log('   2. 弹幕数据会自动捕获并通过WebSocket推送');
        console.log('   3. 打开测试页面查看实时弹幕');
        console.log('   4. 按 Ctrl+C 停止程序');
        console.log('');
    })
    .catch((error) => {
        console.error('❌ 启动失败:', error);
        process.exit(1);
    });

// 处理退出信号
process.on('SIGINT', async () => {
    console.log('\n正在停止浏览器自动化...');
    await automation.stop();
    console.log('✅ 程序已安全退出');
    process.exit(0);
});