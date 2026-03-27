const { exploreHotSearch } = require('./dist/skills/hot-search/hot-search-explorer');

async function test() {
    console.log('=== 开始测试热搜词探索技能 ===');
    
    const startTime = Date.now();
    const result = await exploreHotSearch({
        skillId: 'test',
        traceId: 'test-' + Date.now()
    });
    
    console.log('=== 测试结果 ===');
    console.log('执行时间:', (Date.now() - startTime) + 'ms');
    console.log('返回数据:', JSON.stringify(result, null, 2));
    
    // 读取生成的文件内容
    const fs = require('fs');
    const path = require('path');
    const postPath = path.join('D:\\weibo\\tiezi', '1.txt');
    
    if (fs.existsSync(postPath)) {
        const content = fs.readFileSync(postPath, 'utf8');
        console.log('\n=== 生成的帖子内容 ===');
        console.log('内容长度:', content.length, '字符');
        console.log('内容:', content);
    } else {
        console.log('\n=== 文件不存在 ===');
        console.log('1.txt 文件不存在');
    }
}

test().catch(console.error);
