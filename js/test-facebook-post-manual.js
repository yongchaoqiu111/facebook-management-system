const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testFacebookPostManual() {
  console.log('Testing Facebook post manually...');
  
  // 启动浏览器
  const browser = await chromium.launch({
    headless: false,
    slowMo: 50
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // 打开 Facebook
    await page.goto('https://www.facebook.com');
    
    console.log('\n=== 操作指南 ===');
    console.log('1. 请在浏览器中登录 Facebook');
    console.log('2. 登录完成后，按任意键继续');
    console.log('3. 脚本将自动打开帖子创建对话框并上传图片');
    console.log('\nPress any key to continue after login...');
    
    // 等待用户登录
    process.stdin.setRawMode(true);
    process.stdin.resume();
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    
    // 点击创建帖子按钮
    console.log('\nOpening post creation dialog...');
    await page.click('[aria-label="创建帖子"]');
    await page.waitForSelector('[aria-label="你想分享什么？"]');
    console.log('✓ Opened post creation dialog');
    
    // 输入帖子内容
    console.log('Entering post content...');
    await page.fill('[aria-label="你想分享什么？"]', '测试 Facebook 发图文贴功能 - 手动登录');
    console.log('✓ Entered post content');
    
    // 点击添加图片按钮
    console.log('Adding image...');
    await page.click('[aria-label="照片/视频"]');
    
    // 上传图片
    const fileInput = await page.waitForSelector('input[type="file"]');
    const imagePath = path.join(__dirname, 'images', '1.png');
    await fileInput.setInputFiles(imagePath);
    console.log('✓ Uploaded image:', imagePath);
    
    // 等待图片上传完成
    console.log('Waiting for image upload...');
    await page.waitForTimeout(5000);
    
    console.log('\n=== 操作完成 ===');
    console.log('Facebook 发图文贴功能已准备完成');
    console.log('帖子内容：测试 Facebook 发图文贴功能 - 手动登录');
    console.log('图片：', imagePath);
    console.log('\n按任意键关闭浏览器...');
    
  } catch (error) {
    console.log('✗ Facebook post media failed:', error.message);
  }
  
  // 等待用户操作
  process.stdin.setRawMode(true);
  process.stdin.resume();
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });
  
  await browser.close();
  console.log('浏览器已关闭');
}

testFacebookPostManual().catch(console.error);
