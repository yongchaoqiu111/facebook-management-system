const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function clickGroupAndWait() {
  console.log('打开浏览器...');
  
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-notifications']
  });
  
  const page = await browser.newPage();
  const cookiePath = path.join(__dirname, 'cookie', 'facebook.txt');
  
  // 加载cookie
  if (fs.existsSync(cookiePath)) {
    try {
      const cookieContent = fs.readFileSync(cookiePath, 'utf-8');
      const cookies = [];
      const lines = cookieContent.trim().split('\n');
      
      for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length >= 7) {
          const [name, value, domain, path, expiresStr, httpOnlyStr, secureStr] = parts;
          let expires;
          if (expiresStr !== '会话') {
            const expiresDate = new Date(expiresStr);
            if (!isNaN(expiresDate.getTime())) {
              expires = Math.floor(expiresDate.getTime() / 1000);
            }
          }
          cookies.push({
            name,
            value,
            domain,
            path,
            expires,
            httpOnly: httpOnlyStr === '✓',
            secure: secureStr === '✓',
            sameSite: 'Lax'
          });
        }
      }
      
      if (cookies.length > 0) {
        await page.context().addCookies(cookies);
        console.log(`成功加载cookie，共${cookies.length}个`);
      }
    } catch (error) {
      console.error('加载cookie失败:', error);
    }
  }
  
  // 打开Facebook主页
  await page.goto('https://www.facebook.com', { timeout: 60000 });
  console.log('已打开Facebook主页');
  
  // 判断是否到达主页
  console.log('正在判断是否到达主页...');
  await page.waitForLoadState('networkidle');
  
  const isHomePage = await page.evaluate(() => {
    const hasPostButton = !!document.querySelector('[aria-label="发帖"]') || 
                        !!document.querySelector('[aria-label="Create Post"]') ||
                        !!document.querySelector('[data-testid="create-post-button"]');
    
    const hasNavigation = !!document.querySelector('[role="navigation"]') ||
                        !!document.querySelector('[aria-label="主页"]') ||
                        !!document.querySelector('div[role="banner"]');
    
    const loginGone = !document.querySelector('input[type="email"]') &&
                    !document.querySelector('input[type="password"]') &&
                    !document.querySelector('button[name="login"]');
    
    return hasPostButton && hasNavigation && loginGone;
  });
  
  if (isHomePage) {
    console.log('✅ 已成功到达Facebook主页');
    
    // 读取之前记录的坐标
    let groupPosition = { x: 640, y: 360 }; // 默认坐标
    if (fs.existsSync('group-position.json')) {
      try {
        const data = JSON.parse(fs.readFileSync('group-position.json', 'utf8'));
        groupPosition = { x: data.x, y: data.y };
        console.log(`读取到小组坐标: x=${groupPosition.x}, y=${groupPosition.y}`);
      } catch (error) {
        console.error('读取坐标失败，使用默认坐标:', error);
      }
    }
    
    // 点击小组按钮
    console.log('正在点击小组按钮...');
    await page.mouse.click(groupPosition.x, groupPosition.y);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    console.log('✅ 已点击小组按钮，等待页面加载完成');
    
    // 创建readline接口等待用户输入
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log('等待您的指令...');
    console.log('请将鼠标移动到小组搜索框位置');
    console.log('输入"1"记录搜索框坐标');
    console.log('输入"q"关闭浏览器并退出');
    
    rl.on('line', async (input) => {
      const command = input.trim();
      
      if (command === '1') {
        try {
          const position = await page.evaluate(() => {
            return {
              x: window.innerWidth / 2,
              y: window.innerHeight / 2
            };
          });
          
          console.log(`✅ 已记录搜索框位置: x=${position.x}, y=${position.y}`);
          
          fs.writeFileSync('search-position.json', JSON.stringify({
            x: position.x,
            y: position.y,
            timestamp: new Date().toISOString()
          }, null, 2));
          
          console.log('✅ 位置已保存到 search-position.json');
          console.log('继续等待您的指令...');
          
        } catch (error) {
          console.error('记录位置失败:', error);
        }
        
      } else if (command === 'q') {
        console.log('正在关闭浏览器...');
        await browser.close();
        rl.close();
        process.exit(0);
        
      } else {
        console.log('未知命令，请输入"1"记录位置或"q"退出');
      }
    });
    
  } else {
    console.log('❌ 未到达Facebook主页，请检查cookie或手动登录');
    await browser.close();
  }
}

clickGroupAndWait();
