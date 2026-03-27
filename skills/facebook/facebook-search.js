const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function searchFacebook(input = {}) {
  let browser = null;
  
  try {
    console.log('启动Facebook搜索技能...');
    
    // 读取配置文件
    const pinglunciDir = path.join(__dirname, '../../user-config/assets/pinglunci');
    const ssFile = path.join(pinglunciDir, 'ss.txt');
    const pinlunciFile = path.join(pinglunciDir, 'pinlunci.txt');
    const huifuFile = path.join(pinglunciDir, 'huifu.txt');
    
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
    
    // 读取拦截关键词
    let targetKeywords = [];
    if (fs.existsSync(pinlunciFile)) {
      const content = fs.readFileSync(pinlunciFile, 'utf8');
      targetKeywords = content.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      console.log(`✓ 从pinlunci.txt读取到 ${targetKeywords.length} 个拦截关键词`);
    } else {
      console.log('⚠ pinlunci.txt文件不存在');
    }
    
    // 读取回复内容
    let replyContents = [];
    if (fs.existsSync(huifuFile)) {
      const content = fs.readFileSync(huifuFile, 'utf8');
      replyContents = content.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      console.log(`✓ 从huifu.txt读取到 ${replyContents.length} 个回复内容`);
    } else {
      console.log('⚠ huifu.txt文件不存在');
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
      
      // 创建评论保存目录
      const commentsDir = path.join(__dirname, '../../user-config/assets/pinglunci/comments');
      if (!fs.existsSync(commentsDir)) {
        fs.mkdirSync(commentsDir, { recursive: true });
        console.log(`✓ 创建评论保存目录: ${commentsDir}`);
      }
      
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
        
        // 处理前3个帖子
        const postsToProcess = posts.slice(0, 3);
        for (let i = 0; i < postsToProcess.length; i++) {
          const post = postsToProcess[i];
          console.log(`\n处理第 ${i + 1} 个帖子: ${post.title}`);
          
          try {
            // 点击帖子查看详情
            await page.click(`div[role="article"]:nth-child(${i + 2})`);
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(3000);
            console.log('✓ 帖子详情页面加载完成');
            
            // 获取评论
            console.log('获取评论...');
            await page.evaluate(() => {
              // 滚动加载更多评论
              function scrollToLoadComments() {
                const commentsContainer = document.querySelector('div[aria-label="评论"]');
                if (commentsContainer) {
                  commentsContainer.scrollTop = commentsContainer.scrollHeight;
                }
              }
              
              // 滚动几次加载更多评论
              for (let i = 0; i < 3; i++) {
                scrollToLoadComments();
              }
            });
            
            await page.waitForTimeout(2000);
            
            const comments = await page.evaluate(() => {
              const comments = [];
              const commentElements = document.querySelectorAll('div[role="article"]:not([aria-label="创建帖子"])');
              
              commentElements.forEach(commentEl => {
                const authorElement = commentEl.querySelector('h3');
                const contentElement = commentEl.querySelector('div[dir="auto"]');
                
                if (authorElement && contentElement) {
                  const author = authorElement.textContent.trim();
                  const content = contentElement.textContent.trim();
                  
                  if (content && content.length > 5) {
                    comments.push({
                      author: author,
                      content: content
                    });
                  }
                }
              });
              
              return comments;
            });
            
            console.log(`获取到 ${comments.length} 条评论`);
            
            // 保存评论到文件
            if (comments.length > 0) {
              const commentFile = path.join(commentsDir, `${keyword}_${new Date().getTime()}.txt`);
              const commentContent = comments.map(comment => 
                `作者: ${comment.author}\n内容: ${comment.content}\n---\n`
              ).join('');
              
              fs.writeFileSync(commentFile, commentContent, 'utf8');
              console.log(`✓ 评论已保存到: ${commentFile}`);
            }
            
            // 匹配关键词并回复
            if (targetKeywords.length > 0 && replyContents.length > 0) {
              for (const comment of comments) {
                const matchedKeywords = targetKeywords.filter(keyword => 
                  comment.content.toLowerCase().includes(keyword.toLowerCase())
                );
                
                if (matchedKeywords.length > 0) {
                  console.log(`✓ 评论匹配到关键词: ${matchedKeywords.join(', ')}`);
                  
                  // 随机选择一个回复内容
                  const randomReply = replyContents[Math.floor(Math.random() * replyContents.length)];
                  
                  // 点击评论框
                  console.log('点击评论框...');
                  await page.click('textarea[aria-label="发表评论"]');
                  await page.waitForTimeout(1000);
                  
                  // 输入回复内容
                  console.log(`输入回复内容: ${randomReply}`);
                  await page.type('textarea[aria-label="发表评论"]', randomReply);
                  await page.waitForTimeout(1000);
                  
                  // 点击发表按钮
                  console.log('点击发表按钮...');
                  await page.click('button[aria-label="发表"]');
                  await page.waitForTimeout(2000);
                  console.log('✓ 回复成功');
                  
                  // 等待一下再处理下一个评论
                  await page.waitForTimeout(3000);
                }
              }
            }
            
            // 返回搜索结果页面
            await page.goBack();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);
            
          } catch (error) {
            console.error(`处理帖子失败: ${error.message}`);
            // 返回搜索结果页面
            await page.goBack();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);
          }
        }
      }
    }
    
    console.log('\n✓ Facebook搜索和评论截留任务完成');
    
    // 保持浏览器打开，让用户查看结果
    console.log('浏览器窗口已保持打开，您可以查看搜索结果和回复');
    // await browser.close();
    
    return {
      code: 0,
      message: '搜索和评论截留成功',
      data: {
        searchKeywords: searchKeywords,
        targetKeywords: targetKeywords,
        replyContents: replyContents
      }
    };
    
  } catch (error) {
    console.error('✗ 搜索失败:', error.message);
    
    if (browser) {
      await browser.close();
    }
    
    return {
      code: 500,
      message: `搜索失败: ${error.message}`
    };
  }
}

module.exports = { searchFacebook };