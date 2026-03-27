const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testDoubaoBrowser() {
  console.log('开始测试豆包浏览器交互...');
  
  let browser;
  try {
    // 启动浏览器
    console.log('启动浏览器...');
    browser = await chromium.launch({
      headless: false, // 非无头模式，便于用户操作
      slowMo: 50 // 减慢操作速度，便于观察
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 打开豆包网页
    console.log('打开豆包网页...');
    await page.goto('https://www.doubao.com/chat');
    
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    console.log('豆包网页加载完成');
    
    // 等待用户登录
    console.log('\n请在浏览器中登录豆包账号，登录完成后按任意键继续...');
    await new Promise(resolve => process.stdin.once('data', resolve));
    
    // 等待输入框出现
    console.log('等待输入框出现...');
    await page.waitForSelector('textarea', { timeout: 60000 });
    console.log('输入框已出现');
    
    // 输入第一个问题
    const firstQuestion = '今天在AI圈子有什么特别值得探讨或者关注的事情吗?请提供详细的热点新闻和分析。';
    console.log(`\n输入问题: ${firstQuestion}`);
    await page.fill('textarea', firstQuestion);
    
    // 点击发送按钮
    console.log('发送问题...');
    await page.click('button[type="submit"]');
    
    // 等待回复
    console.log('等待豆包回复...');
    await page.waitForSelector('[class*="message-content"]', { timeout: 60000 });
    
    // 获取回复内容
    const messages = await page.$$('[class*="message-content"]');
    const firstReply = await messages[messages.length - 1].innerText();
    console.log('\n豆包回复:');
    console.log(firstReply);
    
    // 保存第一次回复
    const date = new Date().toISOString().split('T')[0];
    const firstPath = path.join('D:\\weibo\\llm_interactions', `${date}_browser_first.txt`);
    if (!fs.existsSync(path.dirname(firstPath))) {
      fs.mkdirSync(path.dirname(firstPath), { recursive: true });
    }
    fs.writeFileSync(firstPath, firstReply);
    console.log(`\n第一次回复已保存到: ${firstPath}`);
    
    // 输入第二个问题
    const secondQuestion = `请帮我把上面的新闻内容改写成一篇适合在Facebook上发布的帖子，要求：\n1. 语言自然流畅，符合Facebook风格\n2. 突出核心内容\n3. 从专业角度分析，提供独特见解\n4. 适当添加个人观点和评论\n5. 长度适中，控制在300-500字之间\n6. 使用中文撰写\n7. 可以使用表情符号增强可读性\n8. 结构清晰，分段合理`;
    console.log(`\n输入第二个问题: ${secondQuestion}`);
    await page.fill('textarea', secondQuestion);
    
    // 点击发送按钮
    console.log('发送第二个问题...');
    await page.click('button[type="submit"]');
    
    // 等待回复
    console.log('等待豆包回复...');
    await page.waitForSelector('[class*="message-content"]', { timeout: 60000 });
    
    // 获取回复内容
    const messages2 = await page.$$('[class*="message-content"]');
    const secondReply = await messages2[messages2.length - 1].innerText();
    console.log('\n豆包回复 (Facebook帖子):');
    console.log(secondReply);
    
    // 保存第二次回复
    const secondPath = path.join('D:\\weibo\\llm_interactions', `${date}_browser_second.txt`);
    fs.writeFileSync(secondPath, secondReply);
    console.log(`\n第二次回复已保存到: ${secondPath}`);
    
    // 保存到tiezi目录
    const postPath = path.join('D:\\weibo\\tiezi', `${date}_post.txt`);
    fs.writeFileSync(postPath, secondReply);
    console.log(`\nFacebook帖子已保存到: ${postPath}`);
    
    console.log('\n测试完成!');
    
  } catch (error) {
    console.error('测试过程中出现错误:', error);
  } finally {
    if (browser) {
      console.log('\n测试完成，按任意键关闭浏览器...');
      await new Promise(resolve => process.stdin.once('data', resolve));
      await browser.close();
    }
  }
}

// 运行测试
testDoubaoBrowser();