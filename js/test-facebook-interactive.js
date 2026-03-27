const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testFacebookInteractive() {
  console.log('=== Facebook 交互式测试 ===');
  console.log('说明：此脚本将保持浏览器打开，需要您的交互来协助测试');
  
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
  const browser = await chromium.launch({
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
  const page = await context.newPage();
  await page.goto('https://www.facebook.com');
  
  // 等待页面加载
  await page.waitForLoadState('domcontentloaded');
  
  console.log('\n=== 检测登录状态 ===');
  
  // 检查创建帖子按钮
  let hasCreatePostButton = false;
  try {
    console.log('正在检查创建帖子按钮...');
    await page.waitForSelector('[aria-label="创建帖子"]', { timeout: 5000 });
    hasCreatePostButton = true;
    console.log('✓ 创建帖子按钮存在');
  } catch (error) {
    console.log('✗ 创建帖子按钮不存在');
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
      await page.waitForSelector('[aria-label="你想分享什么？"]', { timeout: 10000 });
      console.log('✓ 打开帖子创建对话框');
      
      // 输入帖子内容
      console.log('输入帖子内容...');
      await page.fill('[aria-label="你想分享什么？"]', '测试 Facebook 图片按钮');
      console.log('✓ 输入帖子内容');
      
      console.log('\n=== 交互式测试图片按钮 ===');
      console.log('请观察浏览器中的帖子创建对话框');
      console.log('图片按钮通常位于对话框底部，带有相机或图片图标');
      console.log('');
      console.log('1. 如果你看到图片按钮，请将鼠标移动到按钮上');
      console.log('2. 然后按任意键，我会尝试获取按钮的位置和属性');
      console.log('3. 如果你看不到图片按钮，请直接按任意键，我们将尝试其他方法');
      
      // 等待用户输入
      process.stdin.setRawMode(true);
      process.stdin.resume();
      await new Promise(resolve => {
        process.stdin.once('data', resolve);
      });
      
      console.log('\n=== 尝试查找图片按钮 ===');
      
      // 测试所有可能的选择器
      const selectors = [
        { name: 'aria-label="照片/视频"', selector: '[aria-label="照片/视频"]' },
        { name: 'aria-label="照片和视频"', selector: '[aria-label="照片和视频"]' },
        { name: 'aria-label="Photo/Video"', selector: '[aria-label="Photo/Video"]' },
        { name: '包含"照片"的按钮', selector: '//button[contains(text(), "照片")]' },
        { name: '包含"视频"的按钮', selector: '//button[contains(text(), "视频")]' },
        { name: '包含"Photo"的按钮', selector: '//button[contains(text(), "Photo")]' },
        { name: '包含"Video"的按钮', selector: '//button[contains(text(), "Video")]' },
        { name: 'class包含"photo"的元素', selector: '//div[contains(@class, "photo")]' },
        { name: 'class包含"media"的元素', selector: '//div[contains(@class, "media")]' },
        { name: '相机图标', selector: '//*[contains(@aria-label, "相机")]' }
      ];
      
      let buttonFound = false;
      
      for (const { name, selector } of selectors) {
        console.log(`\n尝试 ${name}: ${selector}`);
        
        try {
          const button = await page.waitForSelector(selector, { timeout: 3000 });
          console.log('✓ 找到按钮');
          
          // 获取按钮信息
          const boundingBox = await button.boundingBox();
          const isVisible = await button.isVisible();
          const isEnabled = await button.isEnabled();
          const text = await button.textContent();
          const attributes = await button.evaluate(node => {
            const attrs = {};
            for (let i = 0; i < node.attributes.length; i++) {
              attrs[node.attributes[i].name] = node.attributes[i].value;
            }
            return attrs;
          });
          
          console.log(`  位置: x=${boundingBox.x.toFixed(2)}, y=${boundingBox.y.toFixed(2)}`);
          console.log(`  大小: width=${boundingBox.width.toFixed(2)}, height=${boundingBox.height.toFixed(2)}`);
          console.log(`  可见: ${isVisible}`);
          console.log(`  启用: ${isEnabled}`);
          console.log(`  文本: ${text || '无'}`);
          console.log(`  属性: ${JSON.stringify(attributes, null, 2)}`);
          
          // 尝试点击
          console.log('  尝试点击...');
          try {
            await button.click();
            console.log('  ✓ 点击成功');
            buttonFound = true;
            
            // 等待文件选择对话框
            console.log('  等待文件选择对话框...');
            await page.waitForTimeout(2000);
            
            // 检查是否有文件输入框
            try {
              const fileInput = await page.waitForSelector('input[type="file"]', { timeout: 5000 });
              console.log('  ✓ 找到文件输入框');
              
              // 尝试上传图片
              const imagePath = path.join(__dirname, 'images', '1.png');
              if (fs.existsSync(imagePath)) {
                console.log(`  上传图片: ${imagePath}`);
                await fileInput.setInputFiles(imagePath);
                console.log('  ✓ 图片上传成功');
                
                // 等待上传完成
                console.log('  等待图片上传完成...');
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
          console.log('✗ 未找到:', error.message);
        }
      }
      
      if (!buttonFound) {
        console.log('\n=== 未找到图片按钮 ===');
        console.log('请尝试以下操作:');
        console.log('1. 手动在浏览器中找到图片按钮');
        console.log('2. 按任意键继续，我会尝试获取页面所有按钮');
        
        // 等待用户输入
        await new Promise(resolve => {
          process.stdin.once('data', resolve);
        });
        
        // 获取所有按钮
        console.log('\n=== 获取页面所有按钮 ===');
        const buttons = await page.$$('button');
        console.log(`找到 ${buttons.length} 个按钮`);
        
        for (let i = 0; i < Math.min(20, buttons.length); i++) {
          const button = buttons[i];
          const text = await button.textContent();
          const ariaLabel = await button.getAttribute('aria-label');
          const testId = await button.getAttribute('data-testid');
          
          if (text || ariaLabel || testId) {
            console.log(`按钮 ${i + 1}:`);
            console.log(`  文本: ${text || '无'}`);
            console.log(`  aria-label: ${ariaLabel || '无'}`);
            console.log(`  data-testid: ${testId || '无'}`);
          }
        }
      }
      
      console.log('\n=== 测试完成 ===');
      console.log('浏览器将保持打开状态，您可以手动检查');
      console.log('按任意键关闭浏览器...');
      
    } catch (error) {
      console.log('✗ 测试失败:', error.message);
      console.log('按任意键关闭浏览器...');
    }
  } else {
    console.log('\n=== 未登录 ===');
    console.log('请先登录 Facebook');
    console.log('按任意键关闭浏览器...');
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

testFacebookInteractive().catch(console.error);