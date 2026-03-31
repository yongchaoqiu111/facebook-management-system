const puppeteer = require('puppeteer');

async function testPage() {
    console.log('🌐 启动浏览器...');
    
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized', '--disable-extensions']
    });
    
    const page = await browser.newPage();
    await page.bringToFront();
    
    console.log('🔗 正在访问用户页面...');
    await page.goto('https://www.instagram.com/anthonymerchak/', {
        waitUntil: 'networkidle2',
        timeout: 60000
    });
    
    console.log('✅ 页面加载完成');
    console.log('📝 等待用户复制页面代码...');
    console.log('⏳ 保持浏览器窗口打开，按Ctrl+C退出');
    
    // 保持浏览器打开，等待用户操作
    await new Promise(() => {});
}

testPage().catch(console.error);
