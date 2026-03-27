const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testFacebookActualPost() {
  console.log('Testing Facebook actual post with image...');
  
  // 读取 Facebook cookie 文件
  const cookiePath = path.join(__dirname, '..', 'cookie', 'facebook.txt');
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
    console.log('Checking login status...');
    await page.waitForSelector('[aria-label="你的个人资料"]', { timeout: 20000 });
    console.log('✓ Facebook login successful!');
    
    // 点击创建帖子按钮
    console.log('Opening post creation dialog...');
    await page.click('[aria-label="创建帖子"]');
    await page.waitForSelector('[aria-label="你想分享什么？"]', { timeout: 10000 });
    console.log('✓ Opened post creation dialog');
    
    // 输入帖子内容
    console.log('Entering post content...');
    await page.fill('[aria-label="你想分享什么？"]', '测试 Facebook 自动发图片功能 - 真实发布');
    console.log('✓ Entered post content');
    
    // 点击添加图片按钮
    console.log('Adding image...');
    await page.click('[aria-label="照片/视频"]');
    
    // 上传图片
    const fileInput = await page.waitForSelector('input[type="file"]', { timeout: 10000 });
    const imagePath = path.join(__dirname, '..', 'images', '1.png');
    await fileInput.setInputFiles(imagePath);
    console.log('✓ Uploaded image:', imagePath);
    
    // 等待图片上传完成
    console.log('Waiting for image upload...');
    await page.waitForTimeout(5000);
    
    // 点击发布按钮
    console.log('Preparing to publish...');
    // 注意：这里注释掉发布按钮点击，避免实际发布
    // await page.click('[aria-label="发布"]');
    // await page.waitForLoadState('networkidle');
    // console.log('✓ Post published successfully!');
    
    console.log('✓ Post prepared successfully (draft mode)');
    console.log('\n=== 操作完成 ===');
    console.log('Facebook 发带图片的贴文功能已测试完成');
    console.log('当前处于草稿模式，未实际发布');
    console.log('如果需要实际发布，请取消注释发布按钮点击代码');
    
  } catch (error) {
    console.log('✗ Facebook post media failed:', error.message);
  }
  
  // 等待用户操作
  console.log('\nPress any key to close...');
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', async () => {
    await browser.close();
    process.exit(0);
  });
}

testFacebookActualPost().catch(console.error);
