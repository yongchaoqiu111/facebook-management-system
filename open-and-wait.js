const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function openAndWait() {
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
  
  // 创建readline接口等待用户输入
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('等待您的指令...');
  console.log('输入"q"关闭浏览器并退出');
  
  rl.on('line', async (input) => {
    const command = input.trim();
    
    if (command === 'q') {
      console.log('正在关闭浏览器...');
      await browser.close();
      rl.close();
      process.exit(0);
      
    } else {
      console.log('未知命令，请输入"q"退出');
    }
  });
}

openAndWait();
