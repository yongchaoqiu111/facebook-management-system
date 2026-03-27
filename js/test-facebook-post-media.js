const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testFacebookPostMedia() {
  console.log('Testing Facebook post media functionality...');
  
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
    slowMo: 100
  });
  
  const context = await browser.newContext();
  
  // 添加 cookie
  for (const cookie of cookies) {
    await context.addCookies([cookie]);
  }
  
  // 打开 Facebook
  const page = await context.newPage();
  await page.goto('https://www.facebook.com', { timeout: 60000 });
  
  // 等待页面加载
  await page.waitForLoadState('domcontentloaded', { timeout: 60000 });
  
  try {
    // 检查是否登录成功
    await page.waitForSelector('[aria-label="你的个人资料"]', { timeout: 20000 });
    console.log('✓ Facebook login successful!');
    
    // 点击创建帖子按钮
    await page.click('[aria-label="创建帖子"]');
    await page.waitForSelector('[aria-label="你想分享什么？"]');
    console.log('✓ Opened post creation dialog');
    
    // 输入帖子内容
    await page.fill('[aria-label="你想分享什么？"]', '测试 Facebook 自动发图片和贴文功能');
    console.log('✓ Entered post content');
    
    // 点击添加图片按钮
    await page.click('[aria-label="照片/视频"]');
    
    // 上传图片
    const fileInput = await page.waitForSelector('input[type="file"]');
    const imagePath = path.join(__dirname, 'images', '1.png');
    await fileInput.setInputFiles(imagePath);
    console.log('✓ Uploaded image');
    
    // 等待图片上传完成
    await page.waitForTimeout(3000);
    
    // 点击发布按钮
    // 注意：这里使用 draft 模式，不会真正发布
    console.log('✓ Post prepared (draft mode)');
    
  } catch (error) {
    console.log('✗ Facebook post media failed:', error.message);
  }
  
  // 等待用户操作
  console.log('Press any key to close...');
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', async () => {
    await browser.close();
    process.exit(0);
  });
}

testFacebookPostMedia().catch(console.error);
