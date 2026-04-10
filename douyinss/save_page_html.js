const puppeteer = require('puppeteer');
const fs = require('fs');

async function savePageHtml() {
    try {
        console.log('正在启动浏览器...');
        
        const browser = await puppeteer.launch({
            headless: false,
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
        
        // 保存页面HTML到文件
        const html = await page.content();
        fs.writeFileSync('douyin_live_search.html', html);
        console.log('页面HTML已保存到 douyin_live_search.html');
        
        // 搜索页面中的所有链接
        const allLinks = await page.evaluate(() => {
            const links = document.querySelectorAll('a');
            return Array.from(links).map(link => ({
                href: link.getAttribute('href'),
                text: link.textContent.trim()
            }));
        });
        
        console.log(`找到 ${allLinks.length} 个链接`);
        
        // 搜索包含live的链接
        const liveLinks = allLinks.filter(link => link.href && (link.href.includes('/live/') || link.href.includes('live.douyin.com')));
        console.log(`找到 ${liveLinks.length} 个包含live的链接:`);
        liveLinks.forEach(link => {
            console.log(`  - ${link.href} - ${link.text}`);
        });
        
        // 不关闭浏览器，让用户查看
        console.log('页面已保存，请查看浏览器窗口和 douyin_live_search.html 文件');
        console.log('按Ctrl+C停止程序');
        
        // 保持程序运行
        await new Promise(() => {});
        
    } catch (error) {
        console.error('测试失败:', error);
    }
}

savePageHtml();