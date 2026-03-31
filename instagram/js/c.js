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
        }
        return false;
    } catch (error) {
        return false;
    }
}

async function checkLoginStatus(page) {
    try {
        await page.goto('https://www.instagram.com', { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 2000));
        const isLoggedIn = await page.evaluate(() => {
            const avatar = document.querySelector('img[alt*="profile"], a[href*="/accounts/profile"]');
            return !!avatar;
        });
        return isLoggedIn;
    } catch (error) {
        return false;
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getUserInfo(browser, page, userUrl) {
    try {
        console.log(`🔍 正在获取用户信息: ${userUrl}`);
        
        // 打开新标签页
        const newPage = await browser.newPage();
        
        // 访问用户主页
        await newPage.goto(userUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 60000 // 增加超时时间到60秒
        });
        await delay(2000);
        
        // 提取粉丝数量和关注数量
        const userInfo = await newPage.evaluate(() => {
            // 查找粉丝和关注数量的元素
            const statsElements = document.querySelectorAll('a[href$="/followers/"], a[href$="/following/"]');
            
            let followers = null;
            let following = null;
            
            for (const element of statsElements) {
                const text = element.innerText;
                if (text.includes('followers') || text.includes('フォロワー')) {
                    // 提取数字部分
                    const numberMatch = text.match(/[\d.,]+/);
                    if (numberMatch) {
                        let numStr = numberMatch[0].replace(/[,.]/g, '');
                        followers = parseInt(numStr);
                    }
                } else if (text.includes('following') || text.includes('フォロー中')) {
                    // 提取数字部分
                    const numberMatch = text.match(/[\d.,]+/);
                    if (numberMatch) {
                        let numStr = numberMatch[0].replace(/[,.]/g, '');
                        following = parseInt(numStr);
                    }
                }
            }
            
            return { followers, following };
        });
        
        // 关闭标签页
        await newPage.close();
        
        console.log(`✅ 用户信息获取成功: 粉丝 ${userInfo.followers}, 关注 ${userInfo.following}`);
        return userInfo;
        
    } catch (error) {
        console.error(`❌ 获取用户信息失败: ${error.message}`);
        return { followers: null, following: null };
    }
}

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });

  const page = await browser.newPage();

  console.log('打开 Instagram 首页...');
  
  const hasCookie = await loadCookies(page);
  let isLoggedIn = false;
  
  if (hasCookie) {
      isLoggedIn = await checkLoginStatus(page);
      if (isLoggedIn) console.log('✅ 自动登录成功');
  }
  
  if (!isLoggedIn) {
      await page.goto('https://www.instagram.com', { 
          waitUntil: 'domcontentloaded',
          timeout: 60000 // 增加超时时间到60秒
      });
      console.log('请手动登录，登录完成后按回车...');
      await new Promise(resolve => rl.once('line', resolve));
  }

  if (!fs.existsSync(ALL_DATA_FILE)) {
    fs.writeFileSync(ALL_DATA_FILE, '[]');
  }

  console.log('\n操作说明：');
  console.log('1. 手动点进一个帖子');
  console.log('2. 按回车，自动抓取当前页面的所有评论');
  console.log('3. 抓完可以继续点下一个帖子，再按回车');
  console.log('4. 输入 "exit" 退出\n');

  while (true) {
    console.log('按回车抓取当前帖子评论...');
    const input = await new Promise(resolve => rl.once('line', resolve));
    if (input === 'exit') break;

    const currentUrl = page.url();
    if (!currentUrl.includes('/p/') && !currentUrl.includes('/reel/')) {
      console.log('❌ 当前不在帖子页面，请先点进帖子\n');
      continue;
    }

    console.log(`📹 抓取: ${currentUrl}`);

    // 🔥 滚动加载评论（你需要先手动点开评论框吗？）
    console.log('加载评论中...');
    let lastCount = 0;
    let noNewCount = 0;
    
    for (let i = 0; i < 30; i++) {
      await page.evaluate(() => {
        const commentSection = document.querySelector('[role="dialog"] section, div[role="dialog"] div[style*="overflow"]');
        if (commentSection) {
          commentSection.scrollBy(0, 800);
        } else {
          window.scrollBy(0, 800);
        }
      });
      await delay(1500);
      
      const currentCount = await page.evaluate(() => {
        return document.querySelectorAll('[role="dialog"] li, article + div > div > div').length;
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
      const seen = new Set();
      
      const items = document.querySelectorAll('[role="dialog"] li');
      
      for (const item of items) {
        try {
          const userLink = item.querySelector('a[href^="/"]:not([href*="/explore/"])');
          let userUrl = '';
          if (userLink) {
            let href = userLink.getAttribute('href');
            if (href && !href.includes('comments') && !href.includes('likes')) {
              if (href.startsWith('/')) href = 'https://www.instagram.com' + href;
              userUrl = href;
            }
          }
          
          let text = '';
          const textEl = item.querySelector('span[dir="auto"], div[dir="auto"]');
          if (textEl) {
            text = textEl.innerText.trim();
          } else {
            const fullText = item.innerText.trim();
            text = fullText.split('\n')[0];
          }
          
          const key = userUrl + text;
          if (text && text.length > 1 && text.length < 500 && userUrl && !seen.has(key)) {
            seen.add(key);
            result.push({ text, userUrl, followers: null, following: null });
          }
        } catch (err) {}
      }
      return result;
    });

    console.log(`\n📝 抓到 ${comments.length} 条评论`);

    if (comments.length > 0) {
      try {
        const existing = JSON.parse(fs.readFileSync(ALL_DATA_FILE, 'utf8'));
        const newData = [...existing, ...comments];
        fs.writeFileSync(ALL_DATA_FILE, JSON.stringify(newData, null, 2));
        console.log(`💾 已追加，当前共 ${newData.length} 条\n`);
      } catch (error) {
        console.error('❌ 保存数据失败:', error.message);
      }
    } else {
      console.log('⚠️ 未抓到评论，请确认评论框已打开且评论已加载\n');
    }

    console.log('✅ 抓取完成，可以点下一个帖子继续\n');
  }

  rl.close();
})();