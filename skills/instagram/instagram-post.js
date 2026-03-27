const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const MODULE = 'InstagramPostSkill';

/**
 * Instagram 发帖输入参数。
 */
function log(message) {
  console.log(`[${MODULE}] [${new Date().toISOString()}] ${message}`);
}

/**
 * 保存Cookie到文件
 * @param {Object} page - Playwright页面对象
 * @param {string} cookiePath - Cookie文件路径
 */
async function saveCookies(page, cookiePath) {
  try {
    const cookies = await page.context().cookies();
    const cookieContent = cookies.map(cookie => {
      return `${cookie.name}\t${cookie.value}\t${cookie.domain}\t${cookie.path}\t${cookie.expires || ''}\t${cookie.httpOnly ? '✓' : ''}\t${cookie.secure ? '✓' : ''}`;
    }).join('\n');
    
    fs.writeFileSync(cookiePath, cookieContent, 'utf-8');
    log(`Cookie已保存到: ${cookiePath}`);
    return true;
  } catch (error) {
    log(`保存Cookie失败: ${error.message}`);
    return false;
  }
}

/**
 * 从文件加载Cookie
 * @param {Object} context - Playwright浏览器上下文
 * @param {string} cookiePath - Cookie文件路径
 */
async function loadCookies(context, cookiePath) {
  try {
    if (fs.existsSync(cookiePath)) {
      const cookieContent = fs.readFileSync(cookiePath, 'utf-8');
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
        log(`成功加载Cookie，共${cookies.length}个`);
        return true;
      }
    } else {
      log(`Cookie文件不存在: ${cookiePath}`);
    }
    return false;
  } catch (error) {
    log(`加载Cookie失败: ${error.message}`);
    return false;
  }
}

/**
 * 判断Instagram登录状态
 * @param {Object} page - Playwright页面对象
 * @returns {Promise<boolean>} 是否登录成功
 */
async function checkLoginStatus(page) {
  try {
    log('检测登录状态...');
    
    // 等待页面加载完成（使用较短的超时）
    try {
      await page.waitForLoadState('networkidle', { timeout: 10000 });
    } catch (error) {
      log('页面加载超时，继续检测登录状态');
    }
    
    // 等待页面元素加载
    await page.waitForTimeout(1000);
    
    // 检查是否存在登录表单
    const loginForm = await page.$('form[action="/accounts/login/ajax/"]');
    if (loginForm) {
      log('检测到登录表单，未登录');
      return false;
    }
    
    // 检查是否存在用户名输入框
    const usernameInput = await page.$('input[name="username"]');
    if (usernameInput) {
      log('检测到用户名输入框，未登录');
      return false;
    }
    
    // 检查是否存在密码输入框
    const passwordInput = await page.$('input[name="password"]');
    if (passwordInput) {
      log('检测到密码输入框，未登录');
      return false;
    }
    
    // 检查是否存在登录按钮
    const loginButton = await page.$('button[type="submit"]');
    if (loginButton) {
      const buttonText = await loginButton.textContent();
      if (buttonText && (buttonText.includes('Log in') || buttonText.includes('登录'))) {
        log('检测到登录按钮，未登录');
        return false;
      }
    }
    
    // 检查是否存在主页元素（已登录状态）
    // 检查导航栏
    const navBar = await page.$('nav');
    if (navBar) {
      log('登录成功，检测到导航栏');
      return true;
    }
    
    // 检查主页图标
    const homeIcon = await page.$('svg[aria-label="主页"]');
    if (homeIcon) {
      log('登录成功，检测到主页图标');
      return true;
    }
    
    // 检查发现图标
    const exploreIcon = await page.$('svg[aria-label="发现"]');
    if (exploreIcon) {
      log('登录成功，检测到发现图标');
      return true;
    }
    
    // 检查消息图标
    const messageIcon = await page.$('svg[aria-label="消息"]');
    if (messageIcon) {
      log('登录成功，检测到消息图标');
      return true;
    }
    
    // 检查创建图标
    const createIcon = await page.$('svg[aria-label="新建帖子"]');
    if (createIcon) {
      log('登录成功，检测到创建图标');
      return true;
    }
    
    // 检查个人主页图标
    const profileIcon = await page.$('svg[aria-label="个人主页"]');
    if (profileIcon) {
      log('登录成功，检测到个人主页图标');
      return true;
    }
    
    // 检查用户头像
    const userAvatar = await page.$('img[alt*="Profile"]');
    if (userAvatar) {
      log('登录成功，检测到用户头像');
      return true;
    }
    
    // 如果没有找到明确的登录状态标志，检查URL
    const currentUrl = page.url();
    if (currentUrl.includes('/accounts/login/')) {
      log(`URL包含登录页面路径，未登录: ${currentUrl}`);
      return false;
    }
    
    log('无法确定登录状态，默认认为已登录');
    return true;
    
  } catch (error) {
    log(`检测登录状态失败: ${error.message}`);
    return false;
  }
}

