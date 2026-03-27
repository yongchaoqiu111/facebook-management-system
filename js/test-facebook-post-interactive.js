const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testFacebookPostInteractive() {
  console.log('=== Facebook 发帖交互式测试 ===');
  console.log('说明：此脚本将与您交互，帮助找到并点击发帖按钮');
  console.log('');
  console.log('操作步骤：');
  console.log('1. 浏览器打开后，观察发帖按钮的位置');
  console.log('2. 按照脚本提示进行操作');
  console.log('3. 提供反馈帮助脚本找到正确的按钮');
  console.log('');
  
  let browser = null;
  
  try {
    // 读取 Facebook cookie 文件
    const cookiePath = path.join(__dirname, 'cookie', 'facebook.txt');
    const cookieContent = fs.readFileSync(cookiePath, 'utf8');
    
    // 解析 cookie
    const cookies = cookieContent.split('\n').map(line => {
      const parts = line.split('\t');
      if (parts.length >= 7) {
        const cookie = {
          name: parts[0],
          value: parts[1],
          domain: parts[2],
          path: parts[3],
          httpOnly: parts[5] === '✓',
          secure: parts[6] === '✓'
        };
        
        // 处理过期时间
        const expiresStr = parts[4];
        if (expiresStr && expiresStr !== '会话') {
          const expires = new Date(expiresStr);
          if (!isNaN(expires.getTime())) {
            cookie.expires = expires.getTime() / 1000;
          }
        }
        
        return cookie;
      }
      return null;
    }).filter(Boolean);
    
    console.log(`加载了 ${cookies.length} 个 cookies`);
    
    // 启动浏览器
    console.log('启动浏览器...');
    browser = await chromium.launch({
      headless: false,
      slowMo: 30,
      args: ['--start-maximized']
    });
    
    const context = await browser.newContext({
      viewport: null
    });
    
    // 添加 cookie
    for (const cookie of cookies) {
      await context.addCookies([cookie]);
    }
    
    // 打开 Facebook
    console.log('打开 Facebook...');
    const page = await context.newPage();
    await page.goto('https://www.facebook.com');
    
    // 等待页面加载
    await page.waitForLoadState('domcontentloaded');
    console.log('页面加载完成');
    
    // 检查登录状态
    console.log('\n=== 检测登录状态 ===');
    
    let hasCreatePostButton = false;
    try {
      console.log('正在检查创建帖子按钮...');
      await page.waitForSelector('[aria-label="创建帖子"]', { timeout: 10000 });
      hasCreatePostButton = true;
      console.log('✓ 创建帖子按钮存在');
    } catch (error) {
      console.log('✗ 创建帖子按钮不存在:', error.message);
    }
    
    if (hasCreatePostButton) {
      console.log('\n=== 打开帖子创建界面 ===');
      
      try {
        // 点击创建帖子按钮
        console.log('点击创建帖子按钮...');
        await page.click('[aria-label="创建帖子"]', { force: true });
        console.log('✓ 点击成功');
        
        // 等待帖子界面加载
        await page.waitForTimeout(3000);
        console.log('✓ 帖子界面加载完成');
        
        console.log('\n=== 上传图片 ===');
        
        // 查找并点击图片按钮
        const imageButtonSelectors = [
          '[aria-label="照片/视频"]',
          '[aria-label="照片和视频"]',
          '[aria-label="Photo/Video"]'
        ];
        
        let imageButtonFound = false;
        
        for (const selector of imageButtonSelectors) {
          try {
            console.log(`尝试选择器: ${selector}`);
            const button = await page.waitForSelector(selector, { timeout: 5000 });
            console.log('✓ 找到图片按钮');
            
            // 点击图片按钮
            await button.click({ force: true });
            console.log('✓ 点击图片按钮成功');
            imageButtonFound = true;
            
            // 等待文件选择对话框
            await page.waitForTimeout(3000);
            
            // 上传图片
            const fileInput = await page.$('input[type="file"]');
            if (fileInput) {
              const imagePath = path.join(__dirname, 'images', '1.png');
              if (fs.existsSync(imagePath)) {
                await fileInput.setInputFiles(imagePath);
                console.log('✓ 图片上传成功');
                await page.waitForTimeout(8000);
              }
            }
            
            break;
          } catch (error) {
            console.log('✗ 未找到图片按钮:', error.message);
          }
        }
        
        if (imageButtonFound) {
          console.log('\n=== 交互式查找发帖按钮 ===');
          console.log('请观察浏览器中的发帖按钮');
          console.log('');
          console.log('问题 1: 您能看到发帖按钮吗？');
          console.log('1. 能看到');
          console.log('2. 看不到');
          console.log('');
          
          // 等待用户输入
          process.stdin.setRawMode(true);
          process.stdin.resume();
          const answer1 = await new Promise(resolve => {
            process.stdin.once('data', data => {
              resolve(data.toString().trim());
            });
          });
          
          if (answer1 === '1') {
            console.log('\n您能看到发帖按钮，请将鼠标移动到按钮上');
            console.log('然后按任意键，我会尝试获取按钮信息');
            
            // 等待用户输入
            await new Promise(resolve => {
              process.stdin.once('data', resolve);
            });
            
            // 尝试查找发帖按钮
            console.log('\n尝试查找发帖按钮...');
            
            const postButtonSelectors = [
              // 常见的发帖按钮选择器
              '//button[contains(text(), "发布")]',
              '//button[contains(text(), "Post")]',
              '[aria-label="发布"]',
              '[aria-label="Post"]',
              '//button[@type="submit"]',
              
              // 更具体的选择器
              '//div[@role="dialog"]//button[contains(text(), "发布")]',
              '//div[@role="dialog"]//button[contains(text(), "Post")]',
              '//div[contains(@class, "post")]//button',
              '//button[contains(@class, "publish")]',
              '//button[contains(@class, "post")]',
              
              // 基于位置的选择器
              '//div[@role="dialog"]//button[last()]',
              '//div[@aria-label="创建帖子"]//button[last()]'
            ];
            
            let postButtonFound = false;
            
            for (const selector of postButtonSelectors) {
              try {
                console.log(`尝试选择器: ${selector}`);
                const button = await page.waitForSelector(selector, { timeout: 3000 });
                console.log('✓ 找到发帖按钮');
                
                // 获取按钮信息
                const boundingBox = await button.boundingBox();
                const text = await button.textContent();
                const ariaLabel = await button.getAttribute('aria-label');
                
                console.log(`  位置: x=${boundingBox.x.toFixed(2)}, y=${boundingBox.y.toFixed(2)}`);
                console.log(`  大小: width=${boundingBox.width.toFixed(2)}, height=${boundingBox.height.toFixed(2)}`);
                console.log(`  文本: ${text || '无'}`);
                console.log(`  aria-label: ${ariaLabel || '无'}`);
                
                // 尝试点击
                console.log('  尝试点击...');
                try {
                  await button.click({ force: true });
                  console.log('  ✓ 点击成功');
                  postButtonFound = true;
                  
                  // 等待发布完成
                  console.log('  等待发布完成...');
                  await page.waitForTimeout(8000);
                  
                  break;
                } catch (error) {
                  console.log('  ✗ 点击失败:', error.message);
                  
                  // 尝试其他点击方式
                  try {
                    console.log('  尝试强制点击...');
                    await button.click({ force: true });
                    console.log('  ✓ 强制点击成功');
                    postButtonFound = true;
                    break;
                  } catch (error) {
                    console.log('  ✗ 强制点击失败:', error.message);
                  }
                }
              } catch (error) {
                // 继续尝试下一个选择器
              }
            }
            
            if (!postButtonFound) {
              console.log('\n✗ 未找到发帖按钮');
              console.log('请手动点击发帖按钮完成发布');
            }
          } else {
            console.log('\n您看不到发帖按钮，请检查是否需要滚动或其他操作');
            console.log('按任意键继续...');
            
            // 等待用户输入
            await new Promise(resolve => {
              process.stdin.once('data', resolve);
            });
          }
        }
        
      } catch (error) {
        console.log('✗ 操作失败:', error.message);
      }
    } else {
      console.log('\n=== 未登录 ===');
      console.log('请手动登录 Facebook');
    }
    
    console.log('\n=== 测试完成 ===');
    console.log('浏览器保持打开状态，您可以手动进行操作');
    console.log('');
    console.log('当您完成测试后，请按任意键关闭浏览器');
    
  } catch (error) {
    console.log('✗ 发生错误:', error.message);
    console.log('浏览器保持打开状态，请手动检查');
    console.log('');
    console.log('按任意键关闭浏览器');
  }
  
  // 等待用户输入
  process.stdin.setRawMode(true);
  process.stdin.resume();
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });
  
  // 关闭浏览器
  if (browser) {
    await browser.close();
    console.log('浏览器已关闭');
  }
}

testFacebookPostInteractive().catch(console.error);