const playwright = require('playwright');

async function testLoginSimple() {
  console.log('=== 简单微博登录测试 ===');
  console.log('目标：直接打开登录页面，等待你扫码登录');
  console.log('====================');

  let browser, context, page;
  try {
    // 启动浏览器
    browser = await playwright.chromium.launch({ 
      headless: false,
      slowMo: 50
    });
    
    // 创建新的上下文
    context = await browser.newContext();
    page = await context.newPage();

    // 直接访问登录页面
    console.log('正在打开登录页面...');
    const loginUrl = 'https://passport.weibo.cn/signin/login?entry=mweibo&r=https%3A%2F%2Fm.weibo.cn%2F';
    
    try {
      await page.goto(loginUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
      console.log('登录页面加载完成');
      console.log('当前URL:', page.url());
    } catch (error) {
      console.log('登录页面加载可能需要手动操作');
      console.log('当前URL:', page.url());
    }

    console.log('');
    console.log('📱 请在打开的浏览器窗口中扫码登录');
    console.log('');
    console.log('🔍 你可以观察浏览器窗口：');
    console.log('   - 如果看到登录二维码，说明成功打开了登录页面');
    console.log('   - 扫码后会自动跳转到微博主页');
    console.log('');
    console.log('⏰ 浏览器将保持打开状态，你可以随时关闭');
    console.log('');
    console.log('按Ctrl+C退出脚本...');

    // 无限等待，保持浏览器打开
    await new Promise(() => {});

  } catch (error) {
    console.error('错误:', error.message);
    if (browser) {
      await browser.close();
    }
  }
}

testLoginSimple();
