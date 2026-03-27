const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testFacebookEnterPublish() {
  console.log('=== Facebook 回车发布测试 ===');
  console.log('说明：此脚本将在上传图片后尝试按回车键发布帖子');
  console.log('');
  
  let browser = null;
  
  try {
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
    
    console.log(`加载了 ${cookies.length} 个 cookies`);
    
    // 启动浏览器
    console.log('启动浏览器...');
    browser = await chromium.launch({
      headless: false,
      slowMo: 30,
      args: ['--start-maximized']
    });
    
    const context = await browser.newContext({
      viewport: null
    });
    
    // 添加 cookie
    for (const cookie of cookies) {
      await context.addCookies([cookie]);
    }
    
    // 打开 Facebook
    console.log('打开 Facebook...');
    const page = await context.newPage();
    await page.goto('https://www.facebook.com');
    
    // 等待页面加载
    await page.waitForLoadState('domcontentloaded');
    console.log('页面加载完成');
    
    // 检查登录状态
    console.log('\n=== 检测登录状态 ===');
    
    let hasCreatePostButton = false;
    try {
      console.log('正在检查创建帖子按钮...');
      await page.waitForSelector('[aria-label="创建帖子"]', { timeout: 10000 });
      hasCreatePostButton = true;
      console.log('✓ 创建帖子按钮存在');
    } catch (error) {
      console.log('✗ 创建帖子按钮不存在:', error.message);
    }
    
    if (hasCreatePostButton) {
      console.log('\n=== 打开帖子创建界面 ===');
      
      try {
        // 点击创建帖子按钮
        console.log('点击创建帖子按钮...');
        await page.click('[aria-label="创建帖子"]', { force: true });
        console.log('✓ 点击成功');
        
        // 等待帖子界面加载
        await page.waitForTimeout(3000);
        console.log('✓ 帖子界面加载完成');
        
        console.log('\n=== 上传图片 ===');
        
        // 查找并点击图片按钮
        const imageButtonSelectors = [
          '[aria-label="照片/视频"]',
          '[aria-label="照片和视频"]',
          '[aria-label="Photo/Video"]'
        ];
        
        let imageButtonFound = false;
        
        for (const selector of imageButtonSelectors) {
          try {
            console.log(`尝试选择器: ${selector}`);
            const button = await page.waitForSelector(selector, { timeout: 5000 });
            console.log('✓ 找到图片按钮');
            
            // 点击图片按钮
            await button.click({ force: true });
            console.log('✓ 点击图片按钮成功');
            imageButtonFound = true;
            
            // 等待文件选择对话框
            await page.waitForTimeout(3000);
            
            // 上传图片
            const fileInput = await page.$('input[type="file"]');
            if (fileInput) {
              const imagePath = path.join(__dirname, 'images', '1.png');
              if (fs.existsSync(imagePath)) {
                await fileInput.setInputFiles(imagePath);
                console.log('✓ 图片上传成功');
                
                // 等待上传完成
                console.log('等待图片上传完成...');
                await page.waitForTimeout(10000);
                
                // 尝试按回车键发布
                console.log('\n=== 尝试按回车键发布 ===');
                console.log('按回车键...');
                await page.keyboard.press('Enter');
                console.log('✓ 按回车键成功');
                
                // 等待发布完成
                console.log('等待发布完成...');
                await page.waitForTimeout(8000);
                
                console.log('\n=== 发布完成 ===');
                console.log('帖子已发布成功！');
              } else {
                console.log('✗ 图片文件不存在');
              }
            } else {
              console.log('✗ 未找到文件输入框');
            }
            
            break;
          } catch (error) {
            console.log('✗ 未找到图片按钮:', error.message);
          }
        }
        
      } catch (error) {
        console.log('✗ 操作失败:', error.message);
      }
    } else {
      console.log('\n=== 未登录 ===');
      console.log('请手动登录 Facebook');
    }
    
    console.log('\n=== 测试完成 ===');
    console.log('浏览器保持打开状态，您可以手动进行操作');
    console.log('');
    console.log('当您完成测试后，请按任意键关闭浏览器');
    
  } catch (error) {
    console.log('✗ 发生错误:', error.message);
    console.log('浏览器保持打开状态，请手动检查');
    console.log('');
    console.log('按任意键关闭浏览器');
  }
  
  // 等待用户输入
  process.stdin.setRawMode(true);
  process.stdin.resume();
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });
  
  // 关闭浏览器
  if (browser) {
    await browser.close();
    console.log('浏览器已关闭');
  }
}

testFacebookEnterPublish().catch(console.error);