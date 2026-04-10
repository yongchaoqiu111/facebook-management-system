const puppeteer = require('puppeteer');

async function testSearchBeauty() {
    try {
        console.log('正在启动浏览器...');
        
        const browser = await puppeteer.launch({
            headless: true,
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
        
        // 等待页面加载完成
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 搜索包含live的链接
        const liveLinks = await page.evaluate(() => {
            const links = document.querySelectorAll('a');
            const liveLinks = [];
            
            links.forEach(link => {
                const href = link.getAttribute('href');
                if (href && (href.includes('/live/') || href.includes('live.douyin.com'))) {
                    liveLinks.push({
                        href: href,
                        text: link.textContent.trim()
                    });
                }
            });
            
            return liveLinks;
        });
        
        console.log('找到的包含live的链接:', liveLinks);
        
        // 搜索所有链接
        const allLinks = await page.evaluate(() => {
            const links = document.querySelectorAll('a');
            return Array.from(links).map(link => ({
                href: link.getAttribute('href'),
                text: link.textContent.trim()
            }));
        });
        
        console.log('所有链接数量:', allLinks.length);
        console.log('前10个链接:', allLinks.slice(0, 10));
        
        // 关闭浏览器
        await browser.close();
        
    } catch (error) {
        console.error('测试失败:', error);
    }
}

testSearchBeauty();