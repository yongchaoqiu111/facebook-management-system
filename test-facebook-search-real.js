const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testFacebookSearchReal() {
  console.log('开始测试真实的Facebook搜索功能...');
  
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
        const cookies = parseTextCookies(cookieContent);
        if (cookies.length > 0) {
          await page.context().addCookies(cookies);
          console.log(`成功加载cookie，共${cookies.length}个`);
        }
      } catch (error) {
        console.error('加载cookie失败:', error);
      }
    }
    
    // 打开Facebook
    await page.goto('https://www.facebook.com');
    await page.waitForLoadState('networkidle');
    
    console.log('已登录Facebook主页');
    
    // 等待页面稳定
    await page.waitForTimeout(2000);
    
    // 搜索关键词
    const keywords = ['AI', '人工智能', '大模型'];
    
    for (const keyword of keywords) {
      console.log(`\n搜索关键词: ${keyword}`);
      
      try {
        // 找到搜索框
        await page.waitForSelector('[aria-label="搜索 Facebook"]', { timeout: 10000 });
        await page.fill('[aria-label="搜索 Facebook"]', keyword);
        await page.press('[aria-label="搜索 Facebook"]', 'Enter');
        
        // 等待搜索结果加载
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        
        // 获取搜索结果
        const results = await page.evaluate(() => {
          const posts = [];
          const postElements = document.querySelectorAll('div[role="article"]');
          
          postElements.forEach((element, index) => {
            if (index >= 5) return; // 最多获取5个结果
            
            const textElement = element.querySelector('div[dir="auto"]') || 
                              element.querySelector('span') ||
                              element.querySelector('p');
            
            const text = textElement ? textElement.textContent.trim() : '';
            
            if (text) {
              posts.push({
                title: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                fullText: text
              });
            }
          });
          
          return posts;
        });
        
        console.log(`找到 ${results.length} 个搜索结果:`);
        results.forEach((result, index) => {
          console.log(`${index + 1}. ${result.title}`);
        });
        
      } catch (error) {
        console.error(`搜索 ${keyword} 失败:`, error);
      }
      
      // 返回到主页
      await page.goto('https://www.facebook.com');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }
    
    console.log('\n搜索测试完成！');
    
  } catch (error) {
    console.error('搜索测试失败:', error);
  } finally {
    // 不关闭浏览器，让用户可以查看结果
    console.log('浏览器窗口保持打开状态...');
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

testFacebookSearchReal();
