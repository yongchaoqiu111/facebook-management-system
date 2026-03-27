const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function simpleGroupPosition() {
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
  await page.goto('https://www.facebook.com');
  console.log('已打开Facebook主页');
  
  // 创建readline接口
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('请将鼠标移动到"小组"位置');
  console.log('输入"1"记录位置，输入"q"退出');
  
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
        
        console.log(`记录位置: x=${position.x}, y=${position.y}`);
        
        fs.writeFileSync('group-position.json', JSON.stringify({
          x: position.x,
          y: position.y,
          timestamp: new Date().toISOString()
        }, null, 2));
        
        console.log('位置已保存到 group-position.json');
        
      } catch (error) {
        console.error('记录位置失败:', error);
      }
      
    } else if (command === 'q') {
      console.log('退出...');
      rl.close();
    } else {
      console.log('未知命令');
    }
  });
}

simpleGroupPosition();
