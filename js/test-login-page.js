const playwright = require('playwright');

async function testLoginPage() {
  console.log('Testing login page opening...');
  try {
    const browser = await playwright.chromium.launch({ headless: false, slowMo: 120 });
    const context = await browser.newContext();
    const page = await context.newPage();

    // 直接打开登录页面
    console.log('Opening login page...');
    await page.goto('https://passport.weibo.cn/signin/login?entry=mweibo&r=https%3A%2F%2Fm.weibo.cn%2F', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log('Login page opened successfully!');
    console.log('Current URL:', page.url());
    
    // 保持浏览器打开30秒
    console.log('Keeping browser open for 30 seconds...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    await browser.close();
    console.log('Test completed.');
  } catch (error) {
    console.error('Error:', error);
  }
}

testLoginPage();
