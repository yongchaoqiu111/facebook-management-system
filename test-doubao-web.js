const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testDoubaoWeb() {
  console.log('开始测试豆包网页版交互...');
  
  let browser;
  try {
    // 启动浏览器
    browser = await chromium.launch({
      headless: false, // 非无头模式，便于观察
      slowMo: 100 // 减慢操作速度，便于观察
    });
    
    const context = await browser.newContext();
    
    // 加载豆包的cookie
    const cookiePath = path.join('D:\\weibo\\cookie\\doubao.txt');
    if (fs.existsSync(cookiePath)) {
      console.log('加载豆包cookie...');
      const cookieContent = fs.readFileSync(cookiePath, 'utf8');
      const cookies = cookieContent.split('\n').map(line => {
        const parts = line.split('\t');
        if (parts.length >= 7) {
          return {
            name: parts[0],
            value: parts[1],
            domain: parts[2],
            path: parts[3],
            expires: parts[4] ? new Date(parts[4]).getTime() / 1000 : -1,
            httpOnly: parts[5] === '✓',
            secure: parts[6] === '✓'
          };
        }
        return null;
      }).filter(cookie => cookie !== null);
      
      await context.addCookies(cookies);
      console.log('cookie加载成功');
    } else {
      console.log('未找到豆包cookie文件');
    }
    
    // 打开豆包网页
    const page = await context.newPage();
    console.log('打开豆包网页...');
    await page.goto('https://www.doubao.com/chat');
    
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
    console.log('豆包网页加载完成');
    
    // 等待输入框出现
    await page.waitForSelector('textarea[placeholder="请输入您的问题..."]');
    console.log('输入框已出现');
    
    // 输入问题
    const question = '今天在AI圈子有什么特别值得探讨或者关注的事情吗?请提供详细的热点新闻和分析。';
    console.log(`输入问题: ${question}`);
    await page.fill('textarea[placeholder="请输入您的问题..."]', question);
    
    // 点击发送按钮
    await page.click('button[class*="send-button"]');
    console.log('发送问题');
    
    // 等待回复
    console.log('等待豆包回复...');
    await page.waitForSelector('[class*="message-content"]', { timeout: 60000 });
    
    // 获取回复内容
    const replyElements = await page.$$('[class*="message-content"]');
    const lastReply = await replyElements[replyElements.length - 1].innerText();
    console.log('豆包回复:');
    console.log(lastReply);
    
    // 保存第一次回复
    const date = new Date().toISOString().split('T')[0];
    const firstResponsePath = path.join('D:\\weibo\\llm_interactions', `${date}_doubao_web_first_response.txt`);
    
    if (!fs.existsSync(path.dirname(firstResponsePath))) {
      fs.mkdirSync(path.dirname(firstResponsePath), { recursive: true });
    }
    
    fs.writeFileSync(firstResponsePath, lastReply);
    console.log(`\n第一次回复已保存到: ${firstResponsePath}`);
    
    // 输入第二个问题，请求改写为Facebook帖子
    const secondQuestion = `嗯，这个新闻有点意思，但是我觉得观点不够鲜明。请你帮我用资深AI工作员的角度去改写一下这个新闻，作为Facebook的帖子发布。要求：\n1. 语言自然流畅，符合Facebook风格\n2. 突出核心内容\n3. 从专业角度分析，提供独特见解\n4. 适当添加个人观点和评论\n5. 长度适中，控制在300-500字之间\n6. 使用中文撰写\n7. 可以使用表情符号增强可读性\n8. 结构清晰，分段合理`;
    
    console.log(`\n输入第二个问题: ${secondQuestion}`);
    await page.fill('textarea[placeholder="请输入您的问题..."]', secondQuestion);
    
    // 点击发送按钮
    await page.click('button[class*="send-button"]');
    console.log('发送第二个问题');
    
    // 等待回复
    console.log('等待豆包回复...');
    await page.waitForSelector('[class*="message-content"]', { timeout: 60000 });
    
    // 获取回复内容
    const replyElements2 = await page.$$('[class*="message-content"]');
    const lastReply2 = await replyElements2[replyElements2.length - 1].innerText();
    console.log('豆包回复 (Facebook帖子):');
    console.log(lastReply2);
    
    // 保存第二次回复
    const secondResponsePath = path.join('D:\\weibo\\llm_interactions', `${date}_doubao_web_second_response.txt`);
    fs.writeFileSync(secondResponsePath, lastReply2);
    console.log(`\n第二次回复已保存到: ${secondResponsePath}`);
    
    // 也保存到tiezi目录，作为当天的帖子
    const postPath = path.join('D:\\weibo\\tiezi', `${date}_post.txt`);
    fs.writeFileSync(postPath, lastReply2);
    console.log(`\nFacebook帖子已保存到: ${postPath}`);
    
    console.log('\n测试完成!');
    
  } catch (error) {
    console.error('测试过程中出现错误:', error);
  } finally {
    if (browser) {
      // 等待用户查看结果
      console.log('\n请查看浏览器中的结果，按任意键关闭浏览器...');
      await new Promise(resolve => process.stdin.once('data', resolve));
      await browser.close();
    }
  }
}

// 运行测试
testDoubaoWeb();