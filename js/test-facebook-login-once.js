const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testFacebookLoginOnce() {
  console.log('Testing Facebook login with provided credentials...');
  
  // 读取账号信息
  const accountPath = path.join(__dirname, 'zhanghao', 'facebook.txt');
  const accountContent = fs.readFileSync(accountPath, 'utf8');
  const [username, password] = accountContent.split('\n').map(line => line.trim());
  
  console.log('Account info loaded:', { username });
  
  // 启动浏览器
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // 打开 Facebook 登录页
    await page.goto('https://www.facebook.com/login');
    
    // 输入用户名
    console.log('Entering username...');
    try {
      // 尝试不同的选择器
      const usernameInput = await page.waitForSelector('input[type="text"], input[type="email"]', { timeout: 10000 });
      await usernameInput.fill(username);
      console.log('✓ Username input found and filled');
    } catch (error) {
      console.log('✗ Username input not found:', error.message);
      throw error;
    }
    
    // 输入密码
    console.log('Entering password...');
    try {
      const passwordInput = await page.waitForSelector('input[type="password"]', { timeout: 10000 });
      await passwordInput.fill(password);
      console.log('✓ Password input found and filled');
    } catch (error) {
      console.log('✗ Password input not found:', error.message);
      throw error;
    }
    
    // 点击登录按钮
    console.log('Clicking login button...');
    try {
      // 尝试不同的选择器
      const loginButton = await page.waitForSelector('input[type="submit"], button[type="submit"], #loginbutton', { timeout: 15000 });
      // 使用 force: true 来强制点击，即使按钮是隐藏的
      await loginButton.click({ force: true });
      console.log('✓ Login button found and clicked');
    } catch (error) {
      console.log('✗ Login button not found:', error.message);
      // 尝试直接使用 XPath
      try {
        console.log('Trying XPath selector...');
        const loginButtonXPath = await page.waitForSelector('//input[@value="登录"] | //button[contains(text(), "登录")]', { timeout: 10000 });
        await loginButtonXPath.click({ force: true });
        console.log('✓ Login button clicked via XPath');
      } catch (e) {
        console.log('✗ XPath selector failed:', e.message);
        throw error;
      }
    }
    
    // 等待登录完成
    console.log('Waiting for login to complete...');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // 检查是否登录成功
    try {
      await page.waitForSelector('[aria-label="你的个人资料"]', { timeout: 10000 });
      console.log('✓ Facebook login successful!');
    } catch (error) {
      console.log('✗ Facebook login failed, checking for errors...');
      
      // 检查是否有错误信息
      try {
        const errorElement = await page.waitForSelector('[data-testid="error_message"]', { timeout: 5000 });
        const errorText = await errorElement.textContent();
        console.log('Error message:', errorText);
      } catch (e) {
        console.log('No error message found, checking page title...');
        console.log('Page title:', await page.title());
      }
    }
    
    console.log('\n=== Login Test Completed ===');
    console.log('This was a one-time login test as requested.');
    console.log('The browser will remain open for you to verify the login status.');
    console.log('\nPress any key to close the browser...');
    
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

testFacebookLoginOnce().catch(console.error);
