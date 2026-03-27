const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testFacebookImageButton() {
  console.log('=== Facebook 图片按钮测试 (保持浏览器打开) ===');
  
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
      await page.fill('[aria-label="你想分享什么？"]', '测试 Facebook 图片按钮点击');
      console.log('✓ 输入帖子内容');
      
      console.log('\n=== 测试图片按钮点击 ===');
      
      // 测试所有可能的选择器
      const selectors = [
        '[aria-label="照片/视频"]',
        '//button[contains(text(), "照片")]',
        '//button[contains(text(), "视频")]',
        '//div[contains(@class, "photo")]',
        '//div[contains(@aria-label, "照片")]'
      ];
      
      let buttonFound = false;
      
      for (let i = 0; i < selectors.length; i++) {
        const selector = selectors[i];
        console.log(`\n尝试选择器 ${i + 1}: ${selector}`);
        
        try {
          const button = await page.waitForSelector(selector, { timeout: 5000 });
          console.log('✓ 找到图片按钮');
          
          // 检查按钮状态
          const isVisible = await button.isVisible();
          const isEnabled = await button.isEnabled();
          console.log(`按钮可见: ${isVisible}, 按钮启用: ${isEnabled}`);
          
          // 尝试多种点击方式
          const clickMethods = [
            { name: '普通点击', options: {} },
            { name: '强制点击', options: { force: true } },
            { name: '延迟点击', options: { delay: 100 } }
          ];
          
          for (const method of clickMethods) {
            console.log(`尝试 ${method.name}...`);
            try {
              await button.click(method.options);
              console.log(`✓ ${method.name} 成功`);
              buttonFound = true;
              break;
            } catch (error) {
              console.log(`✗ ${method.name} 失败: ${error.message}`);
            }
          }
          
          if (buttonFound) {
            break;
          }
          
        } catch (error) {
          console.log('✗ 未找到按钮:', error.message);
        }
      }
      
      if (buttonFound) {
        console.log('\n=== 测试上传图片 ===');
        try {
          console.log('查找文件输入框...');
          const fileInput = await page.waitForSelector('input[type="file"]', { timeout: 10000 });
          console.log('✓ 找到文件输入框');
          
          // 上传图片
          const imagePath = path.join(__dirname, 'images', '1.png');
          if (fs.existsSync(imagePath)) {
            console.log('上传图片:', imagePath);
            await fileInput.setInputFiles(imagePath);
            console.log('✓ 图片上传成功');
            
            // 等待图片上传完成
            console.log('等待图片上传完成...');
            await page.waitForTimeout(5000);
          } else {
            console.log('✗ 图片文件不存在:', imagePath);
          }
          
        } catch (error) {
          console.log('✗ 上传图片失败:', error.message);
        }
      } else {
        console.log('\n✗ 所有选择器都未找到图片按钮');
      }
      
      console.log('\n=== 测试完成 ===');
      console.log('图片按钮测试完成');
      console.log('浏览器保持打开状态，请手动关闭或按任意键关闭');
      
    } catch (error) {
      console.log('✗ 测试失败:', error.message);
    }
  } else {
    console.log('\n=== 未登录 ===');
    console.log('请先登录 Facebook');
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

testFacebookImageButton().catch(console.error);