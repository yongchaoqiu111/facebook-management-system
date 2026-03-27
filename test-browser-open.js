const { chromium } = require('playwright');

async function testBrowserOpen() {
  console.log('测试浏览器是否能够打开 Facebook...');
  
  try {
    // 启动浏览器
    const browser = await chromium.launch({
      headless: false
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 打开 Facebook
    console.log('打开 Facebook 主页...');
    await page.goto('https://www.facebook.com', { timeout: 60000 });
    
    console.log('✓ Facebook 网页打开成功！');
    console.log('当前 URL:', page.url());
    
    // 等待用户操作
    console.log('\n请手动检查 Facebook 网页是否正常打开');
    console.log('按任意键关闭浏览器...');
    
    process.stdin.setRawMode(true);
    process.stdin.resume();
    await new Promise(resolve => process.stdin.once('data', resolve));
    
    await browser.close();
    console.log('浏览器已关闭');
    
  } catch (error) {
    console.error('✗ 浏览器打开失败:', error.message);
  }
}

testBrowserOpen();
