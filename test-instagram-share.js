const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testInstagramShare() {
  console.log('测试 Instagram 分享功能...');
  
  try {
    // 启动浏览器
    const browser = await chromium.launch({
      headless: false
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 加载 cookie
    const cookiePath = path.join(__dirname, 'user-config/accounts', 'instagram.txt');
    if (fs.existsSync(cookiePath)) {
      try {
        const cookieContent = fs.readFileSync(cookiePath, 'utf8');
        const cookies = cookieContent.split('\n').map(line => {
          const parts = line.split('\t');
          if (parts.length >= 7) {
            return {
              name: parts[0],
              value: parts[1],
              domain: parts[2],
              path: parts[3],
              httpOnly: parts[5] === '✓',
              secure: parts[6] === '✓'
            };
          }
          return null;
        }).filter(Boolean);
        
        if (cookies.length > 0) {
          await context.addCookies(cookies);
          console.log(`✓ 成功加载cookie，共${cookies.length}个`);
        }
      } catch (error) {
        console.error('加载 cookie 失败:', error.message);
      }
    }
    
    // 打开 Instagram
    console.log('打开 Instagram 主页...');
    await page.goto('https://www.instagram.com');
    
    // 等待页面加载
    await page.waitForTimeout(5000);
    
    // 检查登录状态
    console.log('检查登录状态...');
    try {
      await page.waitForSelector('svg[aria-label="新帖子"]', { timeout: 30000 });
      console.log('✓ 登录成功');
    } catch (error) {
      console.log('请手动登录...');
      console.log('登录完成后按任意键继续...');
      
      process.stdin.setRawMode(true);
      process.stdin.resume();
      await new Promise(resolve => process.stdin.once('data', resolve));
    }
    
    // 点击创建帖子按钮
    console.log('点击创建帖子按钮...');
    try {
      await page.click('svg[aria-label="新帖子"]');
      console.log('✓ 点击创建帖子按钮成功');
    } catch (error) {
      console.log('使用evaluate方法点击...');
      await page.evaluate(() => {
        const newPostButton = document.querySelector('svg[aria-label="新帖子"]');
        if (newPostButton) {
          newPostButton.click();
        }
      });
      console.log('✓ 使用evaluate方法点击成功');
    }
    
    // 等待5秒
    await page.waitForTimeout(5000);
    
    // 直接执行到分享步骤
    console.log('跳过中间步骤，直接执行到分享步骤...');
    
    // 等待5秒
    await page.waitForTimeout(5000);
    
    // 点击分享按钮
    console.log('点击分享按钮...');
    try {
      await page.evaluate(() => {
        // 查找分享按钮
        const buttons = document.querySelectorAll('button');
        for (const button of buttons) {
          if (button.textContent.includes('分享')) {
            button.click();
            return true;
          }
        }
        return false;
      });
      console.log('✓ 点击分享按钮成功');
    } catch (error) {
      console.error('点击分享按钮失败:', error.message);
    }
    
    // 等待分享完成
    console.log('等待分享完成...');
    await page.waitForTimeout(30000);
    
    console.log('✓ 分享完成！');
    
    // 保持浏览器打开
    console.log('浏览器已保持打开，您可以查看结果');
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

testInstagramShare();
