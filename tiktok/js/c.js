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
            const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf8'));
            await page.setCookie(...cookies);
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
}

async function checkLoginStatus(page) {
    try {
        await page.goto('https://www.tiktok.com', { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 2000));
        const isLoggedIn = await page.evaluate(() => {
            const avatar = document.querySelector('[data-e2e="user-avatar"]') || 
                          document.querySelector('a[href*="/@"] img');
            return !!avatar;
        });
        return isLoggedIn;
    } catch (error) {
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

  console.log('打开 TikTok 首页...');
  
  const hasCookie = await loadCookies(page);
  let isLoggedIn = false;
  
  if (hasCookie) {
      isLoggedIn = await checkLoginStatus(page);
      if (isLoggedIn) {
          console.log('✅ 自动登录成功');
      }
  }
  
  if (!isLoggedIn) {
      await page.goto('https://www.tiktok.com', { waitUntil: 'networkidle2' });
      console.log('请手动登录，登录完成后按回车...');
      await new Promise(resolve => rl.once('line', resolve));
  }

  if (!fs.existsSync(ALL_DATA_FILE)) {
    fs.writeFileSync(ALL_DATA_FILE, '[]');
  }

  console.log('\n操作说明：');
  console.log('1. 搜索关键词，刷视频');
  console.log('2. 手动点进视频，手动点开评论，手动滚动加载');
  console.log('3. 按回车，自动抓取当前页面所有评论');
  console.log('4. 抓完手动后退，继续刷下一个');
  console.log('5. 输入 "exit" 退出\n');

  while (true) {
    console.log('按回车抓取当前视频评论...');
    const input = await new Promise(resolve => rl.once('line', resolve));
    if (input === 'exit') break;

    const videoUrl = page.url();
    if (!videoUrl.includes('/video/')) {
      console.log('❌ 当前不在视频页，请先点进视频\n');
      continue;
    }

    console.log(`📹 抓取: ${videoUrl}`);

    // 直接抓取当前页面的评论（你已经手动滚动好了）
    const comments = await page.evaluate(() => {
      const result = [];
      // TikTok 评论选择器
      const items = document.querySelectorAll('[data-comment-ui-enabled="true"], [data-e2e="comment-list-item"]');
      
      for (const item of items) {
        // 用户链接
        const userLink = item.querySelector('a[href*="/@"]');
        let userUrl = '';
        if (userLink) {
          let href = userLink.getAttribute('href');
          if (href && !href.includes('self')) {
            if (href.startsWith('/')) href = 'https://www.tiktok.com' + href;
            userUrl = href;
          }
        }
        
        // 评论内容
        let text = '';
        const textEl = item.querySelector('[data-e2e="comment-level-1"]');
        if (textEl) {
          text = textEl.innerText.trim();
        } else {
          const p = item.querySelector('p');
          if (p) text = p.innerText.trim();
        }
        
        if (text && text.length > 1 && userUrl) {
          result.push({ text, userUrl });
        }
      }
      return result;
    });

    console.log(`\n📝 抓到 ${comments.length} 条评论`);

    if (comments.length > 0) {
      const existing = JSON.parse(fs.readFileSync(ALL_DATA_FILE, 'utf8'));
      const newData = [...existing, ...comments];
      fs.writeFileSync(ALL_DATA_FILE, JSON.stringify(newData, null, 2));
      console.log(`💾 已追加，当前共 ${newData.length} 条\n`);
    } else {
      console.log('⚠️ 未抓到评论，请确认评论已加载\n');
    }

    console.log('✅ 抓取完成，请手动后退，继续刷下一个视频\n');
  }

  rl.close();
})();