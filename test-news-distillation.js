const { newsDistillationSkill } = require('./dist/skills/news-distillation/news-distillation');

// 测试新闻蒸馏技能
async function testNewsDistillation() {
    try {
        console.log('开始测试新闻蒸馏技能...');
        
        const traceId = `test-${Date.now()}`;
        const result = await newsDistillationSkill.execute(traceId);
        
        console.log('测试结果:', JSON.stringify(result, null, 2));
        
        if (result.ok) {
            console.log('✅ 新闻蒸馏技能测试成功！');
            console.log('生成的新闻内容:');
            console.log(result.data.formattedNews);
        } else {
            console.log('❌ 新闻蒸馏技能测试失败:', result.message);
        }
        
    } catch (error) {
        console.error('测试失败:', error);
    }
}

testNewsDistillation();
