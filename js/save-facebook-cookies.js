const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function saveFacebookCookies() {
  console.log('Saving Facebook cookies...');
  
  // 启动浏览器
  const browser = await chromium.launch({
    headless: false,
    slowMo: 50
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // 打开 Facebook
    await page.goto('https://www.facebook.com');
    
    console.log('\n=== 操作指南 ===');
    console.log('1. 请在浏览器中登录 Facebook');
    console.log('2. 登录完成后，按任意键继续');
    console.log('3. 脚本将保存当前的 cookies');
    console.log('\nPress any key to continue after login...');
    
    // 等待用户登录
    process.stdin.setRawMode(true);
    process.stdin.resume();
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    
    // 检查是否登录成功
    try {
      await page.waitForSelector('[aria-label="你的个人资料"]', { timeout: 10000 });
      console.log('\n✓ Facebook login detected');
    } catch (error) {
      console.log('\n✗ Not logged in, please login first');
      await browser.close();
      return;
    }
    
    // 获取 cookies
    console.log('Getting cookies...');
    const cookies = await context.cookies();
    console.log(`✓ Got ${cookies.length} cookies`);
    
    // 保存 cookies 到文件
    const cookiePath = path.join(__dirname, '..', 'cookie', 'facebook.txt');
    const cookieContent = cookies.map(cookie => {
      return [
        cookie.name,
        cookie.value,
        cookie.domain,
        cookie.path,
        cookie.expires ? new Date(cookie.expires * 1000).toISOString() : '会话',
        cookie.httpOnly ? '✓' : '',
        cookie.secure ? '✓' : '',
        cookie.sameSite || '',
        cookie.priority || '',
        cookie.sameParty || '',
        cookie.sourceScheme || '',
        cookie.partitionKey || ''
      ].join('\t');
    }).join('\n');
    
    fs.writeFileSync(cookiePath, cookieContent);
    console.log(`✓ Cookies saved to ${cookiePath}`);
    
    console.log('\n=== 操作完成 ===');
    console.log('Facebook cookies 已保存');
    console.log('按任意键关闭浏览器...');
    
  } catch (error) {
    console.log('✗ Save cookies failed:', error.message);
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

saveFacebookCookies().catch(console.error);
