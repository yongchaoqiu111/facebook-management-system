const { exploreHotSearch } = require('./dist/skills/hot-search/hot-search-explorer');

async function testHotSearchExplorer() {
  console.log('开始测试热搜词探索技能');
  
  try {
    const input = {
      skillId: 'mcp-hot-search-explorer',
      traceId: `test-${Date.now()}`
    };
    
    const result = await exploreHotSearch(input);
    
    console.log('测试结果:');
    console.log(`状态码: ${result.code}`);
    console.log(`搜索关键词: ${result.data.searchKeyword}`);
    console.log(`找到新闻数量: ${result.data.newsCount}`);
    console.log(`是否更新关键词库: ${result.data.updatedKeywords}`);
    console.log(`生成的帖子: ${result.data.generatedPost}`);
    
    if (result.code === 0) {
      console.log('测试成功!');
    } else {
      console.log('测试失败!');
    }
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

testHotSearchExplorer();
