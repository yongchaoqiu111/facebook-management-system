const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function autoJoinFacebookGroups(input) {
  console.log('启动 Facebook 自动加入小组技能...');
  
  try {
    // 启动浏览器
    const browser = await chromium.launch({
      headless: false,
      args: ['--disable-notifications']
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 加载 cookie
    const cookiePath = path.join(__dirname, '../../user-config/accounts', 'facebook.txt');
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
        console.error('加载 cookie 失败:', error.message);
      }
    }
    
    // 打开 Facebook
    console.log('打开 Facebook 主页...');
    await page.goto('https://www.facebook.com');
    
    console.log('✓ Facebook 网页打开成功');
    console.log('当前 URL:', page.url());
    
    // 自动检测登录状态
    console.log('\n自动检测登录状态...');
    
    let loginSuccess = false;
    let randomKeyword = null;
    
    try {
      // 等待登录按钮消失
      await page.waitForSelector('[data-testid="royal_login_button"]', { timeout: 30000, state: 'hidden' });
      console.log('✓ 登录按钮消失');
      
      // 等待发布按钮出现
      console.log('等待发布按钮出现...');
      await page.waitForSelector('[aria-label="创建帖子"]', { timeout: 30000 });
      console.log('✓ 发布按钮出现');
      
      console.log('✓ 登录成功，进入主页面');
      loginSuccess = true;
    } catch (error) {
      console.error('✗ 登录状态检测失败:', error.message);
      console.log('请手动登录 Facebook...');
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
    
    // 保存cookie
    if (loginSuccess) {
      console.log('\n保存cookie...');
      const cookies = await context.cookies();
      const cookieContent = cookies.map(cookie => {
        return `${cookie.name}\t${cookie.value}\t${cookie.domain}\t${cookie.path}\t${cookie.expires || ''}\t${cookie.httpOnly ? '✓' : ''}\t${cookie.secure ? '✓' : ''}`;
      }).join('\n');
      
      fs.writeFileSync(cookiePath, cookieContent);
      console.log('✓ cookie保存成功');
      
      // 读取关键词文件（更新路径：从user-config/assets/sou读取）
      const keywordsPath = path.join(__dirname, '../../user-config', 'assets', 'sou', 'sou.txt');
      let keywords = [];
      
      try {
        if (fs.existsSync(keywordsPath)) {
          const content = fs.readFileSync(keywordsPath, 'utf8');
          keywords = content.split('\n')
            .map(line => line.trim())
            .filter(line => line);
          console.log(`✓ 成功读取关键词，共${keywords.length}个`);
        } else {
          console.error(`✗ 关键词文件不存在: ${keywordsPath}`);
          await browser.close();
          return {
            code: 404,
            message: '关键词文件不存在'
          };
        }
      } catch (error) {
        console.error('读取关键词失败:', error.message);
        await browser.close();
        return {
          code: 500,
          message: '读取关键词失败'
        };
      }
      
      if (keywords.length === 0) {
        console.error('✗ 关键词列表为空');
        await browser.close();
        return {
          code: 400,
          message: '关键词列表为空'
        };
      }
      
      // 随机选择一个关键词
      const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
      console.log(`\n随机选择关键词: ${randomKeyword}`);
      
      // 直接跳转到小组搜索页面
      console.log('直接跳转到小组搜索页面...');
      try {
        // 直接访问小组搜索URL
        const searchUrl = `https://www.facebook.com/search/groups?q=${encodeURIComponent(randomKeyword)}`;
        console.log(`访问小组搜索页面: ${searchUrl}`);
        
        await page.goto(searchUrl);
        console.log('✓ 成功访问小组搜索页面');
        console.log('当前URL:', page.url());
        await page.waitForTimeout(3000);
        
      } catch (error) {
        console.error('跳转小组搜索页面失败:', error.message);
        console.error('完整错误:', error);
        await browser.close();
        return {
          code: 500,
          message: '跳转小组搜索页面失败'
        };
      }
    }
    
    // 等待搜索结果加载完成
    console.log('等待搜索结果加载完成...');
    
    // 等待小组卡片出现（使用稳定的选择器）
    console.log('等待小组卡片出现...');
    try {
      await page.waitForSelector('a[href*="/groups/"]', { timeout: 30000 });
      console.log('✓ 找到小组卡片');
    } catch (error) {
      console.error('等待小组卡片失败:', error.message);
      await browser.close();
      return {
        code: 500,
        message: '等待小组卡片失败'
      };
    }
    
    // 获取当前URL
    const currentUrl = page.url();
    console.log(`当前URL: ${currentUrl}`);
    
    // 选择可加入的小组
    console.log('查找可加入的小组...');
    let joinedGroups = [];
    
    try {
      // 使用XPath查找所有包含Join/加入的按钮（不依赖垃圾class）
      console.log('查找加入按钮...');
      const joinButtons = await page.evaluate(() => {
        const result = [];
        const elements = document.querySelectorAll('span');
        elements.forEach(el => {
          const text = el.textContent;
          if (text && (text.includes('Join') || text.includes('加入') || text.includes('Requested'))) {
            result.push(el);
          }
        });
        return result;
      });
      
      console.log(`找到 ${joinButtons.length} 个可加入小组`);
      
      if (joinButtons.length === 0) {
        console.log('无可用加入按钮');
      } else {
          // 直接遍历点击，不搞复杂父级查找
          const maxToJoin = Math.min(1, joinButtons.length);
        
        for (let i = 0; i< maxToJoin; i++) {
          try {
            // 滚动到按钮视图
            await page.evaluate((index) =>{
              const buttons = document.querySelectorAll('span');
              let buttonFound = null;
              let count = 0;
              
              for (const el of buttons) {
                const text = el.textContent;
                if (text && (text.includes('Join') || text.includes('加入') || text.includes('Requested'))) {
                  if (count === index) {
                    buttonFound = el;
                    break;
                  }
                  count++;
                }
              }
              
              if (buttonFound) {
                buttonFound.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, i);
            
            await page.waitForTimeout(500);
            
            // 点击按钮
            await page.evaluate((index) => {
              const buttons = document.querySelectorAll('span');
              let buttonFound = null;
              let count = 0;
              
              for (const el of buttons) {
                const text = el.textContent;
                if (text && (text.includes('Join') || text.includes('加入') || text.includes('Requested'))) {
                  if (count === index) {
                    buttonFound = el;
                    break;
                  }
                  count++;
                }
              }
              
              if (buttonFound) {
                buttonFound.click();
              }
            }, i);
            
            console.log(`✅ 点击加入按钮 ${i + 1} 成功`);
            joinedGroups.push(`小组 ${i + 1}`);
            
            await page.waitForTimeout(2000);
            
          } catch (e) {
            console.log(`❌ 点击失败:`, e.message);
          }
        }
        
        console.log(`\n🎯 本次成功加入：${joinedGroups.length} 个小组`);
      }
      
    } catch (error) {
      console.error('加入小组失败:', error.message);
    }
    
    console.log('\n✓ 自动加入小组任务完成');
    console.log(`成功加入 ${joinedGroups.length} 个小组:`);
    joinedGroups.forEach(group => console.log(`- ${group}`));
    
    // 保持浏览器打开，让用户查看结果
    console.log('浏览器窗口已保持打开，您可以查看加入小组的结果');
    // await browser.close();
    
    return {
      code: 0,
      message: '加入小组成功',
      data: {
        joinedGroups: joinedGroups,
        keyword: randomKeyword
      }
    };
    
  } catch (error) {
    console.error('✗ 加入小组失败:', error.message);
    return {
      code: 500,
      message: `加入小组失败: ${error.message}`
    };
  }
}

module.exports = { autoJoinFacebookGroups };
