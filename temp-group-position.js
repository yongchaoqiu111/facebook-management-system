const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function tempGroupPosition() {
  console.log('打开浏览器...');
  
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-notifications']
  });
  
  const page = await browser.newPage();
  const cookiePath = path.join(__dirname, 'cookie', 'facebook.txt');
  let clickPosition = null;
  
  try {
    // 加载cookie
    if (fs.existsSync(cookiePath)) {
      try {
        const cookieContent = fs.readFileSync(cookiePath, 'utf-8');
        const cookies = parseTextCookies(cookieContent);
        if (cookies.length > 0) {
          await page.context().addCookies(cookies);
          console.log(`成功加载cookie，共${cookies.length}个`);
        }
      } catch (error) {
        console.error('加载cookie失败:', error);
      }
    }
    
    // 打开Facebook主页
    await page.goto('https://www.facebook.com');
    await page.waitForLoadState('networkidle');
    
    console.log('正在判断是否到达主页...');
    
    // 判断是否到达主页
    const isHomePage = await page.evaluate(() => {
      // 检查是否有发帖按钮
      const hasPostButton = !!document.querySelector('[aria-label="发帖"]') || 
                          !!document.querySelector('[aria-label="Create Post"]') ||
                          !!document.querySelector('[data-testid="create-post-button"]');
      
      // 检查是否有导航栏
      const hasNavigation = !!document.querySelector('[role="navigation"]') ||
                          !!document.querySelector('[aria-label="主页"]') ||
                          !!document.querySelector('div[role="banner"]');
      
      // 检查登录元素是否消失
      const loginGone = !document.querySelector('input[type="email"]') &&
                      !document.querySelector('input[type="password"]') &&
                      !document.querySelector('button[name="login"]');
      
      return hasPostButton && hasNavigation && loginGone;
    });
    
    if (isHomePage) {
      console.log('✅ 已成功到达Facebook主页！');
      console.log('');
      console.log('请将鼠标移动到"小组"菜单项的位置');
      console.log('然后在终端输入 "1" 并按回车，我会记录点击位置');
      console.log('输入 "q" 并按回车退出');
      
      // 创建readline接口
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      // 监听用户输入
      rl.on('line', async (input) => {
        const command = input.trim();
        
        if (command === '1') {
          try {
            // 获取鼠标位置（当前页面中心）
            const position = await page.evaluate(() => {
              return {
                x: window.innerWidth / 2,
                y: window.innerHeight / 2
              };
            });
            
            clickPosition = position;
            console.log(`✅ 已记录点击位置: x=${position.x}, y=${position.y}`);
            
            // 保存到文件
            const positionData = {
              x: position.x,
              y: position.y,
              timestamp: new Date().toISOString()
            };
            
            fs.writeFileSync(path.join(__dirname, 'group-position.json'), JSON.stringify(positionData, null, 2));
            console.log('✅ 位置信息已保存到 group-position.json');
            
          } catch (error) {
            console.error('记录位置失败:', error);
          }
        } else if (command === 'q') {
          // 退出
          console.log('正在关闭浏览器...');
          await browser.close();
          rl.close();
          process.exit(0);
        } else {
          console.log('未知命令！');
          console.log('输入 "1" 记录位置');
          console.log('输入 "q" 退出');
        }
      });
      
    } else {
      console.log('❌ 未到达Facebook主页，请检查cookie或手动登录');
    }
    
  } catch (error) {
    console.error('操作失败:', error);
  }
}

function parseTextCookies(text) {
  const cookies = [];
  const lines = text.trim().split('\n');
  
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
  
  return cookies;
}

tempGroupPosition();
