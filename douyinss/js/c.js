const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ALL_DATA_FILE = path.join(path.dirname(__dirname), "json", "全部评论.json");
const COOKIE_FILE = path.join(path.dirname(__dirname), "cookie.txt");

async function loadCookies(page) {
    try {
        if (fs.existsSync(COOKIE_FILE)) {
            console.log('🔍 检测到Cookie文件，尝试自动登录...');
            const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf8'));
            await page.setCookie(...cookies);
            console.log('✅ Cookie已加载');
            return true;
        } else {
            console.log('ℹ️  未找到Cookie文件');
            return false;
        }
    } catch (error) {
        console.error('❌ 加载Cookie失败:', error);
        return false;
    }
}

async function checkLoginStatus(page) {
    try {
        await page.goto('https://www.douyin.com', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const isLoggedIn = await page.evaluate(() => {
            const avatar = document.querySelector('[data-e2e="nav-avatar"]') || 
                          document.querySelector('.nav-avatar') || 
                          document.querySelector('img[alt*="头像"]');
            const loginButton = document.querySelector('[data-e2e="login-button"]') || 
                               document.querySelector('.login-button') ||
                               document.querySelector('button[class*="login"]');
            return !!avatar || !loginButton;
        });
        
        return isLoggedIn;
    } catch (error) {
        console.error('❌ 检查登录状态失败:', error);
        return false;
    }
}

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });

  const page = await browser.newPage();

  console.log('打开抖音首页...');
  
  // 尝试加载Cookie自动登录
  const hasCookie = await loadCookies(page);
  let isLoggedIn = false;
  
  if (hasCookie) {
      isLoggedIn = await checkLoginStatus(page);
      if (isLoggedIn) {
          console.log('✅ Cookie登录成功，已自动登录');
      } else {
          console.log('⚠️  Cookie已过期或无效，需要手动登录');
      }
  }
  
  // 如果没有Cookie或登录失败，需要手动登录
  if (!isLoggedIn) {
      await page.goto('https://www.douyin.com', { waitUntil: 'networkidle2' });
      console.log('请手动登录，登录完成后按回车...');
      await new Promise(resolve => rl.once('line', resolve));
  }

  if (!fs.existsSync(ALL_DATA_FILE)) {
    fs.writeFileSync(ALL_DATA_FILE, '[]');
  }

  console.log('\n操作说明：');
  console.log('1. 搜索关键词，刷视频');
  console.log('2. 点进想抓的视频');
  console.log('3. 按回车，自动抓取评论');
  console.log('4. 抓完手动点后退，继续刷下一个');
  console.log('5. 输入 "exit" 退出\n');

  while (true) {
    console.log('按回车抓取当前视频评论...');
    const input = await new Promise(resolve => rl.once('line', resolve));
    if (input === 'exit') break;

    // 获取视频链接
    let videoUrl = await page.evaluate(() => {
      const video = document.querySelector('video');
      if (video) {
        let parent = video.parentElement;
        while (parent) {
          const link = parent.querySelector('a[href*="/video/"]');
          if (link) return link.href;
          parent = parent.parentElement;
        }
      }
      return window.location.href;
    });

    if (!videoUrl.includes('/search/')) {
      console.log('❌ 当前不在视频页，请先点进视频\n');
      continue;
    }

    console.log(`📹 抓取: ${videoUrl}`);

    // 滚动加载
    console.log('加载评论中...');
    let lastCount = 0;
    let noNewCount = 0;
    
    for (let i = 0; i < 30; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await new Promise(r => setTimeout(r, 1500));
      
      const currentCount = await page.evaluate(() => {
        return document.querySelectorAll('[data-e2e*="comment-item"], [class*="commentItem"]').length;
      });
      
      process.stdout.write(`\r  滚动 ${i+1}: ${currentCount} 条`);
      
      if (currentCount === lastCount) {
        noNewCount++;
        if (noNewCount >= 3) {
          console.log('\n✅ 评论加载完成');
          break;
        }
      } else {
        noNewCount = 0;
        lastCount = currentCount;
      }
    }

    // 抓取评论
    const comments = await page.evaluate(() => {
      const result = [];
      const items = document.querySelectorAll('[data-e2e*="comment-item"], [class*="commentItem"]');
      
      for (const item of items) {
        const userLink = item.querySelector('a[href*="/user/"]');
        let userUrl = '';
        if (userLink) {
          let href = userLink.getAttribute('href');
          if (href && !href.includes('self')) {
            if (href.startsWith('//')) href = 'https:' + href;
            userUrl = href;
          }
        }
        
        const text = item.innerText.trim();
        if (text && text.length > 2 && text.length < 500 && userUrl) {
          result.push({ text, userUrl });
        }
      }
      return result;
    });

    console.log(`📝 抓到 ${comments.length} 条评论`);

    // 追加
    const existing = JSON.parse(fs.readFileSync(ALL_DATA_FILE, 'utf8'));
    const newData = [...existing, ...comments];
    fs.writeFileSync(ALL_DATA_FILE, JSON.stringify(newData, null, 2));
    console.log(`💾 已追加，当前共 ${newData.length} 条\n`);

    console.log('✅ 抓取完成，请手动点后退，继续刷下一个视频\n');
  }

  rl.close();
  await browser.close();
})();