const { analyzeAndCommentFacebookPosts } = require('./skills/facebook/facebook-post-analyze-comment.js');

async function testAnalyzeComment() {
    console.log('开始测试Facebook帖子分析与评论技能...');
    
    try {
        const result = await analyzeAndCommentFacebookPosts();
        console.log('\n测试结果:');
        console.log(result);
        
        if (result.code === 0) {
            console.log('\n🎉 技能执行成功！');
            if (result.data && result.data.comment) {
                console.log('生成的评论:', result.data.comment);
            }
        } else {
            console.log('\n❌ 技能执行失败');
        }
        
    } catch (error) {
        console.error('测试失败:', error);
    }
}

testAnalyzeComment();
