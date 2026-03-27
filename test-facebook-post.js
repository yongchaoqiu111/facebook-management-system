const { postToFacebookReal } = require('./skills/facebook/facebook-post-real.js');

async function testFacebookPost() {
    console.log('开始测试Facebook发帖功能...');
    
    try {
        const result = await postToFacebookReal({
            text: '测试修改后的Facebook发帖功能 - 先传图再打字',
            imagePaths: ['D:\\weibo\\images\\2.png'],
            publish: true
        });
        
        console.log('发帖结果:', result);
    } catch (error) {
        console.error('测试失败:', error);
    }
}

testFacebookPost();
