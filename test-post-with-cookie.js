const { postToFacebookReal } = require('./dist/skills/facebook/facebook-post-real.js');
const fs = require('fs');

async function testPostWithCookie() {
    console.log('开始测试使用当前cookie发帖...');
    
    try {
        // 读取1.txt中的内容
        const postContent = fs.readFileSync('D:\\weibo\\tiezi\\1.txt', 'utf8');
        
        console.log('帖子内容已读取：');
        console.log(postContent);
        
        // 使用当前cookie发帖
        const result = await postToFacebookReal({
            text: postContent,
            publish: false // 先不发布，只保存草稿
        });
        
        console.log('发帖结果:', result);
        
    } catch (error) {
        console.error('测试失败:', error);
    }
}

testPostWithCookie();
