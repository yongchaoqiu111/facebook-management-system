const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const MODULE = 'InstagramSkills';

/**
 * Instagram 登录输入参数。
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
    fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2), 'utf-8');
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
      const cookies = JSON.parse(fs.readFileSync(cookiePath, 'utf-8'));
      await context.addCookies(cookies);
      log(`Cookie已从: ${cookiePath} 加载`);
      return true;
    } else {
      log(`Cookie文件不存在: ${cookiePath}`);
      return false;
    }
  } catch (error) {
    log(`加载Cookie失败: ${error.message}`);
    return false;
  }
}

/**
 * Instagram 登录。
 * @param {Object} input - 输入参数。
 * @returns {Promise<Object>} 登录结果。
 */
async function loginToInstagram(input) {
  const { username, password, timeoutSeconds = 180 } = input;
  
  log(`开始登录Instagram，用户名: ${username}, 超时时间: ${timeoutSeconds}秒`);
  
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
    
    // 尝试加载Cookie
    const cookieLoaded = await loadCookies(context, cookiePath);
    
    // 访问Instagram登录页
    await page.goto('https://www.instagram.com/accounts/login/', {
      timeout: timeoutSeconds * 1000
    });
    
    // 如果Cookie加载成功，检查是否已登录
    if (cookieLoaded) {
      try {
        await page.waitForSelector('div[role="navigation"]', { timeout: 5000 });
        log('使用Cookie登录成功');
        
        // 重新保存Cookie以更新登录状态
        await saveCookies(page, cookiePath);
        
        return {
          code: 0,
          data: {
            status: 'success',
            cookiePath: cookiePath
          }
        };
      } catch (error) {
        log('Cookie已过期，需要重新登录');
      }
    }
    
    // 如果没有Cookie或Cookie过期，执行账号密码登录
    if (!username || !password) {
      throw new Error('账号或密码未提供');
    }
    
    // 等待用户名输入框
    await page.waitForSelector('input[name="username"]', { timeout: 10000 });
    
    // 输入用户名和密码
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    
    // 点击登录按钮
    await page.click('button[type="submit"]');
    
    // 等待登录结果（可能需要处理验证码）
    await Promise.race([
      page.waitForSelector('div[role="navigation"]', { timeout: timeoutSeconds * 1000 }),
      page.waitForSelector('input[name="verificationCode"]', { timeout: timeoutSeconds * 1000 })
    ]);
    
    // 检查是否需要验证码
    try {
      await page.waitForSelector('input[name="verificationCode"]', { timeout: 1000 });
      log('需要验证码，请手动输入');
      
      // 等待用户输入验证码
      await page.waitForSelector('div[role="navigation"]', { timeout: (timeoutSeconds - 60) * 1000 });
    } catch (error) {
      // 不需要验证码，登录成功
    }
    
    // 保存Cookie
    await saveCookies(page, cookiePath);
    
    log('Instagram登录成功');
    
    return {
      code: 0,
      data: {
        status: 'success',
        cookiePath: cookiePath
      }
    };
    
  } catch (error) {
    log(`登录失败: ${error.message}`);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * 携带Cookie登录Instagram
 * @param {Object} input - 输入参数
 * @returns {Promise<Object>} 登录结果
 */
async function loginWithCookie(input) {
  const { timeoutSeconds = 120 } = input;
  
  log(`开始使用Cookie登录Instagram，超时时间: ${timeoutSeconds}秒`);
  
  // Cookie文件路径
  const userConfigDir = path.join(__dirname, '../../user-config');
  const accountsDir = path.join(userConfigDir, 'accounts');
  const cookiePath = path.join(accountsDir, 'instagram.txt');
  
  if (!fs.existsSync(cookiePath)) {
    throw new Error('Cookie文件不存在，请先执行登录');
  }
  
  let browser;
  let context;
  
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
    
    // 加载Cookie
    await loadCookies(context, cookiePath);
    
    // 创建页面并访问Instagram
    const page = await context.newPage();
    await page.goto('https://www.instagram.com/', {
      timeout: timeoutSeconds * 1000
    });
    
    // 检查是否登录成功
    await page.waitForSelector('div[role="navigation"]', { timeout: 10000 });
    
    // 重新保存Cookie以更新登录状态
    await saveCookies(page, cookiePath);
    
    log('使用Cookie登录Instagram成功');
    
    return {
      code: 0,
      data: {
        status: 'success',
        cookiePath: cookiePath
      }
    };
    
  } catch (error) {
    log(`使用Cookie登录失败: ${error.message}`);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 导出函数
module.exports = {
  loginToInstagram,
  loginWithCookie
};
