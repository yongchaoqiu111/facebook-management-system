const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testFacebookLoginWithEnter() {
  console.log('Testing Facebook login with Enter key...');
  
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
    console.log('Opening Facebook login page...');
    await page.goto('https://www.facebook.com/login');
    await page.waitForLoadState('domcontentloaded');
    
    // 输入用户名
    console.log('Entering username...');
    const usernameInput = await page.waitForSelector('input[type="text"], input[type="email"]', { timeout: 10000 });
    await usernameInput.fill(username);
    console.log('✓ Username entered');
    
    // 输入密码
    console.log('Entering password...');
    const passwordInput = await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    await passwordInput.fill(password);
    console.log('✓ Password entered');
    
    // 使用 Enter 键登录
    console.log('Pressing Enter key to login...');
    await passwordInput.press('Enter');
    console.log('✓ Enter key pressed');
    
    // 等待登录完成
    console.log('Waiting for login to complete...');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // 检查是否登录成功
    console.log('Checking login status...');
    try {
      await page.waitForSelector('[aria-label="你的个人资料"]', { timeout: 15000 });
      console.log('✓ Facebook login successful!');
    } catch (error) {
      console.log('✗ Facebook login failed');
      console.log('Page title:', await page.title());
      
      // 检查是否有错误信息
      try {
        const errorElement = await page.waitForSelector('[data-testid="error_message"]', { timeout: 5000 });
        const errorText = await errorElement.textContent();
        console.log('Error message:', errorText);
      } catch (e) {
        console.log('No error message found');
      }
    }
    
    console.log('\n=== Login Test Completed ===');
    console.log('Using Enter key method as requested');
    console.log('Browser will remain open for verification');
    console.log('Press any key to close...');
    
  } catch (error) {
    console.log('✗ Login test failed:', error.message);
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

testFacebookLoginWithEnter().catch(console.error);
