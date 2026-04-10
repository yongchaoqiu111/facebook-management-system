const puppeteer = require('puppeteer');

async function testWithManualVerify() {
    try {
        console.log('正在启动浏览器...');
        
        const browser = await puppeteer.launch({
            headless: false, // 使用有头模式，方便用户手动验证
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
        const keyword = '美容';
        const searchUrl = `https://www.douyin.com/search/${encodeURIComponent(keyword)}?type=live`;
        console.log(`正在访问搜索页面: ${searchUrl}`);
        
        await page.goto(searchUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // 等待用户手动解除验证
        console.log('等待用户手动解除验证...');
        console.log('请在浏览器窗口中完成验证（约30秒时间）');
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        // 验证完成后，等待页面加载
        console.log('验证时间已到，等待页面加载直播内容...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 提取直播间链接
        console.log('正在提取直播间链接...');
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
        
        // 如果没找到，尝试滚动页面后再次提取
        if (rooms.length === 0) {
            console.log('未找到直播间链接，尝试滚动页面...');
            await page.evaluate(() => {
                window.scrollBy(0, 500);
            });
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const moreRooms = await page.evaluate(() => {
                const roomElements = document.querySelectorAll('a[href*="/live/"]');
                const results = [];
                
                roomElements.forEach(link => {
                    const href = link.getAttribute('href');
                    if (href && href.includes('/live/')) {
                        const roomIdMatch = href.match(/\/live\/(\d+)/);
                        if (roomIdMatch && roomIdMatch[1]) {
                            const roomId = roomIdMatch[1];
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
            
            console.log(`滚动后提取到 ${moreRooms.length} 个直播间`);
            console.log('滚动后提取结果:', moreRooms);
        }
        
        // 关闭浏览器
        await browser.close();
        console.log('浏览器已关闭');
        
    } catch (error) {
        console.error('测试失败:', error);
    }
}

testWithManualVerify();