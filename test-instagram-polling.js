const { postToInstagram } = require('./skills/instagram/instagram-post.js');

async function testPolling() {
  console.log('=== 测试Instagram轮询功能 ===');
  console.log('开始第一次发帖...');
  
  // 第一次发帖
  const result1 = await postToInstagram({
    text: '', // 留空，让脚本自动读取文本文件
    imagePaths: [], // 留空，让脚本自动扫描images目录
    publish: false, // 使用草稿模式测试，避免实际发布
    loginTimeoutSeconds: 60
  });
  
  console.log('第一次发帖结果:', result1);
  
  // 等待一段时间，确保索引文件已更新
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('\n开始第二次发帖...');
  
  // 第二次发帖
  const result2 = await postToInstagram({
    text: '', // 留空，让脚本自动读取文本文件
    imagePaths: [], // 留空，让脚本自动扫描images目录
    publish: false, // 使用草稿模式测试，避免实际发布
    loginTimeoutSeconds: 60
  });
  
  console.log('第二次发帖结果:', result2);
  
  console.log('\n=== 轮询测试完成 ===');
}

testPolling().catch(console.error);
