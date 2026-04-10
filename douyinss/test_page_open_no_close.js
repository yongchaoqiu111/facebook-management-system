const puppeteer = require('puppeteer');

async function testPageOpenNoClose() {
    try {
        console.log('正在启动浏览器...');
        
        const browser = await puppeteer.launch({
            headless: false, // 使用有头模式，方便查看页面
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--window-size=1920,1080'
            ]
        });
        
        const page = await browser.newPage();
        
        // 设置User-Agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36');
        
        // 打开抖音搜索页面
        const searchUrl = `https://www.douyin.com/search/美容?type=live`;
        console.log(`正在访问搜索页面: ${searchUrl}`);
        
        await page.goto(searchUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // 获取页面标题
        const title = await page.title();
        console.log('页面标题:', title);
        
        // 获取页面内容长度
        const html = await page.content();
        console.log('页面HTML长度:', html.length);
        
        // 不关闭浏览器，让用户查看页面
        console.log('页面已打开，请查看浏览器窗口...');
        console.log('按Ctrl+C停止程序');
        
        // 保持程序运行
        await new Promise(() => {}); // 永远等待
        
    } catch (error) {
        console.error('测试失败:', error);
    }
}

testPageOpenNoClose();