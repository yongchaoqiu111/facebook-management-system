const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function keepBrowserOpen() {
  console.log('打开浏览器并保持打开状态...');
  
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-notifications']
  });
  
  const page = await browser.newPage();
  const cookiePath = path.join(__dirname, 'cookie', 'facebook.txt');
  
  try {
    // 加载cookie
    if (fs.existsSync(cookiePath)) {
      try {
        const cookieContent = fs.readFileSync(cookiePath, 'utf-8');
        if (cookieContent.trim().startsWith('[')) {
          const cookies = JSON.parse(cookieContent);
          await page.context().addCookies(cookies);
          console.log('成功加载JSON格式cookie');
        } else {
          const cookies = parseTextCookies(cookieContent);
          if (cookies.length > 0) {
            await page.context().addCookies(cookies);
            console.log(`成功加载文本格式cookie，共${cookies.length}个`);
          }
        }
      } catch (error) {
        console.error('加载cookie失败:', error);
      }
    }
    
    // 打开Facebook
    await page.goto('https://www.facebook.com');
    await page.waitForLoadState('networkidle');
    
    console.log('浏览器已打开，请手动操作...');
    console.log('每30秒自动保存一次cookie...');
    
    // 每30秒自动保存cookie
    setInterval(async () => {
      try {
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
        
        fs.writeFileSync(cookiePath, cookieContent);
        console.log(`Cookie已自动保存，共${cookies.length}个`);
      } catch (error) {
        console.error('自动保存cookie失败:', error);
      }
    }, 30000);
    
    // 等待用户手动关闭
    await new Promise(() => {});
    
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

keepBrowserOpen();
