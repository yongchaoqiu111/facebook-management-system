const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testFacebookKeepOpen() {
  console.log('=== Facebook 保持浏览器打开测试 ===');
  console.log('说明：此脚本将保持浏览器打开，直到您明确指示关闭');
  console.log('请按照提示进行操作，浏览器不会自动关闭');
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
      slowMo: 50,
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
    
    console.log('\n=== 检测登录状态 ===');
    
    // 检查创建帖子按钮
    let hasCreatePostButton = false;
    try {
      console.log('正在检查创建帖子按钮...');
      await page.waitForSelector('[aria-label="创建帖子"]', { timeout: 10000 });
      hasCreatePostButton = true;
      console.log('✓ 创建帖子按钮存在');
    } catch (error) {
      console.log('✗ 创建帖子按钮不存在:', error.message);
    }
    
    // 检查登录按钮
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
      console.log('\n=== 打开帖子创建对话框 ===');
      
      try {
        // 点击创建帖子按钮
        console.log('点击创建帖子按钮...');
        await page.click('[aria-label="创建帖子"]');
        
        // 等待帖子对话框
        try {
          await page.waitForSelector('[aria-label="你想分享什么？"]', { timeout: 15000 });
          console.log('✓ 打开帖子创建对话框成功');
        } catch (error) {
          console.log('⚠ 未找到帖子对话框，等待用户确认...');
          console.log('请检查浏览器是否打开了帖子创建对话框');
        }
        
        console.log('\n=== 测试图片按钮 ===');
        console.log('请在浏览器中查找图片按钮（通常带有相机图标）');
        console.log('');
        console.log('如果您看到图片按钮，请将鼠标移动到按钮上');
        console.log('然后按任意键，我会尝试获取按钮信息并点击');
        console.log('');
        console.log('如果您看不到图片按钮，请直接按任意键，我们将尝试其他方法');
        
        // 等待用户输入
        process.stdin.setRawMode(true);
        process.stdin.resume();
        await new Promise(resolve => {
          process.stdin.once('data', resolve);
        });
        
        // 尝试查找图片按钮
        console.log('\n尝试查找图片按钮...');
        
        const selectors = [
          '[aria-label="照片/视频"]',
          '[aria-label="照片和视频"]',
          '[aria-label="Photo/Video"]',
          '//button[contains(text(), "照片")]',
          '//button[contains(text(), "视频")]',
          '//*[contains(@aria-label, "相机")]'
        ];
        
        let buttonFound = false;
        
        for (const selector of selectors) {
          try {
            const button = await page.waitForSelector(selector, { timeout: 3000 });
            console.log(`✓ 找到按钮: ${selector}`);
            
            // 获取按钮信息
            const boundingBox = await button.boundingBox();
            const isVisible = await button.isVisible();
            const isEnabled = await button.isEnabled();
            
            console.log(`  位置: x=${boundingBox.x.toFixed(2)}, y=${boundingBox.y.toFixed(2)}`);
            console.log(`  大小: width=${boundingBox.width.toFixed(2)}, height=${boundingBox.height.toFixed(2)}`);
            console.log(`  可见: ${isVisible}`);
            console.log(`  启用: ${isEnabled}`);
            
            // 尝试点击
            console.log('  尝试点击...');
            try {
              await button.click();
              console.log('  ✓ 点击成功');
              buttonFound = true;
              
              // 等待文件选择对话框
              console.log('  等待文件选择对话框...');
              await page.waitForTimeout(2000);
              
              // 检查文件输入框
              try {
                const fileInput = await page.waitForSelector('input[type="file"]', { timeout: 5000 });
                console.log('  ✓ 找到文件输入框');
                
                // 上传图片
                const imagePath = path.join(__dirname, 'images', '1.png');
                if (fs.existsSync(imagePath)) {
                  console.log(`  上传图片: ${imagePath}`);
                  await fileInput.setInputFiles(imagePath);
                  console.log('  ✓ 图片上传成功');
                  await page.waitForTimeout(5000);
                } else {
                  console.log('  ✗ 图片文件不存在');
                }
              } catch (error) {
                console.log('  ✗ 未找到文件输入框:', error.message);
              }
              
              break;
            } catch (error) {
              console.log('  ✗ 点击失败:', error.message);
              
              // 尝试强制点击
              try {
                console.log('  尝试强制点击...');
                await button.click({ force: true });
                console.log('  ✓ 强制点击成功');
                buttonFound = true;
                break;
              } catch (error) {
                console.log('  ✗ 强制点击失败:', error.message);
              }
            }
          } catch (error) {
            // 继续尝试下一个选择器
          }
        }
        
        if (!buttonFound) {
          console.log('\n✗ 未找到图片按钮');
          console.log('请手动在浏览器中查找并点击图片按钮');
        }
        
      } catch (error) {
        console.log('✗ 操作失败:', error.message);
        console.log('浏览器保持打开状态，请手动操作');
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

testFacebookKeepOpen().catch(console.error);