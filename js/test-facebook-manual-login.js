const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testFacebookManualLogin() {
  console.log('Testing Facebook manual login...');
  
  // 读取账号信息
  const accountPath = path.join(__dirname, 'zhanghao', 'facebook.txt');
  const accountContent = fs.readFileSync(accountPath, 'utf8');
  const [username, password] = accountContent.split('\n').map(line => line.trim());
  
  console.log('Account info:');
  console.log('Username:', username);
  console.log('Password:', password);
  
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
    
    // 等待页面加载
    await page.waitForLoadState('domcontentloaded');
    
    console.log('\n=== 操作指南 ===');
    console.log('1. 浏览器已打开 Facebook 登录页面');
    console.log('2. 账号信息已显示在控制台');
    console.log('3. 请在浏览器中手动输入账号和密码');
    console.log('4. 点击蓝色的 "登录" 按钮');
    console.log('5. 登录完成后，按任意键继续');
    console.log('\nPress any key to continue after login...');
    
    // 等待用户登录
    process.stdin.setRawMode(true);
    process.stdin.resume();
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    
    // 检查是否登录成功
    try {
      await page.waitForSelector('[aria-label="你的个人资料"]', { timeout: 10000 });
      console.log('\n✓ Facebook login successful!');
    } catch (error) {
      console.log('\n✗ Facebook login failed');
      console.log('Page title:', await page.title());
    }
    
    console.log('\n=== 登录测试完成 ===');
    console.log('这是一次手动登录测试，如您要求');
    console.log('浏览器将保持打开状态，供您验证登录状态');
    console.log('\n按任意键关闭浏览器...');
    
  } catch (error) {
    console.log('\n✗ 登录测试失败:', error.message);
  }
  
  // 等待用户操作
  process.stdin.setRawMode(true);
  process.stdin.resume();
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });
  
  await browser.close();
  console.log('浏览器已关闭');
}

testFacebookManualLogin().catch(console.error);
