const { postToInstagram } = require('./skills/instagram/instagram-post.js');

async function testInstagramPost() {
  console.log('=== 开始测试Instagram自动发帖技能 ===');
  
  try {
    // 测试参数
    const testParams = {
      text: '', // 留空，让脚本自动读取文本文件
      imagePaths: [], // 留空，让脚本自动扫描images目录
      publish: true, // 发布模式，真正发布帖子
      loginTimeoutSeconds: 60 // 缩短登录超时时间
    };
    
    console.log('测试参数:', testParams);
    console.log('开始执行...');
    
    // 执行发帖
    const result = await postToInstagram(testParams);
    
    console.log('发帖结果:', result);
    
    if (result.code === 0) {
      console.log('✅ Instagram发帖技能测试成功！');
    } else {
      console.log('❌ Instagram发帖技能测试失败！');
    }
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
    console.error('错误堆栈:', error.stack);
  }
  
  console.log('=== Instagram自动发帖技能测试完成 ===');
}

// 运行测试
testInstagramPost();
