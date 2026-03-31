const puppeteer = require('puppeteer');

async function testOneUser() {
    console.log('🔧 打开一个用户页面测试数据提取...');
    
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null
    });
    
    try {
        const page = await browser.newPage();
        
        // 访问一个用户页面
        const testUrl = 'https://www.instagram.com/florian_and_cars/';
        console.log(`🌐 访问：${testUrl}`);
        
        await page.goto(testUrl, { timeout: 60000, waitUntil: 'networkidle2' });
        
        // 等待页面加载
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('\n=== 提取数据 ===');
        
        // 提取所有数字和对应的链接
        const result = await page.evaluate(() => {
            const statsElements = document.querySelectorAll('a[href*="/followers/"], a[href*="/following/"]');
            const results = [];
            
            for (const element of statsElements) {
                const href = element.getAttribute('href');
                const text = element.innerText;
                results.push({ href, text });
            }
            
            return results;
        });
        
        console.log('找到的元素:');
        result.forEach((item, index) => {
            console.log(`${index + 1}. href: ${item.href}`);
            console.log(`   文本：${item.text}`);
        });
        
        console.log('\n⏳ 页面保持打开 10 秒，请手动查看...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
    } finally {
        await browser.close();
        console.log('🔒 浏览器已关闭');
    }
}

testOneUser();
