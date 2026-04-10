const puppeteer = require('puppeteer');

async function testDynamicSearch() {
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
        
        // 打开抖音主页
        console.log('正在访问抖音主页...');
        await page.goto('https://www.douyin.com', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // 等待页面加载完成
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 查找搜索框并输入关键词
        console.log('正在查找搜索框...');
        try {
            // 尝试多种选择器
            const selectors = [
                'input[placeholder*="搜索"]',
                'input[placeholder*="Search"]',
                '.search-input',
                '#search',
                'input[type="text"]'
            ];
            
            let searchInput = null;
            for (const selector of selectors) {
                searchInput = await page.$(selector);
                if (searchInput) {
                    console.log(`找到搜索框: ${selector}`);
                    break;
                }
            }
            
            if (searchInput) {
                console.log('正在输入关键词: 美容');
                await searchInput.type('美容');
                
                // 查找搜索按钮并点击
                console.log('正在查找搜索按钮...');
                const buttonSelectors = [
                    'button[aria-label*="搜索"]',
                    'button[title*="搜索"]',
                    '.search-btn',
                    'button[type="submit"]',
                    '[class*="search"]'
                ];
                
                let searchButton = null;
                for (const selector of buttonSelectors) {
                    searchButton = await page.$(selector);
                    if (searchButton) {
                        console.log(`找到搜索按钮: ${selector}`);
                        break;
                    }
                }
                
                if (searchButton) {
                    console.log('正在点击搜索按钮...');
                    await searchButton.click();
                } else {
                    console.log('未找到搜索按钮，尝试按Enter键');
                    await page.keyboard.press('Enter');
                }
                
                // 等待搜索结果加载
                console.log('等待搜索结果加载...');
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                // 切换到直播标签
                console.log('正在查找直播标签...');
                const tabSelectors = [
                    '[data-type="live"]',
                    '.live-tab',
                    '[href*="type=live"]',
                    '.tab-item:contains("直播")'
                ];
                
                let liveTab = null;
                for (const selector of tabSelectors) {
                    liveTab = await page.$(selector);
                    if (liveTab) {
                        console.log(`找到直播标签: ${selector}`);
                        break;
                    }
                }
                
                if (liveTab) {
                    console.log('正在点击直播标签...');
                    await liveTab.click();
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
                
                // 查找直播间链接
                console.log('正在查找直播间链接...');
                const roomLinks = await page.evaluate(() => {
                    const links = document.querySelectorAll('a');
                    const roomLinks = [];
                    
                    links.forEach(link => {
                        const href = link.getAttribute('href');
                        if (href && (href.includes('/live/') || href.includes('live.douyin.com'))) {
                            roomLinks.push({
                                href: href,
                                text: link.textContent.trim()
                            });
                        }
                    });
                    
                    return roomLinks;
                });
                
                console.log('找到的直播间链接:', roomLinks);
                
                // 如果没找到，尝试等待更多内容加载
                if (roomLinks.length === 0) {
                    console.log('未找到直播间链接，等待更多内容加载...');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    // 滚动页面
                    await page.evaluate(() => {
                        window.scrollBy(0, 500);
                    });
                    
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // 再次查找
                    const moreRoomLinks = await page.evaluate(() => {
                        const links = document.querySelectorAll('a');
                        const roomLinks = [];
                        
                        links.forEach(link => {
                            const href = link.getAttribute('href');
                            if (href && (href.includes('/live/') || href.includes('live.douyin.com'))) {
                                roomLinks.push({
                                    href: href,
                                    text: link.textContent.trim()
                                });
                            }
                        });
                        
                        return roomLinks;
                    });
                    
                    console.log('滚动后找到的直播间链接:', moreRoomLinks);
                }
                
            } else {
                console.log('未找到搜索框');
            }
            
        } catch (error) {
            console.error('搜索过程出错:', error);
        }
        
        // 关闭浏览器
        await browser.close();
        
    } catch (error) {
        console.error('测试失败:', error);
    }
}

testDynamicSearch();