const { searchFacebook } = require('./dist/skills/facebook-skills');

async function test() {
    console.log('=== 开始测试Facebook搜索技能 ===');
    
    const startTime = Date.now();
    const result = await searchFacebook({
        keywords: ['AI', '人工智能'],
        maxPosts: 5
    });
    
    console.log('=== 测试结果 ===');
    console.log('执行时间:', (Date.now() - startTime) + 'ms');
    console.log('返回数据:', JSON.stringify(result, null, 2));
}

test().catch(console.error);
