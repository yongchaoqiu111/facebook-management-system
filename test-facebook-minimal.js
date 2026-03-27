const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testFacebookMinimal() {
  console.log('启动 Facebook 极简测试脚本...');
  
  try {
    // 启动浏览器
    const browser = await chromium.launch({
      headless: false
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 加载 cookie
    const cookiePath = path.join(__dirname, 'cookie', 'facebook.txt');
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
    console.log('等待登录页面按钮消失...');
    
    let loginSuccess = false;
    
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
        return;
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
    }
    
    // 直接上传图片（避免弹出文件选择对话框）
    console.log('\n直接上传图片...');
    try {
      // 直接获取隐藏的文件输入元素
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        const imagePath = 'D:\\weibo\\images\\2.png';
        console.log(`尝试上传图片: ${imagePath}`);
        await fileInput.setInputFiles(imagePath);
        console.log('✓ 图片上传成功');
        
        // 等待图片上传完成
        await page.waitForTimeout(10000);
      }
    } catch (error) {
      console.log('✗ 上传图片失败:', error.message);
    }
    
    // 添加文本（使用成功的方法：先点击再输入）
    console.log('添加文本内容...');
    try {
      const postContent = fs.readFileSync('D:\\weibo\\tiezi\\2026-03-19_post.txt', 'utf8');
      
      // 方法3: 先点击再输入（成功方法）
      console.log('使用方法3: 先点击再输入...');
      const textArea = await page.waitForSelector('div[contenteditable="true"]', { timeout: 15000 });
      await textArea.click();
      await textArea.type(postContent);
      console.log('✓ 文本内容添加成功');
      
      // 等待文本渲染
      await page.waitForTimeout(2000);
    } catch (error) {
      console.error('✗ 添加文本内容失败:', error.message);
    }
    
    // 发布帖子（使用更灵活的定位方式）
    console.log('发布帖子...');
    try {
      await page.click('[aria-label="发帖"]');
    } catch (error) {
      console.log('尝试使用英文标签...');
      try {
        await page.click('[aria-label="Post"]');
      } catch (error2) {
        console.log('尝试使用数据测试ID...');
        await page.click('[data-testid="react-composer-post-button"]');
      }
    }
    
    console.log('✓ 发布按钮点击成功');
    
    // 等待发布完成
    console.log('等待发布完成...');
    await page.waitForTimeout(5000);
    
    // 验证发布是否成功
    console.log('✓ 发布成功！帖子已发布到Facebook');
    
    // 等待用户确认
    console.log('按任意键关闭浏览器...');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    await new Promise(resolve => process.stdin.once('data', resolve));
    
    await browser.close();
    
  } catch (error) {
    console.error('✗ 测试失败:', error.message);
  }
}

testFacebookMinimal();