const puppeteer = require('puppeteer');

async function testUserInfoScrape() {
    console.log('🚀 测试用户信息抓取功能...');
    
    try {
        // 启动浏览器
        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: ['--start-maximized']
        });
        
        const page = await browser.newPage();
        
        // 访问Instagram首页
        await page.goto('https://www.instagram.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });
        
        console.log('🌐 已打开Instagram首页');
        console.log('请手动登录Instagram账号...');
        
        // 等待用户手动登录（30秒）
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        // 测试抓取一个用户的信息
        const testUserUrl = 'https://www.instagram.com/instagram/';
        console.log(`\n🔍 测试抓取用户信息: ${testUserUrl}`);
        
        // 访问用户主页
        await page.goto(testUserUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 提取用户信息
        const userInfo = await page.evaluate(() => {
            const statsElements = document.querySelectorAll('a[href$="/followers/"], a[href$="/following/"]');
            
            let followers = null;
            let following = null;
            
            for (const element of statsElements) {
                const text = element.innerText;
                if (text.includes('followers') || text.includes('フォロワー')) {
                    const numberMatch = text.match(/[\d.,]+/);
                    if (numberMatch) {
                        let numStr = numberMatch[0].replace(/[,.]/g, '');
                        followers = parseInt(numStr);
                    }
                } else if (text.includes('following') || text.includes('フォロー')) {
                    const numberMatch = text.match(/[\d.,]+/);
                    if (numberMatch) {
                        let numStr = numberMatch[0].replace(/[,.]/g, '');
                        following = parseInt(numStr);
                    }
                }
            }
            
            return { followers, following };
        });
        
        console.log(`✅ 用户信息获取成功:`);
        console.log(`   - 粉丝数: ${userInfo.followers}`);
        console.log(`   - 关注数: ${userInfo.following}`);
        
        // 关闭浏览器
        await browser.close();
        console.log('\n🌐 浏览器已关闭');
        console.log('🎉 测试完成！');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        process.exit(1);
    }
}

// 执行测试
testUserInfoScrape();
