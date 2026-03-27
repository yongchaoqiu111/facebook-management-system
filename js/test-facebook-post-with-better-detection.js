const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testFacebookPostWithBetterDetection() {
  console.log('Testing Facebook post with better login detection...');
  
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
  
  // 方法2: 检查创建帖子按钮
  let hasCreatePostButton = false;
  try {
    console.log('正在检查创建帖子按钮...');
    await page.waitForSelector('[aria-label="创建帖子"]', { timeout: 5000 });
    hasCreatePostButton = true;
    console.log('✓ 创建帖子按钮存在');
  } catch (error) {
    console.log('✗ 创建帖子按钮不存在');
  }
  
  // 方法3: 检查登录按钮
  let hasLoginButton = false;
  try {
    console.log('正在检查登录按钮...');
    await page.waitForSelector('button[data-testid="royal_login_button"]', { timeout: 5000 });
    hasLoginButton = true;
    console.log('✗ 登录按钮存在');
  } catch (error) {
    console.log('✓ 登录按钮不存在');
  }
  
  // 判断登录状态
  const isLoggedIn = hasCreatePostButton && !hasLoginButton;
  console.log(`\n登录状态: ${isLoggedIn ? '已登录' : '未登录'}`);
  
  if (isLoggedIn) {
    console.log('\n=== 开始测试发图功能 ===');
    
    try {
      // 点击创建帖子按钮
      console.log('点击创建帖子按钮...');
      await page.click('[aria-label="创建帖子"]');
      await page.waitForSelector('[aria-label="你想分享什么？"]', { timeout: 10000 });
      console.log('✓ 打开帖子创建对话框');
      
      // 输入帖子内容
      console.log('输入帖子内容...');
      await page.fill('[aria-label="你想分享什么？"]', '测试 Facebook 发图文贴功能 - 改进的登录检测');
      console.log('✓ 输入帖子内容');
      
      // 点击添加图片按钮
      console.log('点击添加图片按钮...');
      await page.click('[aria-label="照片/视频"]');
      
      // 上传图片
      const fileInput = await page.waitForSelector('input[type="file"]', { timeout: 10000 });
      const imagePath = path.join(__dirname, 'images', '1.png');
      await fileInput.setInputFiles(imagePath);
      console.log('✓ 上传图片:', imagePath);
      
      // 等待图片上传完成
      console.log('等待图片上传完成...');
      await page.waitForTimeout(5000);
      
      console.log('\n=== 操作完成 ===');
      console.log('Facebook 发图文贴功能测试完成');
      console.log('帖子内容：测试 Facebook 发图文贴功能 - 改进的登录检测');
      console.log('图片：', imagePath);
      
    } catch (error) {
      console.log('✗ 发图功能测试失败:', error.message);
    }
  } else {
    console.log('\n=== 未登录 ===');
    console.log('请先登录 Facebook');
  }
  
  console.log('\n按任意键关闭浏览器...');
  
  // 等待用户操作
  process.stdin.setRawMode(true);
  process.stdin.resume();
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });
  
  await browser.close();
  console.log('浏览器已关闭');
}

testFacebookPostWithBetterDetection().catch(console.error);
