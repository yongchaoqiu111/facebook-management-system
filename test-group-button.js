const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testGroupButton() {
  console.log('打开浏览器测试小组按钮...');
  
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-notifications']
  });
  
  const page = await browser.newPage();
  const cookiePath = path.join(__dirname, 'user-config/accounts', 'facebook.txt');
  
  try {
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
    
    // 等待页面加载
    await page.waitForTimeout(3000);
    
    // 尝试点击小组按钮（使用用户提供的选择器）
    console.log('尝试点击小组按钮...');
    
    try {
      // 等待小组按钮出现
      await page.waitForSelector('span.x1lliihq.x6ikm8r.x10wlt62.x1n2onr6', { timeout: 15000 });
      console.log('找到小组按钮！');
      
      // 点击小组按钮
      await page.click('span.x1lliihq.x6ikm8r.x10wlt62.x1n2onr6');
      console.log('成功点击小组按钮！');
      
      // 等待页面加载
      await page.waitForLoadState('networkidle');
      console.log('小组页面加载完成！');
      
    } catch (error) {
      console.error('点击小组按钮失败:', error);
      
      // 尝试其他选择器
      console.log('尝试其他选择器...');
      const selectors = [
        'a[href*="/groups"]',
        '[aria-label="小组"]',
        '[aria-label="Groups"]',
        'div[role="navigation"] a[href*="/groups"]'
      ];
      
      for (const selector of selectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          await page.click(selector);
          console.log(`成功使用选择器 ${selector} 点击小组按钮！`);
          await page.waitForLoadState('networkidle');
          break;
        } catch (e) {
          console.log(`选择器 ${selector} 失败`);
        }
      }
    }
    
    console.log('测试完成！');
    
  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    // 不关闭浏览器
    console.log('浏览器窗口保持打开状态...');
  }
}

testGroupButton();
