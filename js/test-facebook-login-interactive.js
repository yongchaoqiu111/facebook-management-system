const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testFacebookLoginInteractive() {
  console.log('Testing Facebook login detection interactively...');
  
  // 读取 Facebook cookie 文件
  const cookiePath = path.join(__dirname, 'cookie', 'facebook.txt');
  const cookieContent = fs.readFileSync(cookiePath, 'utf8');
  
  // 解析 cookie
  const cookies = cookieContent.split('\n').map(line => {
    const parts = line.split('\t');
    if (parts.length >= 7) {
      const cookie = {
        name: parts[0],
        value: parts[1],
        domain: parts[2],
        path: parts[3],
        httpOnly: parts[5] === '✓',
        secure: parts[6] === '✓'
      };
      
      // 处理过期时间
      const expiresStr = parts[4];
      if (expiresStr && expiresStr !== '会话') {
        const expires = new Date(expiresStr);
        if (!isNaN(expires.getTime())) {
          cookie.expires = expires.getTime() / 1000;
        }
      }
      
      return cookie;
    }
    return null;
  }).filter(Boolean);
  
  console.log(`Loaded ${cookies.length} cookies`);
  
  // 启动浏览器
  const browser = await chromium.launch({
    headless: false,
    slowMo: 50
  });
  
  const context = await browser.newContext();
  
  // 添加 cookie
  for (const cookie of cookies) {
    await context.addCookies([cookie]);
  }
  
  // 打开 Facebook
  const page = await context.newPage();
  await page.goto('https://www.facebook.com');
  
  // 等待页面加载
  await page.waitForLoadState('domcontentloaded');
  
  console.log('\n=== 浏览器已打开 ===');
  console.log('现在请检查浏览器中的登录状态');
  console.log('\n按任意键开始检测登录状态...');
  
  // 等待用户输入
  process.stdin.setRawMode(true);
  process.stdin.resume();
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });
  
  console.log('\n=== 开始检测登录状态 ===');
  
  // 方法 1: 检查个人资料图标
  console.log('\n方法 1: 检查个人资料图标');
  try {
    console.log('正在检查 [aria-label="你的个人资料"]...');
    await page.waitForSelector('[aria-label="你的个人资料"]', { timeout: 5000 });
    console.log('✓ 个人资料图标存在，已登录');
  } catch (error) {
    console.log('✗ 个人资料图标不存在');
  }
  
  console.log('\n按任意键测试下一个方法...');
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });
  
  // 方法 2: 检查创建帖子按钮
  console.log('\n方法 2: 检查创建帖子按钮');
  try {
    console.log('正在检查 [aria-label="创建帖子"]...');
    await page.waitForSelector('[aria-label="创建帖子"]', { timeout: 5000 });
    console.log('✓ 创建帖子按钮存在，可能已登录');
  } catch (error) {
    console.log('✗ 创建帖子按钮不存在');
  }
  
  console.log('\n按任意键测试下一个方法...');
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });
  
  // 方法 3: 检查登录按钮
  console.log('\n方法 3: 检查登录按钮');
  try {
    console.log('正在检查 button[data-testid="royal_login_button"]...');
    await page.waitForSelector('button[data-testid="royal_login_button"]', { timeout: 5000 });
    console.log('✗ 登录按钮存在，未登录');
  } catch (error) {
    console.log('✓ 登录按钮不存在，可能已登录');
  }
  
  console.log('\n按任意键测试下一个方法...');
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });
  
  // 方法 4: 检查页面标题
  console.log('\n方法 4: 检查页面标题');
  const title = await page.title();
  console.log(`页面标题: ${title}`);
  if (title.includes('Facebook')) {
    console.log('✓ 页面标题包含 Facebook');
  }
  
  console.log('\n按任意键测试下一个方法...');
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });
  
  // 方法 5: 检查 URL
  console.log('\n方法 5: 检查 URL');
  const url = await page.url();
  console.log(`当前 URL: ${url}`);
  if (url.includes('facebook.com')) {
    console.log('✓ URL 包含 facebook.com');
  }
  if (url.includes('login')) {
    console.log('✗ URL 包含 login，可能未登录');
  }
  
  console.log('\n按任意键测试下一个方法...');
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });
  
  // 方法 6: 检查页面内容
  console.log('\n方法 6: 检查页面内容');
  const content = await page.content();
  if (content.includes('你的个人资料')) {
    console.log('✓ 页面包含"你的个人资料"');
  }
  if (content.includes('创建帖子')) {
    console.log('✓ 页面包含"创建帖子"');
  }
  if (content.includes('登录')) {
    console.log('✗ 页面包含"登录"');
  }
  if (content.includes('密码')) {
    console.log('✗ 页面包含"密码"');
  }
  
  console.log('\n=== 检测完成 ===');
  console.log('浏览器将保持打开状态，供您验证');
  console.log('按任意键关闭浏览器...');
  
  // 等待用户操作
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });
  
  await browser.close();
  console.log('浏览器已关闭');
}

testFacebookLoginInteractive().catch(console.error);