/**
 * Instagram 自动发帖
 * @param {Object} input - 输入参数
 * @returns {Promise<Object>} 发帖结果
 */
async function postToInstagram(input) {
  const { 
    text = '', 
    imagePaths: inputImagePaths = [], 
    publish = true, 
    loginTimeoutSeconds = 180 
  } = input;
  
  let imagePaths = [...inputImagePaths];
  
  log(`开始执行Instagram发帖任务`);
  log(`文本内容: ${text}`);
  log(`图片数量: ${imagePaths.length}`);
  log(`发布模式: ${publish ? '发布' : '草稿'}`);
  
  // 创建用户配置目录
  const userConfigDir = path.join(__dirname, '../../user-config');
  const accountsDir = path.join(userConfigDir, 'accounts');
  const cookiePath = path.join(accountsDir, 'instagram.txt');
  
  if (!fs.existsSync(userConfigDir)) {
    fs.mkdirSync(userConfigDir, { recursive: true });
  }
  
  if (!fs.existsSync(accountsDir)) {
    fs.mkdirSync(accountsDir, { recursive: true });
  }
  
  let browser;
  let context;
  let page;
  
  try {
    // 启动浏览器
    browser = await chromium.launch({
      headless: false,
      args: ['--start-maximized']
    });
    
    // 创建上下文
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    
    // 创建页面
    page = await context.newPage();
    
    // 加载Cookie
    await loadCookies(context, cookiePath);
    
    // 访问Instagram主页
    log('打开Instagram主页...');
    await page.goto('https://www.instagram.com/', {
      timeout: loginTimeoutSeconds * 1000
    });
    
    // 检查登录状态
    const isLoggedIn = await checkLoginStatus(page);
    
    if (!isLoggedIn) {
      log('未登录，请手动登录...');
      log('登录完成后，按任意键继续...');
      
      // 等待用户手动登录
      process.stdin.setRawMode(true);
      process.stdin.resume();
      await new Promise(resolve => process.stdin.once('data', resolve));
      
      // 再次检查登录状态
      const isLoggedInAfterManual = await checkLoginStatus(page);
      if (!isLoggedInAfterManual) {
        log('登录失败，请重试');
        await browser.close();
        return {
          code: 401,
          data: {
            postId: `ig_${Date.now()}`,
            status: 'draft'
          }
        };
      }
    }
    
    // 保存Cookie
    await saveCookies(page, cookiePath);
    
    // 检查并关闭通知卡片
    log('检查是否有通知卡片...');
    try {
      // 等待通知卡片出现（如果有的话）
      await page.waitForSelector('div[role="dialog"]', { timeout: 3000 });
      log('检测到通知卡片，正在关闭...');
      
      // 尝试点击关闭按钮（使用精确的CSS选择器）
      try {
        await page.click('button._a9--._ap36._a9_1');
        log('通知卡片已关闭（使用CSS类选择器）');
      } catch (error1) {
        try {
          await page.click('button:has-text("以后再说")');
          log('通知卡片已关闭（中文"以后再说"）');
        } catch (error2) {
          try {
            await page.click('button:has-text("Not Now")');
            log('通知卡片已关闭（英文"Not Now"）');
          } catch (error3) {
            try {
              await page.click('button:has-text("稍后再说")');
              log('通知卡片已关闭（中文"稍后再说"）');
            } catch (error4) {
              try {
                await page.click('button:has-text("暂不")');
                log('通知卡片已关闭（中文"暂不"）');
              } catch (error5) {
                // 如果找不到关闭按钮，尝试点击对话框外部关闭
                await page.click('body');
                log('通过点击外部关闭通知卡片');
              }
            }
          }
        }
      }
    } catch (error) {
      log('未检测到通知卡片，继续执行...');
    }
    
    // 点击创建帖子按钮
    log('点击创建帖子按钮...');
    
    // 方法1：使用用户提供的稳定选择器（通过新帖子图标定位到父链接元素）
    try {
      await page.click('svg[aria-label="新帖子"] >> .. >> a[role="link"]');
      log('方法1成功：使用稳定选择器点击创建帖子按钮');
    } catch (error) {
      log(`方法1失败: ${error.message}`);
      
      // 方法2：使用evaluate方法模拟用户提供的代码
      try {
        await page.evaluate(() => {
          const btn = document.querySelector('svg[aria-label="新帖子"]')?.closest('a[role="link"]');
          if (btn) btn.click();
        });
        log('方法2成功：使用evaluate方法点击创建帖子按钮');
      } catch (error2) {
        log(`方法2失败: ${error2.message}`);
        
        // 方法3：使用文本选择器（备选）
        try {
          await page.click('span:has-text("创建") >> .. >> a[role="link"]');
          log('方法3成功：使用文本选择器点击创建帖子按钮');
        } catch (error3) {
          log(`方法3失败: ${error3.message}`);
          
          // 方法4：直接点击图标（备选）
          try {
            await page.click('svg[aria-label="新帖子"]');
            log('方法4成功：直接点击新帖子图标');
          } catch (error4) {
            log(`方法4失败: ${error4.message}`);
            
            // 方法5：使用"新建帖子"图标选择器（备选）
            try {
              await page.click('svg[aria-label="新建帖子"]');
              log('方法5成功：使用"新建帖子"图标选择器');
            } catch (error5) {
              log(`方法5失败: ${error5.message}`);
              await browser.close();
              return {
                code: 500,
                data: {
                  postId: `ig_${Date.now()}`,
                  status: 'draft'
                }
              };
            }
          }
        }
      }
    }
    
    // 从用户配置目录读取图片和文本
    const instagramAssetsDir = path.join(__dirname, '../../user-config/assets/instgram');
    let postText = text;
    
    // 读取文本文件（从tiezi目录）- 使用轮询逻辑
    const tieziDir = path.join(instagramAssetsDir, 'tiezi');
    if (fs.existsSync(tieziDir)) {
      // 读取所有文本文件（1.txt, 2.txt, 3.txt...）
      const textFiles = fs.readdirSync(tieziDir).filter(file => {
        return file.endsWith('.txt');
      }).sort((a, b) => {
        const aNum = parseInt(a.split('.')[0]);
        const bNum = parseInt(b.split('.')[0]);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        return a.localeCompare(b);
      });
      
      if (textFiles.length > 0 && !postText) {
        // 加载并更新文本索引
        const textIndexFile = path.join(userConfigDir, 'text-index-ig.json');
        let lastIndex = 0;
        if (fs.existsSync(textIndexFile)) {
          try {
            const content = fs.readFileSync(textIndexFile, 'utf8');
            const data = JSON.parse(content);
            lastIndex = data.lastIndex || 0;
          } catch (error) {
            log(`加载文本索引失败: ${error.message}`);
          }
        }
        
        // 轮询选择文本文件
        const selectedTextFile = path.join(tieziDir, textFiles[lastIndex % textFiles.length]);
        lastIndex++;
        
        // 保存文本索引
        try {
          const data = { lastIndex };
          fs.writeFileSync(textIndexFile, JSON.stringify(data, null, 2), 'utf8');
        } catch (error) {
          log(`保存文本索引失败: ${error.message}`);
        }
        
        // 读取选中的文本文件内容
        try {
          postText = fs.readFileSync(selectedTextFile, 'utf8').trim();
          log(`成功读取文本文件: ${selectedTextFile}`);
        } catch (error) {
          log(`读取文本文件失败: ${error.message}`);
        }
      }
    }
    
    // 读取图片文件（从images目录）- 使用轮询逻辑
    const imagesDir = path.join(instagramAssetsDir, 'images');
    if (fs.existsSync(imagesDir)) {
      const imageFiles = fs.readdirSync(imagesDir).filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      }).sort((a, b) => {
        const aName = path.basename(a, path.extname(a));
        const bName = path.basename(b, path.extname(b));
        const aNum = parseInt(aName);
        const bNum = parseInt(bName);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        return a.localeCompare(b);
      });
      
      // 如果没有提供图片路径但有本地图片，使用轮询选择图片（一次只上传1张）
      if (imagePaths.length === 0 && imageFiles.length > 0) {
        // 加载并更新图片索引
        const imageIndexFile = path.join(userConfigDir, 'image-index-ig.json');
        let lastIndex = 0;
        if (fs.existsSync(imageIndexFile)) {
          try {
            const content = fs.readFileSync(imageIndexFile, 'utf8');
            const data = JSON.parse(content);
            lastIndex = data.lastIndex || 0;
          } catch (error) {
            log(`加载图片索引失败: ${error.message}`);
          }
        }
        
        // 轮询选择图片
        const selectedImagePath = path.join(imagesDir, imageFiles[lastIndex % imageFiles.length]);
        imagePaths = [selectedImagePath];
        lastIndex++;
        
        // 保存图片索引
        try {
          const data = { lastIndex };
          fs.writeFileSync(imageIndexFile, JSON.stringify(data, null, 2), 'utf8');
        } catch (error) {
          log(`保存图片索引失败: ${error.message}`);
        }
        
        log(`使用本地图片: ${selectedImagePath}`);
      }
    }
    
    // 上传图片
    if (imagePaths.length > 0) {
      // 点击"从电脑中选择"按钮
      log('点击"从电脑中选择"按钮...');
      
      // 方法1：使用包含文本的选择器
      try {
        await page.click('button:has-text("从电脑中选择")');
        log('方法1成功：点击"从电脑中选择"按钮');
      } catch (error) {
        log(`方法1失败: ${error.message}`);
        
        // 方法2：使用CSS类选择器
        try {
          await page.click('button._aswp._aswr._aswu._asw_._asx2');
          log('方法2成功：使用CSS类选择器点击"从电脑中选择"按钮');
        } catch (error2) {
          log(`方法2失败: ${error2.message}`);
          
          // 方法3：使用evaluate方法
          try {
            await page.evaluate(() => {
              const buttons = document.querySelectorAll('button');
              for (const button of buttons) {
                if (button.textContent.includes('从电脑中选择')) {
                  button.click();
                  return true;
                }
              }
              return false;
            });
            log('方法3成功：使用evaluate方法点击"从电脑中选择"按钮');
          } catch (error3) {
            log(`方法3失败: ${error3.message}`);
            log('跳过按钮点击，继续执行');
          }
        }
      }
      
      await page.waitForTimeout(1000);
      
      log('开始上传图片...');
      
      // 显示隐藏的文件输入元素
      await page.evaluate(() => {
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) {
          fileInput.style.display = 'block';
          fileInput.style.visibility = 'visible';
          fileInput.style.opacity = '1';
        }
      });
      
      const fileInput = await page.$('input[type="file"]');
      
      for (const imagePath of imagePaths) {
        const absolutePath = path.isAbsolute(imagePath) ? imagePath : path.join(__dirname, '../../', imagePath);
        
        if (fs.existsSync(absolutePath)) {
          log(`上传图片: ${absolutePath}`);
          await fileInput.setInputFiles(absolutePath);
          
          // 等待图片上传完成
          await page.waitForTimeout(5000);
          log('图片上传成功');
        } else {
          log(`图片文件不存在: ${absolutePath}`);
          log('跳过图片上传，继续执行后续步骤');
        }
      }
    }
    
    // 点击继续按钮（如果有）
    if (imagePaths.length > 0) {
      // 等待页面加载完成
      await page.waitForTimeout(3000);
      
      log('点击继续按钮（上传完成后）...');
      
      // 尝试多种方式点击继续按钮
      let clicked = false;
      
      // 方法1：使用用户提供的CSS选择器
      try {
        await page.click('div.x1i10hfl.xjqpnuy.xc5r6h4.xqeqjp1.x1phubyo.xdl72j9.x2lah0s.x3ct3a4.xdj266r.x14z9mp.xat24cr.x1lziwak.x2lwn1j.xeuugli.x1hl2dhg.xggy1nq.x1ja2u2z.x1t137rt.x1q0g3np.x1a2a7pz.x6s0dn4.xjyslct.x1ejq31n.x18oe1m7.x1sy0etr.xstzfhl.x9f619.x1ypdohk.x1f6kntn.xl56j7k.x17ydfre.x2b8uid.xlyipyv.x87ps6o.x14atkfc.x5c86q.x18br7mf.x1i0vuye.xl0gqc1.xr5sc7.xlal1re.x14jxsvd.xt0b8zv.xjbqb8w.xr9e8f9.x1e4oeot.x1ui04y5.x6en5u8.x972fbf.x10w94by.x1qhh985.x14e42zd.xt0psk2.xt7dq6l.xexx8yu.xyri2b.x18d9i69.x1c1uobl.x1n2onr6.x1n5bzlp[role="button"]');
        log('方法1成功：使用用户提供的CSS选择器点击继续按钮');
        clicked = true;
      } catch (error) {
        log(`方法1失败: ${error.message}`);
      }
      
      // 方法2：使用文本选择器
      if (!clicked) {
        try {
          await page.click('button:has-text("继续")');
          log('方法2成功：使用文本选择器点击继续按钮');
          clicked = true;
        } catch (error) {
          log(`方法2失败: ${error.message}`);
        }
      }
      
      // 方法3：使用CSS类选择器
      if (!clicked) {
        try {
          await page.click('button._acan._acao._acas');
          log('方法3成功：使用CSS类选择器点击继续按钮');
          clicked = true;
        } catch (error) {
          log(`方法3失败: ${error.message}`);
        }
      }
      
      // 方法4：使用evaluate方法
      if (!clicked) {
        try {
          await page.evaluate(() => {
            const buttons = document.querySelectorAll('button, div[role="button"]');
            for (const button of buttons) {
              if (button.textContent.includes('继续') || button.textContent.includes('下一步')) {
                button.click();
                return true;
              }
            }
            return false;
          });
          log('方法4成功：使用evaluate方法点击继续按钮');
          clicked = true;
        } catch (error) {
          log(`方法4失败: ${error.message}`);
        }
      }
      
      if (clicked) {
        // 等待页面加载完成
        await page.waitForTimeout(3000);
        
        log('点击继续按钮（滤镜页面）...');
        
        // 尝试多种方式点击继续按钮
        clicked = false;
        
        // 方法1：使用用户提供的CSS选择器
        try {
          await page.click('div.x1i10hfl.xjqpnuy.xc5r6h4.xqeqjp1.x1phubyo.xdl72j9.x2lah0s.x3ct3a4.xdj266r.x14z9mp.xat24cr.x1lziwak.x2lwn1j.xeuugli.x1hl2dhg.xggy1nq.x1ja2u2z.x1t137rt.x1q0g3np.x1a2a7pz.x6s0dn4.xjyslct.x1ejq31n.x18oe1m7.x1sy0etr.xstzfhl.x9f619.x1ypdohk.x1f6kntn.xl56j7k.x17ydfre.x2b8uid.xlyipyv.x87ps6o.x14atkfc.x5c86q.x18br7mf.x1i0vuye.xl0gqc1.xr5sc7.xlal1re.x14jxsvd.xt0b8zv.xjbqb8w.xr9e8f9.x1e4oeot.x1ui04y5.x6en5u8.x972fbf.x10w94by.x1qhh985.x14e42zd.xt0psk2.xt7dq6l.xexx8yu.xyri2b.x18d9i69.x1c1uobl.x1n2onr6.x1n5bzlp[role="button"]');
          log('方法1成功：使用用户提供的CSS选择器点击继续按钮');
          clicked = true;
        } catch (error) {
          log(`方法1失败: ${error.message}`);
        }
        
        // 方法2：使用文本选择器
        if (!clicked) {
          try {
            await page.click('button:has-text("继续")');
            log('方法2成功：使用文本选择器点击继续按钮');
            clicked = true;
          } catch (error) {
            log(`方法2失败: ${error.message}`);
          }
        }
        
        // 方法3：使用CSS类选择器
        if (!clicked) {
          try {
            await page.click('button._acan._acao._acas');
            log('方法3成功：使用CSS类选择器点击继续按钮');
            clicked = true;
          } catch (error) {
            log(`方法3失败: ${error.message}`);
          }
        }
        
        // 方法4：使用evaluate方法
        if (!clicked) {
          try {
            await page.evaluate(() => {
              const buttons = document.querySelectorAll('button, div[role="button"]');
              for (const button of buttons) {
                if (button.textContent.includes('继续') || button.textContent.includes('下一步')) {
                  button.click();
                  return true;
                }
              }
              return false;
            });
            log('方法4成功：使用evaluate方法点击继续按钮');
            clicked = true;
          } catch (error) {
            log(`方法4失败: ${error.message}`);
          }
        }
        
        if (clicked) {
          // 等待页面加载
          await page.waitForTimeout(3000);
        }
      }
    }
    
    // 添加文本内容
    if (postText) {
      log('添加文本内容...');
      
      // 使用用户提供的CSS选择器找到文本输入框
      try {
        const textInput = await page.waitForSelector('div[aria-label="输入说明文字..."][contenteditable="true"]', { timeout: 10000 });
        await textInput.click();
        await textInput.type(postText);
        log('成功输入文本内容');
      } catch (error) {
        log(`输入文本内容失败: ${error.message}`);
        // 尝试使用其他选择器
        try {
          const textArea = await page.waitForSelector('textarea, [contenteditable="true"]', { timeout: 10000 });
          await textArea.click();
          await textArea.type(postText);
          log('使用备用选择器成功输入文本内容');
        } catch (error2) {
          log(`使用备用选择器输入文本内容失败: ${error2.message}`);
        }
      }
      
      await page.waitForTimeout(1000);
    }
    
    // 发布帖子
    if (publish) {
      log('点击分享按钮...');
      
      // 尝试多种方式点击分享按钮
      let clicked = false;
      
      // 方法1：使用用户提供的完整CSS选择器
      try {
        await page.click('div.x1i10hfl.xjqpnuy.xc5r6h4.xqeqjp1.x1phubyo.xdl72j9.x2lah0s.x3ct3a4.xdj266r.x14z9mp.xat24cr.x1lziwak.x2lwn1j.xeuugli.x1hl2dhg.xggy1nq.x1ja2u2z.x1t137rt.x1q0g3np.x1a2a7pz.x6s0dn4.xjyslct.x1ejq31n.x18oe1m7.x1sy0etr.xstzfhl.x9f619.x1ypdohk.x1f6kntn.xl56j7k.x17ydfre.x2b8uid.xlyipyv.x87ps6o.x14atkfc.x5c86q.x18br7mf.x1i0vuye.xl0gqc1.xr5sc7.xlal1re.x14jxsvd.xt0b8zv.xjbqb8w.xr9e8f9.x1e4oeot.x1ui04y5.x6en5u8.x972fbf.x10w94by.x1qhh985.x14e42zd.xt0psk2.xt7dq6l.xexx8yu.xyri2b.x18d9i69.x1c1uobl.x1n2onr6.x1n5bzlp[role="button"]');
        log('方法1成功：使用用户提供的完整CSS选择器点击分享按钮');
        clicked = true;
      } catch (error) {
        log(`方法1失败: ${error.message}`);
      }
      
      // 方法2：使用文本选择器
      if (!clicked) {
        try {
          await page.click('button:has-text("分享")');
          log('方法2成功：使用文本选择器点击分享按钮');
          clicked = true;
        } catch (error) {
          log(`方法2失败: ${error.message}`);
        }
      }
      
      // 方法3：使用CSS类选择器
      if (!clicked) {
        try {
          await page.click('button._acan._acao._acas');
          log('方法3成功：使用CSS类选择器点击分享按钮');
          clicked = true;
        } catch (error) {
          log(`方法3失败: ${error.message}`);
        }
      }
      
      // 方法4：使用evaluate方法
      if (!clicked) {
        try {
          await page.evaluate(() => {
            const buttons = document.querySelectorAll('button, div[role="button"]');
            for (const button of buttons) {
              if (button.textContent.includes('分享')) {
                button.click();
                return true;
              }
            }
            return false;
          });
          log('方法4成功：使用evaluate方法点击分享按钮');
          clicked = true;
        } catch (error) {
          log(`方法4失败: ${error.message}`);
        }
      }
      
      if (clicked) {
        // 等待分享完成（15秒）
        log('等待分享完成...');
        await page.waitForTimeout(15000);
        log('分享完成');
      }
    } else {
      log('草稿模式，未发布帖子');
    }
    
    // 关闭网页
    log('关闭网页...');
    if (browser) {
      await browser.close();
      log('网页已关闭');
    }
    
    return {
      code: 0,
      data: {
        postId: `ig_${Date.now()}`,
        status: publish ? 'success' : 'draft'
      }
    };
    
  } catch (error) {
    log(`发帖失败: ${error.message}`);
    // 关闭浏览器
    if (browser) {
      await browser.close();
    }
    return {
      code: 500,
      data: {
        postId: `ig_${Date.now()}`,
        status: 'draft'
      }
    };
  }
}

// 导出函数
module.exports = {
  postToInstagram
};
