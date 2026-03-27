const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testFacebookManual() {
  console.log('=== Facebook 手动测试模式 ===');
  console.log('说明：此脚本将保持浏览器打开，即使遇到错误');
  console.log('请按照提示进行操作，浏览器不会自动关闭');
  
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
    browser = await chromium.launch({
      headless: false,
      slowMo: 50,
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
    const page = await context.newPage();
    await page.goto('https://www.facebook.com');
    
    // 等待页面加载
    await page.waitForLoadState('domcontentloaded');
    
    console.log('\n=== 检测登录状态 ===');
    
    // 检查创建帖子按钮
    let hasCreatePostButton = false;
    try {
      console.log('正在检查创建帖子按钮...');
      await page.waitForSelector('[aria-label="创建帖子"]', { timeout: 10000 });
      hasCreatePostButton = true;
      console.log('✓ 创建帖子按钮存在');
    } catch (error) {
      console.log('✗ 创建帖子按钮不存在:', error.message);
    }
    
    // 检查登录按钮
    let hasLoginButton = false;
    try {
      console.log('正在检查登录按钮...');
      await page.waitForSelector('button[data-testid="royal_login_button"]', { timeout: 5000 });
      hasLoginButton = true;
      console.log('✗ 登录按钮存在');
    } catch (error) {
      console.log('✓ 登录按钮不存在');
    }
    
    // 判断登录状态
    const isLoggedIn = hasCreatePostButton && !hasLoginButton;
    console.log(`\n登录状态: ${isLoggedIn ? '已登录' : '未登录'}`);
    
    if (isLoggedIn) {
      console.log('\n=== 打开帖子创建对话框 ===');
      
      try {
        // 点击创建帖子按钮
        console.log('点击创建帖子按钮...');
        await page.click('[aria-label="创建帖子"]');
        
        // 等待帖子对话框
        try {
          await page.waitForSelector('[aria-label="你想分享什么？"]', { timeout: 15000 });
          console.log('✓ 打开帖子创建对话框成功');
        } catch (error) {
          console.log('⚠ 未找到帖子对话框，等待用户确认...');
          console.log('请检查浏览器是否打开了帖子创建对话框');
          console.log('如果打开了