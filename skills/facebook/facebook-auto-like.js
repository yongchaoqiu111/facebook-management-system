const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function autoLikeFacebook(input = {}) {
  let browser = null;
  
  try {
    console.log('启动Facebook自动点赞技能...');
    
    // 读取配置文件
    const pinglunciDir = path.join(__dirname, '../../user-config/assets/pinglunci');
    const ssFile = path.join(pinglunciDir, 'ss.txt');
    
    // 读取搜索关键词（优先使用输入的搜索词）
      let searchKeywords = input.keywords || [];
      
      // 如果没有输入搜索词，从配置文件读取并实现关键词轮换
      if (searchKeywords.length === 0) {
        if (fs.existsSync(ssFile)) {
          const content = fs.readFileSync(ssFile, 'utf8');
          searchKeywords = content.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
          
          console.log(`✓ 从ss.txt读取到 ${searchKeywords.length} 个搜索关键词: ${searchKeywords.join(', ')}`);
          
          // 实现关键词轮换：取第一个关键词，然后将其放到最后
          if (searchKeywords.length > 0) {
            const currentKeyword = searchKeywords[0];
            searchKeywords = searchKeywords.slice(1);
            searchKeywords.push(currentKeyword);
            
            // 保存更新后的关键词列表
            fs.writeFileSync(ssFile, searchKeywords.join('\n'));
            console.log(`✓ 关键词轮换完成，新顺序: ${searchKeywords.join(', ')}`);
            
            // 当前只使用第一个关键词
            searchKeywords = [currentKeyword];
            console.log(`✓ 当前使用关键词: ${currentKeyword}`);
          }
        } else {
          searchKeywords = ['AI', '人工智能'];
          console.log('⚠ ss.txt文件不存在，使用默认关键词');
        }
      } else {
        console.log(`✓ 使用输入的搜索关键词: ${searchKeywords.join(', ')}`);
      }
    
    // 启动浏览器
    browser = await chromium.launch({
      headless: false,
      args: ['--disable-notifications']
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 加载cookie
    const cookiePath = path.join(__dirname, '../../user-config/accounts/facebook.txt');
    if (fs.existsSync(cookiePath)) {
      try {
        const cookieContent = fs.readFileSync(cookiePath, 'utf8');
        const cookies = cookieContent.split('\n').map(line => {
          const parts = line.split('\t');
          if (parts.length >= 7) {
            return {
              name: parts[0],
              value: parts[1],
              domain: parts[2],
              path: parts[3],
              httpOnly: parts[5] === '✓',
              secure: parts[6] === '✓'
            };
          }
          return null;
        }).filter(Boolean);
        
        if (cookies.length > 0) {
          await context.addCookies(cookies);
          console.log(`✓ 成功加载cookie，共${cookies.length}个`);
        }
      } catch (error) {
        console.error('加载cookie失败:', error.message);
      }
    }
    
    // 打开Facebook主页
    console.log('打开Facebook主页...');
    await page.goto('https://www.facebook.com');
    console.log('✓ Facebook主页打开成功');
    
    // 自动检测登录状态
    console.log('自动检测登录状态...');
    let loginSuccess = false;
    
    try {
      // 等待登录按钮消失
      await page.waitForSelector('[data-testid="royal_login_button"]', { timeout: 30000, state: 'hidden' });
      console.log('✓ 登录按钮消失');
      
      // 等待主页元素出现
      console.log('等待主页元素出现...');
      await page.waitForSelector('[aria-label="创建帖子"]', { timeout: 30000 });
      console.log('✓ 主页元素出现');
      
      console.log('✓ 登录成功，进入主页面');
      loginSuccess = true;
    } catch (error) {
      console.error('✗ 登录状态检测失败:', error.message);
      console.log('请手动登录Facebook...');
      console.log('登录完成后，按任意键继续...');
      
      process.stdin.setRawMode(true);
      process.stdin.resume();
      await new Promise(resolve => process.stdin.once('data', resolve));
      
      // 手动登录后再次检查
      console.log('检查登录状态...');
      try {
        await page.waitForSelector('[aria-label="创建帖子"]', { timeout: 10000 });
        console.log('✓ 登录成功，进入主页面');
        loginSuccess = true;
      } catch (error2) {
        console.error('✗ 登录失败，请重试');
        await browser.close();
        return {
          code: 401,
          message: '登录失败'
        };
      }
    }
    
    if (loginSuccess) {
      // 保存cookie
      console.log('\n保存cookie...');
      const cookies = await context.cookies();
      const cookieContent = cookies.map(cookie => {
        return `${cookie.name}\t${cookie.value}\t${cookie.domain}\t${cookie.path}\t${cookie.expires || ''}\t${cookie.httpOnly ? '✓' : ''}\t${cookie.secure ? '✓' : ''}`;
      }).join('\n');
      
      fs.writeFileSync(cookiePath, cookieContent);
      console.log('✓ cookie保存成功');
      
      // 遍历搜索关键词
      for (const keyword of searchKeywords) {
        console.log(`\n=== 搜索关键词: ${keyword} ===`);
        
        // 直接构造搜索URL
        const encodedKeyword = encodeURIComponent(keyword);
        const searchUrl = `https://www.facebook.com/search/top?q=${encodedKeyword}&filters=eyJyZWNlbnRfcG9zdHM6MCI6IntcIm5hbWVcIjpcInJlY2VudF9wb3N0c1wiLFwiYXJnc1wiOlwiXCJ9In0%3D`;
        
        // 访问搜索页面
        console.log(`访问搜索页面: ${searchUrl}`);
        await page.goto(searchUrl);
        // 使用更长的超时时间和不同的等待策略
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(5000);
        
        console.log(`✓ 搜索结果页面加载完成`);
        
        // 获取搜索结果帖子
        console.log('获取搜索结果帖子...');
        const posts = await page.evaluate(() => {
          const posts = [];
          const postElements = document.querySelectorAll('div[role="article"]');
          
          postElements.forEach(postEl => {
            const titleElement = postEl.querySelector('h3');
            const title = titleElement ? titleElement.textContent.trim() : '';
            
            if (!title) return;
            
            posts.push({
              title: title,
              element: postEl
            });
          });
          
          return posts;
        });
        
        console.log(`找到 ${posts.length} 个相关帖子`);
        
        // 处理前5个帖子（点赞更多帖子）
        const postsToProcess = posts.slice(0, 5);
        for (let i = 0; i < postsToProcess.length; i++) {
          const post = postsToProcess[i];
          console.log(`\n处理第 ${i + 1} 个帖子: ${post.title}`);
          
          try {
            // 在搜索结果页面直接查找点赞按钮
            console.log('在搜索结果页面查找点赞按钮...');
            
            // 尝试不同的点赞按钮选择器（在帖子内查找）
            const likeSelectors = [
              `div[role="article"]:nth-child(${i + 2}) div[aria-label="赞"]`,
              `div[role="article"]:nth-child(${i + 2}) button[aria-label="赞"]`,
              `div[role="article"]:nth-child(${i + 2}) span[aria-label="赞"]`,
              `div[role="article"]:nth-child(${i + 2}) [aria-label="赞"]`
            ];
            
            let likeClicked = false;
            for (const selector of likeSelectors) {
              try {
                await page.click(selector, { timeout: 5000 });
                console.log(`✓ 使用选择器 ${selector} 点赞成功`);
                likeClicked = true;
                break;
              } catch (error) {
                console.log(`尝试选择器 ${selector} 失败: ${error.message}`);
              }
            }
            
            if (!likeClicked) {
              console.log('搜索结果页面未找到点赞按钮，进入详情页...');
              // 进入详情页查找点赞按钮
              await page.click(`div[role="article"]:nth-child(${i + 2})`);
              await page.waitForLoadState('domcontentloaded');
              await page.waitForTimeout(3000);
              console.log('✓ 帖子详情页面加载完成');
              
              // 在详情页查找点赞按钮
              const detailLikeSelectors = [
                'div[aria-label="赞"]',
                'button[aria-label="赞"]',
                'span[aria-label="赞"]'
              ];
              
              for (const selector of detailLikeSelectors) {
                try {
                  await page.click(selector, { timeout: 5000 });
                  console.log(`✓ 在详情页使用选择器 ${selector} 点赞成功`);
                  likeClicked = true;
                  break;
                } catch (error) {
                  console.log(`在详情页尝试选择器 ${selector} 失败: ${error.message}`);
                }
              }
              
              if (!likeClicked) {
                // 尝试使用评估方法查找并点击点赞按钮
                const clicked = await page.evaluate(() => {
                  const buttons = document.querySelectorAll('button, div');
                  for (const btn of buttons) {
                    const ariaLabel = btn.getAttribute('aria-label');
                    const title = btn.getAttribute('title');
                    if (ariaLabel === '赞' || title === '赞' || btn.textContent.includes('赞')) {
                      btn.click();
                      return true;
                    }
                  }
                  return false;
                });
                
                if (clicked) {
                  console.log('✓ 通过评估方法点赞成功');
                  likeClicked = true;
                } else {
                  console.log('⚠ 未找到点赞按钮');
                }
              }
              
              await page.waitForTimeout(2000);
              
              // 返回搜索结果页面
              await page.goBack();
              await page.waitForLoadState('domcontentloaded');
              await page.waitForTimeout(2000);
            }
            
          } catch (error) {
            console.error(`处理帖子失败: ${error.message}`);
            try {
              // 返回搜索结果页面
              await page.goBack();
              await page.waitForLoadState('domcontentloaded');
              await page.waitForTimeout(2000);
            } catch (error2) {
              console.log('返回搜索结果页面失败');
            }
          }
        }
        
        // 关键词之间间隔30秒
        console.log(`\n等待30秒后继续下一个关键词...`);
        await page.waitForTimeout(30000);
      }
    }
    
    console.log('\n✓ Facebook自动点赞任务完成');
    
    // 保持浏览器打开，让用户查看结果
    console.log('浏览器窗口已保持打开，您可以查看点赞结果');
    // await browser.close();
    
    return {
      code: 0,
      message: '自动点赞成功',
      data: {
        searchKeywords: searchKeywords
      }
    };
    
  } catch (error) {
    console.error('✗ 自动点赞失败:', error.message);
    
    if (browser) {
      await browser.close();
    }
    
    return {
      code: 500,
      message: `自动点赞失败: ${error.message}`
    };
  }
}

module.exports = { autoLikeFacebook };