const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testFacebookSimplePost() {
  console.log('启动 Facebook 简单发帖测试脚本...');
  
  try {
    // 启动浏览器
    const browser = await chromium.launch({
      headless: false,
      slowMo: 50
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 加载 cookie
    const cookiePath = path.join(__dirname, 'cookie', 'facebook.txt');
    if (fs.existsSync(cookiePath)) {
      try {
        const cookieContent = fs.readFileSync(cookiePath, 'utf8');
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
        
        if (cookies.length > 0) {
          console.log(`加载了 ${cookies.length} 个 cookie`);
          await context.addCookies(cookies);
        }
      } catch (error) {
        console.error('加载 cookie 失败:', error.message);
      }
    }
    
    // 打开 Facebook
    console.log('打开 Facebook 主页...');
    await page.goto('https://www.facebook.com');
    
    // 等待页面加载
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    console.log('✓ Facebook 页面加载完成');
    
    // 点击创建帖子按钮
    console.log('\n点击创建帖子按钮...');
    try {
      const createPostButton = await page.waitForSelector('[aria-label="创建帖子"]', { timeout: 30000 });
      await createPostButton.click();
      console.log('✓ 点击创建帖子按钮成功');
    } catch (error) {
      console.error('✗ 找不到创建帖子按钮:', error.message);
      await browser.close();
      return;
    }
    
    // 等待发帖卡片加载
    await page.waitForTimeout(3000);
    
    // 添加帖子内容
    console.log('\n添加帖子内容...');
    try {
      const postContent = fs.readFileSync('D:\\weibo\\tiezi\\2026-03-19_post.txt', 'utf8');
      
      // 找到文本输入框
      const textArea = await page.waitForSelector('div[contenteditable="true"]', { timeout: 15000 });
      await textArea.click();
      await textArea.evaluate((el, text) => {
        el.textContent = text;
        const event = new Event('input', { bubbles: true });
        el.dispatchEvent(event);
      }, postContent);
      console.log('✓ 文本内容添加成功');
    } catch (error) {
      console.error('✗ 添加帖子内容失败:', error.message);
    }
    
    // 等待内容渲染
    await page.waitForTimeout(2000);
    
    // 上传图片
    console.log('\n上传图片...');
    try {
      // 点击照片/视频按钮
      const mediaButton = await page.waitForSelector('[aria-label="照片/视频"]', { timeout: 15000 });
      await mediaButton.click();
      console.log('✓ 点击照片/视频按钮成功');
      
      // 等待文件输入框出现
      await page.waitForSelector('input[type="file"]', { timeout: 15000 });
      
      // 上传图片
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        const imagePath = 'D:\\weibo\\images\\1.png';
        await fileInput.setInputFiles(imagePath);
        console.log('✓ 图片上传成功');
        
        // 等待图片上传完成
        await page.waitForTimeout(8000);
      }
    } catch (error) {
      console.error('✗ 上传图片失败:', error.message);
    }
    
    // 发布帖子
    console.log('\n发布帖子...');
    try {
      // 找到发布按钮
      const publishButton = await page.waitForSelector('[aria-label="发布"]', { timeout: 30000 });
      await publishButton.click();
      console.log('✓ 点击发布按钮成功');
      
      // 等待发布完成
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      console.log('✓ 发布完成');
    } catch (error) {
      console.error('✗ 发布帖子失败:', error.message);
    }
    
    // 等待用户操作
    console.log('\n测试完成，按任意键关闭浏览器...');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    await new Promise(resolve => process.stdin.once('data', resolve));
    
    await browser.close();
    console.log('浏览器已关闭');
    
  } catch (error) {
    console.error('✗ 测试失败:', error.message);
  }
}

testFacebookSimplePost();