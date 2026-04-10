const puppeteer = require('puppeteer');

async function testPuppeteer() {
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
        const searchUrl = `https://www.douyin.com/search/多多姐?type=live`;
        console.log(`正在访问搜索页面: ${searchUrl}`);
        
        await page.goto(searchUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // 等待页面加载完成
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 从页面中提取直播间信息
        const rooms = await page.evaluate(() => {
            const roomElements = document.querySelectorAll('a[href*="/live/"]');
            const results = [];
            
            roomElements.forEach(link => {
                const href = link.getAttribute('href');
                if (href && href.includes('/live/')) {
                    // 提取直播间ID
                    const roomIdMatch = href.match(/\/live\/(\d+)/);
                    if (roomIdMatch && roomIdMatch[1]) {
                        const roomId = roomIdMatch[1];
                        // 获取直播间标题
                        const titleElement = link.querySelector('div[class*="title"], div[class*="Title"], h3, span');
                        const title = titleElement ? titleElement.textContent.trim() : '未知标题';
                        
                        results.push({
                            id: roomId,
                            url: `https://live.douyin.com/${roomId}`,
                            title: title
                        });
                    }
                }
            });
            
            return results;
        });
        
        console.log(`从页面提取到 ${rooms.length} 个直播间`);
        console.log('提取结果:', rooms);
        
        // 关闭浏览器
        await browser.close();
        
    } catch (error) {
        console.error('测试失败:', error);
    }
}

testPuppeteer();