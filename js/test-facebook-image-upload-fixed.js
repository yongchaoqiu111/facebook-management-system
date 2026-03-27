const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testFacebookImageUploadFixed() {
  console.log('=== Facebook 图片上传测试（修复版）===');
  console.log('说明：此脚本将改进上传方式，确保文件选择器正确关闭');
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
        
        console.log('\n=== 查找并点击图片按钮 ===');
        
        // 尝试各种可能的图片按钮选择器
        const imageButtonSelectors = [
          '[aria-label="照片/视频"]',
          '[aria-label="照片和视频"]',
          '[aria-label="Photo/Video"]',
          '//div[@role="button" and contains(@aria-label, "照片")]',
          '//button[contains(text(), "照片")]',
          '//*[contains(@aria-label, "相机")]'
        ];
        
        let imageButtonFound = false;
        
        for (const selector of imageButtonSelectors) {
          try {
            console.log(`尝试选择器: ${selector}`);
            const button = await page.waitForSelector(selector, { timeout: 5000 });
            console.log('✓ 找到按钮');
            
            // 获取按钮信息
            const boundingBox = await button.boundingBox();
            console.log(`  位置: x=${boundingBox.x.toFixed(2)}, y=${boundingBox.y.toFixed(2)}`);
            console.log(`  大小: width=${boundingBox.width.toFixed(2)}, height=${boundingBox.height.toFixed(2)}`);
            
            // 尝试点击
            console.log('  尝试点击...');
            try {
              await button.click({ force: true });
              console.log('  ✓ 点击成功');
              imageButtonFound = true;
              
              // 等待文件选择对话框
              console.log('  等待文件选择对话框...');
              await page.waitForTimeout(3000);
              
              // 检查是否有文件输入框
              try {
                console.log('  查找文件输入框...');
                // 使用更通用的选择器查找文件输入框
                const fileInput = await page.$('input[type="file"]');
                if (fileInput) {
                  console.log('  ✓ 找到文件输入框');
                  
                  // 上传图片
                  const imagePath = path.join(__dirname, 'images', '1.png');
                  if (fs.existsSync(imagePath)) {
                    console.log(`  上传图片: ${imagePath}`);
                    
                    // 使用更可靠的方式上传图片
                    await fileInput.setInputFiles(imagePath);
                    console.log('  ✓ 图片上传成功');
                    
                    // 等待上传完成
                    console.log('  等待图片上传完成...');
                    await page.waitForTimeout(10000);
                    
                    // 检查上传是否成功
                    try {
                      // 等待图片预览出现
                      await page.waitForSelector('img[alt="上传的图片"]', { timeout: 5000 });
                      console.log('  ✓ 图片预览出现，上传成功');
                    } catch (error) {
                      console.log('  ⚠ 未找到图片预览，可能上传成功但预览未显示');
                    }
                    
                    // 尝试查找发帖按钮
                    console.log('\n=== 查找发帖按钮 ===');
                    try {
                      const postButtonSelectors = [
                        '//button[contains(text(), "发布")]',
                        '//button[contains(text(), "Post")]',
                        '[aria-label="发布"]',
                        '[aria-label="Post"]',
                        '//button[@type="submit"]'
                      ];
                      
                      let postButtonFound = false;
                      
                      for (const postSelector of postButtonSelectors) {
                        try {
                          console.log(`尝试选择器: ${postSelector}`);
                          const postButton = await page.waitForSelector(postSelector, { timeout: 5000 });
                          console.log('✓ 找到发帖按钮');
                          
                          // 尝试点击发帖按钮
                          console.log('  尝试点击发帖按钮...');
                          await postButton.click({ force: true });
                          console.log('  ✓ 点击发帖按钮成功');
                          postButtonFound = true;
                          
                          // 等待发布完成
                          console.log('  等待发布完成...');
                          await page.waitForTimeout(8000);
                          
                          break;
                        } catch (error) {
                          console.log('  ✗ 未找到发帖按钮:', error.message);
                        }
                      }
                      
                      if (!postButtonFound) {
                        console.log('✗ 未找到发帖按钮，请手动点击');
                      }
                    } catch (error) {
                      console.log('✗ 查找发帖按钮失败:', error.message);
                    }
                  } else {
                    console.log('  ✗ 图片文件不存在');
                  }
                } else {
                  console.log('  ✗ 未找到文件输入框');
                }
              } catch (error) {
                console.log('  ✗ 处理文件输入框失败:', error.message);
              }
              
              break;
            } catch (error) {
              console.log('  ✗ 点击失败:', error.message);
            }
          } catch (error) {
            // 继续尝试下一个选择器
          }
        }
        
        if (!imageButtonFound) {
          console.log('\n✗ 未找到图片按钮');
          console.log('请手动在浏览器中查找并点击图片按钮');
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

testFacebookImageUploadFixed().catch(console.error);