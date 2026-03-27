const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function saveFacebookCookie() {
  console.log('开始保存Facebook Cookie...');
  
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-notifications']
  });
  
  const page = await browser.newPage();
  
  try {
    // 打开Facebook主页
    await page.goto('https://www.facebook.com');
    await page.waitForLoadState('networkidle');
    
    console.log('请在浏览器中手动登录Facebook...');
    console.log('登录完成后按Enter键继续...');
    
    // 等待用户手动登录
    await new Promise(resolve => {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl.question('', () => {
        rl.close();
        resolve();
      });
    });
    
    // 保存cookie
    const cookies = await page.context().cookies();
    const cookieContent = cookies.map(cookie => {
      return [
        cookie.name,
        cookie.value,
        cookie.domain,
        cookie.path,
        cookie.expires ? new Date(cookie.expires * 1000).toISOString() : '会话',
        cookie.httpOnly ? '✓' : '',
        cookie.secure ? '✓' : '',
        cookie.sameSite || ''
      ].join('\t');
    }).join('\n');
    
    const cookiePath = path.join(__dirname, 'cookie', 'facebook.txt');
    fs.writeFileSync(cookiePath, cookieContent);
    
    console.log(`Cookie已成功保存到: ${cookiePath}`);
    console.log(`共保存 ${cookies.length} 个cookie`);
    
  } catch (error) {
    console.error('保存Cookie失败:', error);
  } finally {
    // 不关闭浏览器，让用户可以继续操作
    console.log('浏览器窗口保持打开状态...');
  }
}

saveFacebookCookie();
