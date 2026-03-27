const { downloadTikTokMedia } = require('./skills/tiktok/tiktok-download.js');

async function testTikTokDownload() {
    console.log('开始测试TikTok下载功能...');
    
    try {
        const result = await downloadTikTokMedia({
            username: 'lebaby0v0', // 测试账号
            loginTimeoutSeconds: 60,
            downloadLimit: 20
        });
        
        console.log('测试结果:', result);
        
        if (result.code === 0) {
            console.log('✅ TikTok下载测试成功！');
            console.log('📊 下载统计:');
            console.log(`   - 用户名: ${result.data.username}`);
            console.log(`   - 发现媒体: ${result.data.totalFound}`);
            console.log(`   - 成功下载: ${result.data.downloaded}`);
            console.log(`   - 下载失败: ${result.data.failed}`);
            console.log(`   - 跳过文件: ${result.data.skipped}`);
            console.log(`   - 保存目录: ${result.data.downloadDir}`);
        } else {
            console.log('❌ TikTok下载测试失败:', result.data.message);
        }
        
    } catch (error) {
        console.log('❌ 测试过程中发生错误:', error.message);
    }
}

// 运行测试
testTikTokDownload();