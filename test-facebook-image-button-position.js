const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testFacebookImageButtonPosition() {
  console.log('启动 Facebook 图片按钮位置测试脚本...');
  
  try {
    // 启动浏览器
    const browser = await chromium.launch({
      headless: false,
      slowMo: 100
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
            const cookie = {
              name: parts[0],
              value: parts[1],
              domain: parts[2],
              path: parts[3],
              httpOnly: parts[5] === '✓',
              secure: parts[6] === '✓'
            };
            
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
        
        if (cookies.length > 0) {
          console.log(`加载了 ${cookies.length} 个 cookie`);
          await context.addCookies(cookies);
        }
      } catch (error) {
        console.error('加载 cookie 失败:', error.message);
      }
    } else {
      console.log('未找到 cookie 文件');
    }
    
    // 打开 Facebook
    console.log('打开 Facebook 主页...');
    await page.goto('https://www.facebook.com');
    
    console.log('✓ Facebook 网页打开成功');
    console.log('当前 URL:', page.url());
    
    // 自动检测登录状态
    console.log('\n自动检测登录状态...');
    console.log('等待登录页面按钮消失...');
    
    try {
      // 等待登录按钮消失
      await page.waitForSelector('[data-testid="royal_login_button"]', { timeout: 30000, state: 'hidden' });
      console.log('✓ 登录按钮消失');
      
      // 等待发布按钮出现
      console.log('等待发布按钮出现...');
      await page.waitForSelector('[aria-label="创建帖子"]', { timeout: 30000 });
      console.log('✓ 发布按钮出现');
      
      console.log('✓ 登录成功，进入主页面');
    } catch (error) {
      console.error('✗ 登录状态检测失败:', error.message);
      console.log('请手动登录 Facebook...');
      console.log('登录完成后，按任意键继续...');
      
      process.stdin.setRawMode(true);
      process.stdin.resume();
      await new Promise(resolve => process.stdin.once('data', resolve));
    }
    
    // 尝试查找发图按钮
    console.log('\n尝试查找发图按钮...');
    
    const selectors = [
      '[aria-label="照片/视频"]',
      '[data-testid="media-button"]',
      '[aria-label="添加照片/视频"]',
      '[class*="media"]',
      '[class*="photo"]',
      '[class*="video"]'
    ];
    
    let foundButton = null;
    let foundSelector = '';
    
    for (const selector of selectors) {
      try {
        console.log(`尝试选择器: ${selector}`);
        const button = await page.$(selector);
        if (button) {
          const boundingBox = await button.boundingBox();
          if (boundingBox) {
            console.log(`✓ 找到按钮: ${selector}`);
            console.log(`  位置: x=${boundingBox.x}, y=${boundingBox.y}`);
            console.log(`  大小: width=${boundingBox.width}, height=${boundingBox.height}`);
            foundButton = button;
            foundSelector = selector;
            break;
          }
        }
      } catch (error) {
        console.log(`✗ 选择器 ${selector} 失败: ${error.message}`);
      }
    }
    
    // 尝试找到创建帖子按钮
    console.log('\n尝试找到创建帖子按钮...');
    try {
      const createPostButton = await page.$('[aria-label="创建帖子"]');
      if (createPostButton) {
        await createPostButton.click();
        console.log('✓ 点击创建帖子按钮成功');
        
        // 1. 等待发帖卡片加载完成
        console.log('1. 等待发帖卡片加载...');
        await page.waitForTimeout(5000);
        
        // 2. 找到发帖卡片
        const composerCard = await page.$('[data-testid="react-composer-root"]');
        let foundMediaButton = null;
        
        if (composerCard) {
          console.log('✓ 找到发帖卡片');
          
          // 3. 在卡片中添加帖子内容
          console.log('3. 在卡片中添加帖子内容...');
          try {
            // 读取帖子内容
            const postContent = fs.readFileSync('D:\\weibo\\tiezi\\2026-03-19_post.txt', 'utf8');
            console.log(`帖子内容: ${postContent}`);
            
            // 在卡片中找到文本输入框
            const contenteditableDiv = await composerCard.$('div[contenteditable="true"]');
            if (contenteditableDiv) {
              await contenteditableDiv.click({ force: true });
              await contenteditableDiv.evaluate((el, text) => {
                el.textContent = text;
                const event = new Event('input', { bubbles: true });
                el.dispatchEvent(event);
              }, postContent);
              console.log('✓ 文本内容添加成功');
            } else {
              console.log('✗ 在卡片中未找到文本输入框');
            }
            
            // 等待内容渲染
            await page.waitForTimeout(3000);
          } catch (error) {
            console.log('✗ 添加帖子内容失败:', error.message);
          }
          
          // 4. 在卡片中点击照片/视频按钮
          console.log('\n4. 在卡片中寻找并点击照片/视频按钮...');
          const mediaButtons = [
            '[aria-label="照片/视频"]',
            '[data-testid="media-button"]',
            '.x1qjc9v5.x9f619.x78zum5.xdt5ytf.x1iyjqo2'
          ];
          
          for (const selector of mediaButtons) {
            const button = await composerCard.$(selector);
            if (button) {
              foundMediaButton = button;
              console.log(`✓ 找到照片/视频按钮: ${selector}`);
              break;
            }
          }
        } else {
          console.log('✗ 未找到发帖卡片');
        }
        
        if (foundMediaButton) {
          console.log('✓ 找到照片/视频按钮');
          
          // 直接在当前卡片中上传图片，不点击按钮
          console.log('直接在当前卡片中上传图片...');
          try {
            // 查找文件输入元素
            const fileInput = await page.$('input[type="file"]');
            if (fileInput) {
              const imagePath = 'D:\\weibo\\images\\1.png';
              console.log(`尝试上传图片: ${imagePath}`);
              await fileInput.setInputFiles(imagePath);
              console.log('✓ 图片上传成功');
              
              // 等待图片上传完成
              console.log('等待图片上传完成...');
              await page.waitForTimeout(10000);
            } else {
              console.log('✗ 未找到文件输入元素');
              // 如果找不到文件输入元素，尝试点击照片/视频按钮
              console.log('尝试点击照片/视频按钮...');
              await foundMediaButton.click({ force: true });
              console.log('✓ 点击照片/视频按钮成功');
              
              // 等待文件上传输入框出现
              console.log('等待文件上传输入框出现...');
              await page.waitForSelector('input[type="file"]', { timeout: 15000 });
              
              // 上传图片
              const fileInputAfterClick = await page.$('input[type="file"]');
              if (fileInputAfterClick) {
                const imagePath = 'D:\\weibo\\images\\1.png';
                console.log(`尝试上传图片: ${imagePath}`);
                await fileInputAfterClick.setInputFiles(imagePath);
                console.log('✓ 图片上传成功');
                
                // 等待图片上传完成
                console.log('等待图片上传完成...');
                await page.waitForTimeout(10000);
              }
            }
          } catch (error) {
            console.log('✗ 上传图片失败:', error.message);
          }
        } else {
          console.log('✗ 未找到照片/视频按钮');
        }
        
        // 5. 最后尝试找到并点击发布按钮
        console.log('\n5. 尝试找到发布按钮...');
        
        // 尝试多种选择器
        const publishSelectors = [
          '[aria-label="发布"]',
          '[data-testid="react-composer-post-button"]',
          '[type="submit"]',
          '[role="button"]',
          '[data-testid="post-button"]',
          '[data-testid="react-composer-primary-button"]'
        ];
        
        let foundPublishButton = null;
        
        // 等待发布按钮出现
        await page.waitForTimeout(5000);
        
        for (const selector of publishSelectors) {
          try {
            const buttons = await page.$$(selector);
            for (const button of buttons) {
              const text = await button.textContent();
              const ariaLabel = await button.getAttribute('aria-label');
              
              if ((text && (text.includes('发布') || text.includes('Post'))) || 
                  (ariaLabel && (ariaLabel.includes('发布') || ariaLabel.includes('Post')))) {
                foundPublishButton = button;
                console.log(`✓ 找到发布按钮: ${selector}`);
                console.log(`  文本: ${text || '无'}`);
                break;
              }
            }
            if (foundPublishButton) break;
          } catch (error) {
            console.log(`✗ 发布按钮选择器 ${selector} 失败: ${error.message}`);
          }
        }
        
        if (foundPublishButton) {
          console.log('\n尝试点击发布按钮...');
          try {
            await foundPublishButton.click({ force: true });
            console.log('✓ 点击发布按钮成功');
          } catch (error) {
            console.log('✗ 常规点击失败，尝试使用JavaScript点击...');
            await foundPublishButton.evaluate(button => button.click());
            console.log('✓ JavaScript点击发布按钮成功');
          }
          
          // 等待发布完成
          console.log('等待发布完成...');
          await page.waitForLoadState('networkidle', { timeout: 30000 });
          console.log('✓ 发布完成');
        } else {
          console.log('✗ 未找到发布按钮');
        }
      } else {
        console.log('✗ 未找到创建帖子按钮');
      }
    } catch (error) {
      console.log('✗ 操作失败:', error.message);
    }
    
    // 等待用户操作
    console.log('\n测试完成，按任意键关闭浏览器...');
    await new Promise(resolve => process.stdin.once('data', resolve));
    
    await browser.close();
    console.log('浏览器已关闭');
    
    // 输出结果
    console.log('\n=== 测试结果 ===');
    if (foundButton) {
      console.log(`找到的发图按钮选择器: ${foundSelector}`);
    } else {
      console.log('未找到发图按钮');
    }
    
  } catch (error) {
    console.error('✗ 测试失败:', error.message);
  }
}

testFacebookImageButtonPosition();
