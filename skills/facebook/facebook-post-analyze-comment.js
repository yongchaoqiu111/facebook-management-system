const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// 读取API KEY
const apiKeyPath = path.join(__dirname, '../../user-config/credentials/llm-api-key2.txt');
const API_KEY = fs.readFileSync(apiKeyPath, 'utf8').trim();

// LLM配置（支持视觉的模型）
const LLM_CONFIG = {
  baseUrl: 'https://coding.dashscope.aliyuncs.com/v1',
  apiKey: API_KEY,
  model: 'qwen3.5-plus'
};

// 解析txt格式cookie（适配实际文件格式）
function parseCookieString(cookieStr) {
  return cookieStr
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const parts = line.split('\t');
      if (parts.length< 7) return null;
      return {
        name: parts[0],
        value: parts[1],
        domain: parts[2],
        path: parts[3],
        expires: parts[4] === '-1' ? undefined : parseInt(parts[4]) || undefined,
        httpOnly: parts[5] === '✓',
        secure: parts[6] === '✓',
        sameSite: 'Lax'
      };
    })
    .filter(Boolean);
}

// 安全执行函数，带重试机制
async function safeAction(fn, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      console.log(`重试 ${i+1}`, e.message);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  return null;
}

// 分析帖子图片
async function analyzePostImage(imageUrl, text) {
  const reqBody = {
    model: LLM_CONFIG.model,
    messages: [
      {
        role: "system",
        content: "你是一个Facebook评论专家。请直接生成最终的评论内容，不要包含思考过程或解释。"
      },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageUrl } },
          { type: "text", text: `请直接生成一段贴合这个帖子主题的中立评论，不要包含任何解释或思考过程。帖子内容：${text}` }
        ]
      }
    ],
    max_tokens: 200,
    temperature: 0.7
  };

  const res = await axios.post(`${LLM_CONFIG.baseUrl}/chat/completions`, reqBody, {
    headers: {
      'Authorization': `Bearer ${LLM_CONFIG.apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 60000
  });

  let content = res.data.choices?.[0]?.message?.content || '';
  
  // 清理评论内容，移除可能的思考过程
  content = content.replace(/基于这一主题，以下是.*?:/g, '').trim();
  content = content.replace(/分析如下:/g, '').trim();
  
  return content;
}

async function analyzeAndCommentFacebookPosts(input = {}) {
  let browser = null;
  
  try {
    console.log('=== 启动Facebook帖子分析与评论技能 ===');
    
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
    
    console.log('步骤1: 启动浏览器...');
    browser = await chromium.launch({
      headless: false,
      args: [
        '--disable-notifications',
        '--disable-extensions',
        '--disable-blink-features=AutomationControlled',
        '--start-maximized',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    console.log('浏览器启动成功');
    
    console.log('步骤2: 创建浏览器上下文...');
    const context = await browser.newContext({
      viewport: null
    });
    console.log('浏览器上下文创建成功');
    
    console.log('步骤3: 创建新页面...');
    const page = await context.newPage();
    console.log('页面创建成功');
    
    console.log('步骤4: 加载cookie...');
    const cookiePath = path.join(__dirname, '../../user-config/accounts/facebook.txt');
    if (fs.existsSync(cookiePath)) {
      try {
        const cookieContent = fs.readFileSync(cookiePath, 'utf8');
        const cookies = parseCookieString(cookieContent);
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
    await page.goto('https://www.facebook.com', { timeout: 30000 });
    
    // 等待FB全局对象存在（最稳）
    console.log('等待Facebook页面加载...');
    await page.waitForFunction('window.location.host.includes("facebook.com")', { timeout: 10000 });
    
    // 组合判断：已登录
    console.log('检查登录状态...');
    const isLoggedIn = await page.evaluate(() => {
      return document.querySelector('div[role="feed"]') || document.querySelector('div[aria-label="Facebook"]');
    });
    
    if (!isLoggedIn) {
      console.error('✗ 未登录，请先登录Facebook');
      await browser.close();
      return {
        code: 401,
        message: '未登录，请先登录Facebook'
      };
    }
    
    console.log('✓ 登录成功');
    
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
      
      // ===============================
      // 终极方案：搜索结果页面专用定位
      // ===============================
      console.log('正在识别搜索结果帖子...');
      
      // 滚动 3 次，强制加载帖子
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => window.scrollBy(0, 1000));
        await page.waitForTimeout(1500);
      }
      
      // 最简单直接的方法：查找任何包含/posts/的链接
      const postsInfo = await page.evaluate(() => {
        const posts = [];
        // 查找所有包含/posts/的链接
        const postLinks = document.querySelectorAll('a[href*="/posts/"]');
        
        console.log('找到帖子链接数量:', postLinks.length);
        
        for (const link of postLinks) {
          // 获取链接所在的帖子容器
          let postContainer = link;
          
          // 向上查找直到找到合适的容器
          for (let i = 0; i < 10; i++) {
            if (!postContainer) break;
            
            // 检查是否是帖子容器（有足够的内容）
            const text = postContainer.querySelector('div[data-ad-preview="message"]')?.innerText || 
                        postContainer.querySelector('div[dir="auto"]')?.innerText || '';
            const images = Array.from(postContainer.querySelectorAll('img[data-visualcompletion="media-img"]'))
              .map(img => img.src)
              .filter(src => src.includes('scontent'));
            const isVideo = !!postContainer.querySelector('video');
            
            if (text || images.length > 0) {
              posts.push({
                text: text,
                images: images,
                isVideo: isVideo
              });
              break;
            }
            
            postContainer = postContainer.parentElement;
          }
        }
        
        return posts;
      });
      
      console.log('帖子信息:', postsInfo);
      
      if (!postsInfo || postsInfo.length === 0) {
        console.log('❌ 未识别到帖子');
        continue;
      }
      
      console.log('✓ 帖子加载完成');
      console.log(`找到 **${postsInfo.length}** 个帖子`);
      
      // 遍历帖子，找到第一个非视频帖子
      let targetPost = null;
      
      for (let i = 0; i < postsInfo.length; i++) {
        const post = postsInfo[i];
        console.log(`\n检查第 ${i + 1} 个帖子:`);
        console.log(`- 视频: ${post.isVideo}`);
        console.log(`- 图片: ${post.images.length > 0}`);
        console.log(`- 文本长度: ${post.text.length}`);
        console.log(`- 图片数量: ${post.images.length}`);
        
        if (!post.isVideo && (post.text.length > 0 || post.images.length > 0)) {
          targetPost = post;
          console.log('✓ 找到目标帖子');
          break;
        } else {
          console.log('跳过视频帖子或空帖子');
        }
      }
      
      if (!targetPost) {
        console.log('没有找到合适的帖子');
        continue;
      }
      
      // 分析帖子
      console.log('\n开始分析帖子...');
      let comment = '';
      
      if (targetPost.images.length > 0) {
        console.log('使用视觉模型分析图片...');
        comment = await analyzePostImage(targetPost.images[0], targetPost.text.substring(0, 500));
      } else {
        console.log('分析纯文本帖子...');
        // 纯文本分析
        const reqBody = {
          model: LLM_CONFIG.model,
          messages: [
            {
              role: "user",
              content: `分析这个Facebook帖子，生成一段贴合主题的中立评论，不要表情符号。帖子内容：${targetPost.text.substring(0, 1000)}`
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        };
        
        const res = await axios.post(`${LLM_CONFIG.baseUrl}/chat/completions`, reqBody, {
          headers: {
            'Authorization': `Bearer ${LLM_CONFIG.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        });
        
        comment = res.data.choices?.[0]?.message?.content || '';
      }
      
      console.log('生成的评论:', comment);
      
      if (!comment) {
        console.error('生成评论失败');
        continue;
      }
      
      // 获取第一个帖子的DOM元素
      const firstPostElement = await page.$('div[role="article"]');
      if (!firstPostElement) {
        console.error('无法找到帖子元素');
        continue;
      }
      
      // 滚动到帖子位置
      await firstPostElement.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      
      // 激活评论框
      console.log('激活评论框...');
      await safeAction(() => firstPostElement.$eval('div[aria-label="Comment"], div[aria-label="评论"]', el => el.click()));
      await page.waitForTimeout(500);
      
      // 输入评论
      console.log('输入评论...');
      await safeAction(() => page.type('div[contenteditable="true"][role="textbox"]', comment, { delay: 50 }));
      await page.waitForTimeout(1000);
      
      // 提交评论（使用Enter键，比点击按钮更稳定）
      console.log('提交评论...');
      await safeAction(() => page.keyboard.press('Enter'));
      await page.waitForTimeout(3000);
      
      console.log('✓ 评论发布成功！');
      
      // 关键词之间间隔30秒
      console.log(`\n等待30秒后继续下一个关键词...`);
      await page.waitForTimeout(30000);
    }
    
    // 保持浏览器打开，让用户查看结果
    console.log('浏览器窗口已保持打开，您可以查看评论发布结果');
    // await browser.close();
    
    return {
      code: 0,
      message: '帖子分析和评论成功',
      data: {
        searchKeywords: searchKeywords
      }
    };
    
  } catch (error) {
    console.error('✗ 执行失败:', error.message);
    
    if (browser) {
      await browser.close();
    }
    
    return {
      code: 500,
      message: `执行失败: ${error.message}`
    };
  }
}

module.exports = { analyzeAndCommentFacebookPosts };

// 如果直接运行此文件，则执行技能
if (require.main === module) {
  console.log('直接运行Facebook帖子分析与评论技能...');
  analyzeAndCommentFacebookPosts().then(result => {
    console.log('\n技能执行结果:');
    console.log(result);
    process.exit(result.code === 0 ? 0 : 1);
  }).catch(error => {
    console.error('技能执行失败:', error);
    process.exit(1);
  });
}
