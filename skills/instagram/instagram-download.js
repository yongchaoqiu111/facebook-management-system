const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const MODULE = 'InstagramDownloadSkill';

/**
 * 日志记录函数
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
 * 下载媒体文件
 * @param {string} url - 媒体文件URL
 * @param {string} savePath - 保存路径
 * @returns {Promise<boolean>} 是否下载成功
 */
async function downloadMedia(url, savePath) {
  try {
    // 确保保存目录存在
    const dir = path.dirname(savePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const response = await axios({
      url: url,
      method: 'GET',
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const writer = fs.createWriteStream(savePath);
    
    return new Promise((resolve, reject) => {
      response.data.pipe(writer);
      let error = null;
      
      writer.on('error', err => {
        error = err;
        writer.close();
        reject(err);
      });
      
      writer.on('close', () => {
        if (!error) {
          resolve(true);
        }
      });
    });
    
  } catch (error) {
    log(`下载媒体文件失败: ${error.message}`);
    return false;
  }
}

/**
 * 扫描Instagram用户页面并下载媒体
 * @param {Object} input - 输入参数
 * @returns {Promise<Object>} 下载结果
 */
async function downloadInstagramMedia(input) {
  const { 
    username = '', 
    loginTimeoutSeconds = 180,
    downloadLimit = 100
  } = input;
  
  if (!username) {
    return {
      code: 400,
      data: {
        message: '用户名不能为空'
      }
    };
  }
  
  log(`开始执行Instagram媒体下载任务`);
  log(`用户名: ${username}`);
  log(`下载限制: ${downloadLimit}`);
  
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
    
    // 设置网络监听，捕获媒体请求
    const mediaRequests = [];
    const processedUrls = new Set();
    
    // 监听所有网络请求
    page.on('request', request => {
      const url = request.url();
      // 捕获图片和视频请求
      if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || 
          url.includes('.gif') || url.includes('.mp4') || url.includes('.webm')) {
        
        // 处理视频分片（移除bytestart和byteend参数）
        let normalizedUrl = url;
        if (url.includes('.mp4') || url.includes('.webm')) {
          // 移除分片参数
          normalizedUrl = url.replace(/&bytestart=\d+&byteend=\d+/, '');
          normalizedUrl = normalizedUrl.replace(/\?bytestart=\d+&byteend=\d+/, '');
        }
        
        if (!processedUrls.has(normalizedUrl)) {
          processedUrls.add(normalizedUrl);
          mediaRequests.push({
            url: normalizedUrl,
            type: url.includes('.mp4') || url.includes('.webm') ? 'video' : 'image'
          });
        }
      }
    });
    
    // 加载Cookie
    await loadCookies(context, cookiePath);
    
    // 访问Instagram用户页面
    const userUrl = `https://www.instagram.com/${username}/`;
    log(`打开Instagram用户页面: ${userUrl}`);
    await page.goto(userUrl, {
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
            message: '登录失败'
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
    
    // 等待页面完全加载
    await page.waitForTimeout(3000);
    
    // 创建下载目录（使用指定路径）
    const downloadDir = path.join(userConfigDir, 'assets', 'instgram', 'download');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }
    
    // 收集所有媒体链接
    const mediaUrls = new Set();
    let processedPosts = 0;
    
    log('开始扫描媒体内容...');
    
    // 滚动页面加载更多内容
    const scrollInterval = setInterval(async () => {
      try {
        // 滚动页面
        await page.evaluate(() => {
          window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
          });
        });
        
        // 等待页面加载
        await page.waitForTimeout(2000);
        
        // 处理捕获到的媒体请求
        mediaRequests.forEach(request => {
          if (!mediaUrls.has(request.url)) {
            mediaUrls.add(request.url);
            processedPosts++;
            log(`发现媒体 ${processedPosts}: ${request.type} - ${request.url}`);
          }
        });
        
        // 检查是否达到下载限制
        if (processedPosts >= downloadLimit) {
          clearInterval(scrollInterval);
          log(`已达到下载限制 ${downloadLimit}，停止扫描`);
        }
        
      } catch (error) {
        log(`滚动页面时发生错误: ${error.message}`);
        clearInterval(scrollInterval);
      }
    }, 3000);
    
    // 等待扫描完成（最多扫描30秒）
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // 停止滚动
    clearInterval(scrollInterval);
    
    log(`扫描完成，共发现 ${mediaUrls.size} 个媒体文件`);
    
    // 开始下载媒体文件
    let downloadedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    
    for (const url of mediaUrls) {
      try {
        // 检查URL是否可以访问
        log(`正在检查: ${url}`);
        const headResponse = await axios.head(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          timeout: 5000
        });
        
        // 检查响应状态码
        if (headResponse.status !== 200) {
          skippedCount++;
          log(`跳过无法访问的文件 (状态码: ${headResponse.status}): ${url}`);
          continue;
        }
        
        // 检查文件大小（跳过小于10KB的文件）
        const contentLength = headResponse.headers['content-length'];
        if (contentLength) {
          const fileSizeKB = parseInt(contentLength) / 1024;
          if (fileSizeKB < 10) {
            skippedCount++;
            log(`跳过太小的文件 (${fileSizeKB.toFixed(2)}KB): ${url}`);
            continue;
          }
        }
        
        // 确定文件类型
        let extension = '.jpg';
        if (url.includes('.mp4')) {
          extension = '.mp4';
        } else if (url.includes('.png')) {
          extension = '.png';
        } else if (url.includes('.gif')) {
          extension = '.gif';
        }
        
        // 创建文件名
        const filename = `${Date.now()}_${downloadedCount + 1}${extension}`;
        const savePath = path.join(downloadDir, filename);
        
        // 下载文件
        log(`正在下载: ${url}`);
        const success = await downloadMedia(url, savePath);
        
        if (success) {
          downloadedCount++;
          log(`下载成功: ${savePath}`);
        } else {
          failedCount++;
          log(`下载失败: ${url}`);
        }
        
      } catch (error) {
        skippedCount++;
        log(`跳过无法访问的文件: ${url}, 错误: ${error.message}`);
      }
    }
    
    log(`下载完成，成功: ${downloadedCount}, 失败: ${failedCount}, 跳过: ${skippedCount}`);
    
    // 关闭浏览器
    await browser.close();
    
    return {
          code: 0,
          data: {
            username,
            totalFound: mediaUrls.size,
            downloaded: downloadedCount,
            failed: failedCount,
            skipped: skippedCount,
            downloadDir
          }
        };
    
  } catch (error) {
    log(`下载任务失败: ${error.message}`);
    // 关闭浏览器
    if (browser) {
      await browser.close();
    }
    return {
      code: 500,
      data: {
        message: error.message
      }
    };
  }
}

// 导出函数
module.exports = {
  downloadInstagramMedia
};