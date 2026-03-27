const { downloadInstagramMedia } = require('./skills/instagram/instagram-download.js');

async function testInstagramDownload() {
  console.log('=== 测试Instagram媒体下载功能 ===');
  console.log('开始下载用户 "seeeeiiiiraaaa" 的媒体内容...');
  
  const result = await downloadInstagramMedia({
    username: 'seeeeiiiiraaaa',
    loginTimeoutSeconds: 60,
    downloadLimit: 10 // 限制下载数量，避免下载过多
  });
  
  console.log('下载结果:', result);
  
  if (result.code === 0) {
    console.log(`\n下载完成！`);
    console.log(`发现媒体总数: ${result.data.totalFound}`);
    console.log(`成功下载: ${result.data.downloaded}`);
    console.log(`下载失败: ${result.data.failed}`);
    console.log(`跳过文件: ${result.data.skipped}`);
    console.log(`下载目录: ${result.data.downloadDir}`);
  } else {
    console.log(`\n下载失败: ${result.data.message}`);
  }
}

testInstagramDownload().catch(console.error);
