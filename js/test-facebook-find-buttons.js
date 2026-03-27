const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testFacebookFindButtons() {
  console.log('=== Facebook 按钮查找测试 ===');
  console.log('说明：此脚本将列出页面上的所有按钮，帮助找到发帖按钮的具体属性');
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
        
        if (imageButtonFound) {
          console.log('\n=== 查找所有按钮 ===');
          console.log('正在查找页面上的所有按钮...');
          
          // 查找所有按钮
          const buttons = await page.$$('button, [role="button"]');
          console.log(`找到 ${buttons.length} 个按钮`);
          
          // 分析按钮
          console.log('\n=== 按钮分析 ===');
          console.log('序号 | 文本 | aria-label | data-testid | class');
          console.log('--- | --- | --- | --- | ---');
          
          for (let i = 0; i < buttons.length; i++) {
            const button = buttons[i];
            
            try {
              const text = await button.textContent();
              const ariaLabel = await button.getAttribute('aria-label');
              const testId = await button.getAttribute('data-testid');
              const className = await button.getAttribute('class');
              
              // 过滤空按钮
              if (text || ariaLabel || testId) {
                console.log(`${i + 1} | ${text ? text.trim().substring(0, 30) : '无'} | ${ariaLabel || '无'} | ${testId || '无'} | ${className ? className.substring(0, 50) : '无'}`);
              }
            } catch (error) {
              // 跳过错误的按钮
            }
          }
          
          console.log('\n=== 提示 ===');
          console.log('请在浏览器中手动查找发帖按钮，然后告诉我它的：');
          console.log('1. 按钮文本');
          console.log('2. aria-label 属性');
          console.log('3. data-testid 属性');
          console.log('4. 任何其他明显的特征');
          console.log('');
          console.log('我会根据这些信息创建一个更精确的选择器来点击发帖按钮。');
          
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

testFacebookFindButtons().catch(console.error);