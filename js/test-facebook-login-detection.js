const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testFacebookLoginDetection() {
  console.log('Testing Facebook login detection...');
  
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
  
  console.log('\n=== 检测登录状态 ===');
  
  // 方法 1: 检查个人资料图标
  console.log('1. 检查个人资料图标...');
  try {
    await page.waitForSelector('[aria-label="你的个人资料"]', { timeout: 5000 });
    console.log('✓ 个人资料图标存在，已登录');
  } catch (error) {
    console.log('✗ 个人资料图标不存在');
  }
  
  // 方法 2: 检查登录按钮
  console.log('2. 检查登录按钮...');
  try {
    await page.waitForSelector('button[data-testid="royal_login_button"]', { timeout: 5000 });
    console.log('✗ 登录按钮存在，未登录');
  } catch (error) {
    console.log('✓ 登录按钮不存在，可能已登录');
  }
  
  // 方法 3: 检查页面标题
  console.log('3. 检查页面标题...');
  const title = await page.title();
  console.log(`页面标题: ${title}`);
  if (title.includes('Facebook')) {
    console.log('✓ 页面标题包含 Facebook');
  }
  
  // 方法 4: 检查 URL
  console.log('4. 检查 URL...');
  const url = await page.url();
  console.log(`当前 URL: ${url}`);
  if (url.includes('facebook.com')) {
    console.log('✓ URL 包含 facebook.com');
  }
  
  // 方法 5: 检查页面内容
  console.log('5. 检查页面内容...');
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
  
  console.log('\n=== 检测完成 ===');
  console.log('浏览器将保持打开状态，供您验证登录状态');
  console.log('按任意键关闭浏览器...');
  
  // 等待用户操作
  process.stdin.setRawMode(true);
  process.stdin.resume();
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });
  
  await browser.close();
  console.log('浏览器已关闭');
}

testFacebookLoginDetection().catch(console.error);
