const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testFacebookImageButton() {
  console.log('Testing Facebook image button click...');
  
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
      
      // 方法 1: 使用 aria-label
      console.log('\n方法 1: 使用 aria-label="照片/视频"');
      try {
        console.log('正在查找 [aria-label="照片/视频"]...');
        const button1 = await page.waitForSelector('[aria-label="照片/视频"]', { timeout: 5000 });
        console.log('✓ 找到图片按钮');
        
        // 检查按钮是否可见
        const isVisible1 = await button1.isVisible();
        console.log(`按钮是否可见: ${isVisible1}`);
        
        // 检查按钮是否启用
        const isEnabled1 = await button1.isEnabled();
        console.log(`按钮是否启用: ${isEnabled1}`);
        
        // 尝试点击
        console.log('尝试点击按钮...');
        await button1.click();
        console.log('✓ 点击成功');
        
      } catch (error) {
        console.log('✗ 方法 1 失败:', error.message);
      }
      
      console.log('\n按任意键测试下一个方法...');
      process.stdin.setRawMode(true);
      process.stdin.resume();
      await new Promise(resolve => {
        process.stdin.once('data', resolve);
      });
      
      // 方法 2: 使用 XPath
      console.log('\n方法 2: 使用 XPath');
      try {
        console.log('正在查找 XPath //button[contains(text(), "照片")]...');
        const button2 = await page.waitForSelector('//button[contains(text(), "照片")]', { timeout: 5000 });
        console.log('✓ 找到图片按钮');
        
        // 检查按钮是否可见
        const isVisible2 = await button2.isVisible();
        console.log(`按钮是否可见: ${isVisible2}`);
        
        // 检查按钮是否启用
        const isEnabled2 = await button2.isEnabled();
        console.log(`按钮是否启用: ${isEnabled2}`);
        
        // 尝试点击
        console.log('尝试点击按钮...');
        await button2.click();
        console.log('✓ 点击成功');
        
      } catch (error) {
        console.log('✗ 方法 2 失败:', error.message);
      }
      
      console.log('\n按任意键测试下一个方法...');
      await new Promise(resolve => {
        process.stdin.once('data', resolve);
      });
      
      // 方法 3: 使用 force 点击
      console.log('\n方法 3: 使用 force 点击');
      try {
        console.log('正在查找 [aria-label="照片/视频"]...');
        const button3 = await page.waitForSelector('[aria-label="照片/视频"]', { timeout: 5000 });
        console.log('✓ 找到图片按钮');
        
        // 尝试强制点击
        console.log('尝试强制点击按钮...');
        await button3.click({ force: true });
        console.log('✓ 强制点击成功');
        
      } catch (error) {
        console.log('✗ 方法 3 失败:', error.message);
      }
      
      console.log('\n按任意键测试下一个方法...');
      await new Promise(resolve => {
        process.stdin.once('data', resolve);
      });
      
      // 方法 4: 模拟真实点击
      console.log('\n方法 4: 模拟真实点击');
      try {
        console.log('正在查找 [aria-label="照片/视频"]...');
        const button4 = await page.waitForSelector('[aria-label="照片/视频"]', { timeout: 5000 });
        console.log('✓ 找到图片按钮');
        
        // 模拟鼠标悬停
        console.log('模拟鼠标悬停...');
        await button4.hover();
        
        // 模拟点击
        console.log('模拟点击...');
        await button4.click({ delay: 100 });
        console.log('✓ 模拟点击成功');
        
      } catch (error) {
        console.log('✗ 方法 4 失败:', error.message);
      }
      
      console.log('\n按任意键测试上传图片...');
      await new Promise(resolve => {
        process.stdin.once('data', resolve);
      });
      
      // 测试上传图片
      console.log('\n=== 测试上传图片 ===');
      try {
        console.log('查找文件输入框...');
        const fileInput = await page.waitForSelector('input[type="file"]', { timeout: 10000 });
        console.log('✓ 找到文件输入框');
        
        // 上传图片
        const imagePath = path.join(__dirname, 'images', '1.png');
        console.log('上传图片:', imagePath);
        await fileInput.setInputFiles(imagePath);
        console.log('✓ 图片上传成功');
        
        // 等待图片上传完成
        console.log('等待图片上传完成...');
        await page.waitForTimeout(5000);
        
      } catch (error) {
        console.log('✗ 上传图片失败:', error.message);
      }
      
      console.log('\n=== 测试完成 ===');
      console.log('图片按钮测试完成');
      
    } catch (error) {
      console.log('✗ 测试失败:', error.message);
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

testFacebookImageButton().catch(console.error);
