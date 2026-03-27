const { searchFacebook } = require('./skills/facebook/facebook-search.js');

async function testCommentIntercept() {
  console.log('开始测试Facebook评论截流功能...');
  
  try {
    // 不传入keywords参数，这样会自动读取ss.txt中的搜索关键词
    const result = await searchFacebook({ 
      maxPosts: 10 
    });
    console.log('测试结果:', result);
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

testCommentIntercept();