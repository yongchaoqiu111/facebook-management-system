const { analyzeFacebookPosts } = require('./skills/facebook/facebook-post-analysis.js');

async function testPostAnalysis() {
    console.log('开始测试Facebook帖子分析技能...');
    
    try {
        const result = await analyzeFacebookPosts();
        console.log('\n测试结果:');
        console.log(result);
        
        if (result.code === 0 && result.data && result.data.analyzedPosts) {
            console.log('\n分析结果详情:');
            result.data.analyzedPosts.forEach((post, index) => {
                console.log(`\n=== 帖子 ${index + 1} ===`);
                console.log(`文本预览: ${post.text}`);
                console.log(`图片数量: ${post.images.length}`);
                console.log('分析结果:');
                console.log(post.analysis);
                console.log('='.repeat(50));
            });
        }
        
    } catch (error) {
        console.error('测试失败:', error);
    }
}

testPostAnalysis();
