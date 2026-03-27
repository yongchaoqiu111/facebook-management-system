const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testFacebookLoginAllMethods() {
  console.log('Testing all Facebook login button click methods...');
  
  // 读取账号信息
  const accountPath = path.join(__dirname, 'zhanghao', 'facebook.txt');
  const accountContent = fs.readFileSync(accountPath, 'utf8');
  const [username, password] = accountContent.split('\n').map(line => line.trim());
  
  console.log('Account info loaded:', { username });
  
  // 启动浏览器
  const browser = await chromium.launch({
    headless: false,
    slowMo: 50
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // 打开 Facebook 登录页
    await page.goto('https://www.facebook.com/login');
    await page.waitForLoadState('domcontentloaded');
    
    // 输入用户名和密码
    console.log('Entering username and password...');
    await page.fill('input[type="text"], input[type="email"]', username);
    await page.fill('input[type="password"]', password);
    
    // 测试方法 1: 基本点击
    console.log('\nMethod 1: Basic click');
    try {
      await page.click('input[type="submit"]');
      console.log('✓ Basic click attempted');
      await page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch (error) {
      console.log('✗ Basic click failed:', error.message);
    }
    
    // 测试方法 2: 强制点击
    console.log('\nMethod 2: Force click');
    try {
      await page.goto('https://www.facebook.com/login');
      await page.fill('input[type="text"], input[type="email"]', username);
      await page.fill('input[type="password"]', password);
      await page.click('input[type="submit"]', { force: true });
      console.log('✓ Force click attempted');
      await page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch (error) {
      console.log('✗ Force click failed:', error.message);
    }
    
    // 测试方法 3: 等待可见后点击
    console.log('\nMethod 3: Wait for visible then click');
    try {
      await page.goto('https://www.facebook.com/login');
      await page.fill('input[type="text"], input[type="email"]', username);
      await page.fill('input[type="password"]', password);
      await page.waitForSelector('input[type="submit"]', { state: 'visible' });
      await page.click('input[type="submit"]');
      console.log('✓ Wait for visible then click attempted');
      await page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch (error) {
      console.log('✗ Wait for visible then click failed:', error.message);
    }
    
    // 测试方法 4: 使用定位器
    console.log('\nMethod 4: Using locator');
    try {
      await page.goto('https://www.facebook.com/login');
      await page.fill('input[type="text"], input[type="email"]', username);
      await page.fill('input[type="password"]', password);
      const button = page.locator('input[type="submit"]');
      await button.click();
      console.log('✓ Using locator attempted');
      await page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch (error) {
      console.log('✗ Using locator failed:', error.message);
    }
    
    // 测试方法 5: XPath 选择器
    console.log('\nMethod 5: XPath selector');
    try {
      await page.goto('https://www.facebook.com/login');
      await page.fill('input[type="text"], input[type="email"]', username);
      await page.fill('input[type="password"]', password);
      await page.click('//input[@type="submit"]');
      console.log('✓ XPath selector attempted');
      await page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch (error) {
      console.log('✗ XPath selector failed:', error.message);
    }
    
    // 测试方法 6: 模拟真实点击
    console.log('\nMethod 6: Simulate real click');
    try {
      await page.goto('https://www.facebook.com/login');
      await page.fill('input[type="text"], input[type="email"]', username);
      await page.fill('input[type="password"]', password);
      const button = await page.waitForSelector('input[type="submit"]');
      await button.hover();
      await button.click({ delay: 100 });
      console.log('✓ Simulate real click attempted');
      await page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch (error) {
      console.log('✗ Simulate real click failed:', error.message);
    }
    
    // 测试方法 7: 键盘 Enter 键
    console.log('\nMethod 7: Keyboard Enter');
    try {
      await page.goto('https://www.facebook.com/login');
      await page.fill('input[type="text"], input[type="email"]', username);
      await page.fill('input[type="password"]', password);
      await page.press('input[type="password"]', 'Enter');
      console.log('✓ Keyboard Enter attempted');
      await page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch (error) {
      console.log('✗ Keyboard Enter failed:', error.message);
    }
    
    // 测试方法 8: 带重试的点击
    console.log('\nMethod 8: Click with retry');
    try {
      await page.goto('https://www.facebook.com/login');
      await page.fill('input[type="text"], input[type="email"]', username);
      await page.fill('input[type="password"]', password);
      
      let retries = 0;
      const maxRetries = 3;
      while (retries < maxRetries) {
        try {
          await page.click('input[type="submit"]');
          console.log('✓ Click with retry attempted');
          break;
        } catch (error) {
          retries++;
          console.log(`Retry ${retries}/${maxRetries}...`);
          await page.waitForTimeout(1000);
        }
      }
      await page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch (error) {
      console.log('✗ Click with retry failed:', error.message);
    }
    
    // 检查是否登录成功
    console.log('\nChecking login status...');
    try {
      await page.waitForSelector('[aria-label="你的个人资料"]', { timeout: 10000 });
      console.log('✓ Facebook login successful!');
    } catch (error) {
      console.log('✗ Facebook login failed');
      console.log('Page title:', await page.title());
    }
    
    console.log('\n=== All methods tested ===');
    console.log('Browser will remain open for verification');
    console.log('Press any key to close...');
    
  } catch (error) {
    console.log('✗ Test failed:', error.message);
  }
  
  // 等待用户操作
  process.stdin.setRawMode(true);
  process.stdin.resume();
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });
  
  await browser.close();
  console.log('Browser closed');
}

testFacebookLoginAllMethods().catch(console.error);
