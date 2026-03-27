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

async function analyzeFacebookPosts(input = {}) {
  let browser = null;
  
  try {
    console.log('启动Facebook帖子分析技能...');
    
    // 启动浏览器
    browser = await chromium.launch({
      headless: false,
      args: ['--disable-notifications']
    });
    
    const page = await browser.newPage();
    
    // 加载cookie
    const cookiePath = path.join(__dirname, '../../user-config/accounts/facebook.txt');
    if (fs.existsSync(cookiePath)) {
      try {
        const cookieContent = fs.readFileSync(cookiePath, 'utf8');
        if (cookieContent.trim().startsWith('[')) {
          const cookies = JSON.parse(cookieContent);
          await page.context().addCookies(cookies);
          console.log('✓ 成功加载JSON格式cookie');
        } else {
          const cookies = parseTextCookies(cookieContent);
          if (cookies.length > 0) {
            await page.context().addCookies(cookies);
            console.log(`✓ 成功加载文本格式cookie，共${cookies.length}个`);
          }
        }
      } catch (error) {
        console.error('加载cookie失败:', error);
      }
    }
    
    // 打开Facebook小组页面
    console.log('打开Facebook小组页面...');
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount< maxRetries) {
      try {
        await page.goto('https://www.facebook.com/groups/feed/', { timeout: 45000 });
        await page.waitForLoadState('networkidle');
        console.log('✓ Facebook小组页面打开成功');
        break;
      } catch (error) {
        retryCount++;
        console.log(`页面加载失败，正在重试 ${retryCount}/${maxRetries}...`);
        await page.waitForTimeout(2000);
        
        if (retryCount >= maxRetries) {
          console.error('✗ Facebook页面加载失败，请检查网络连接或Facebook访问限制');
          throw new Error('Facebook页面加载失败，请检查网络连接');
        }
      }
    }
    
    // 检查登录状态
    console.log('自动检测登录状态...');
    await page.waitForTimeout(3000);
    
    const isLoggedIn = await page.evaluate(() => {
      return !document.querySelector('button[name="login"]') && 
             !document.querySelector('input[type="email"]') &&
             document.querySelectorAll('button').length > 5;
    });
    
    if (!isLoggedIn) {
      console.error('✗ 未登录，请先登录Facebook');
      return {
        code: 401,
        message: '未登录，请先登录Facebook'
      };
    }
    
    console.log('✓ 登录成功');
    
    // 等待帖子加载
    console.log('等待帖子加载...');
    await page.waitForSelector('div[role="article"]', { timeout: 15000 });
    console.log('✓ 帖子加载完成');
    
    // 获取帖子
    const posts = await page.evaluate(() => {
      const posts = [];
      const postElements = document.querySelectorAll('div[role="article"]');
      
      postElements.forEach(postEl => {
        // 提取文本内容
        const textElements = postEl.querySelectorAll('div[dir="auto"]');
        const textContent = Array.from(textElements)
          .map(el => el.textContent.trim())
          .filter(text => text && text.length > 10)
          .join('\n');
        
        if (!textContent) return;
        
        // 提取图片
        const images = [];
        const imgElements = postEl.querySelectorAll('img');
        imgElements.forEach(img => {
          const src = img.src;
          if (src && src.startsWith('http')) {
            images.push(src);
          }
        });
        
        posts.push({
          text: textContent,
          images: images.slice(0, 3) // 最多处理3张图片
        });
      });
      
      return posts;
    });
    
    console.log(`找到 ${posts.length} 个帖子`);
    
    if (posts.length === 0) {
      console.log('没有找到帖子');
      return {
        code: 0,
        message: '没有找到帖子'
      };
    }
    
    // 分析帖子
    const analyzedPosts = [];
    
    for (let i = 0; i< Math.min(posts.length, 3); i++) { // 最多分析3个帖子
      const post = posts[i];
      console.log(`\n分析第 ${i + 1} 个帖子...`);
      console.log(`文本内容长度: ${post.text.length}`);
      console.log(`图片数量: ${post.images.length}`);
      
      try {
        const analysis = await analyzePostWithLLM(post.text, post.images);
        analyzedPosts.push({
          index: i + 1,
          text: post.text.substring(0, 100) + '...',
          images: post.images,
          analysis: analysis
        });
      } catch (error) {
        console.error(`分析第 ${i + 1} 个帖子失败:`, error.message);
      }
    }
    
    console.log('\n✓ 帖子分析完成');
    
    // 保持浏览器打开，让用户查看结果
    console.log('浏览器窗口已保持打开，您可以查看帖子分析结果');
    // await browser.close();
    
    return {
      code: 0,
      message: '帖子分析成功',
      data: {
        analyzedPosts: analyzedPosts
      }
    };
    
  } catch (error) {
    console.error('✗ 帖子分析失败:', error.message);
    
    if (browser) {
      await browser.close();
    }
    
    return {
      code: 500,
      message: `帖子分析失败: ${error.message}`
    };
  }
}

async function analyzePostWithLLM(text, images) {
  const messages = [
    {
      role: 'system',
      content: '你是一个Facebook帖子分析专家。请详细分析帖子的内容、主题、情感和关键信息。'
    },
    {
      role: 'user',
      content: [
        { 
          type: 'text', 
          text: `请分析这个Facebook帖子：\n\n${text}\n\n请提供以下分析：\n1. 帖子主题和核心内容\n2. 情感分析（正面/负面/中性）\n3. 关键信息和要点\n4. 可能的评论方向和建议` 
        }
      ]
    }
  ];
  
  // 添加图片
  if (images && images.length > 0) {
    images.forEach(imgUrl => {
      messages[1].content.push({
        type: 'image_url',
        image_url: { url: imgUrl }
      });
    });
  }
  
  const response = await axios.post(`${LLM_CONFIG.baseUrl}/chat/completions`, {
    model: LLM_CONFIG.model,
    messages: messages,
    max_tokens: 1000,
    temperature: 0.7
  }, {
    headers: {
      'Authorization': `Bearer ${LLM_CONFIG.apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 60000
  });
  
  return response.data.choices[0].message.content;
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

module.exports = { analyzeFacebookPosts };
