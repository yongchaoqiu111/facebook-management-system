const puppeteer = require('puppeteer');
const chromeFinder = require('chrome-finder');

async function testSingleUser() {
    console.log('开始测试单个用户数据获取...');
    
    try {
        // 自动查找Chrome浏览器路径
        const chromePath = chromeFinder();
        console.log('Chrome路径:', chromePath);
        
        // 启动浏览器（只打开一次）
        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: [
                '--start-maximized',
                '--window-position=0,0',
                '--window-size=1920,1080',
                '--disable-gpu',
                '--no-sandbox'
            ],
            executablePath: chromePath
        });
        
        // 创建页面
        const page = await browser.newPage();
        
        // 添加页面console监听器
        page.on('console', msg => {
            console.log('页面console:', msg.text());
        });
        
        // 延迟函数
        function delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        
        // 测试单个用户URL（第三个用户）
        const userUrl = 'https://www.instagram.com/passantshams/';
        
        console.log(`\n=== 测试用户: ${userUrl} ===`);
        
        // 访问用户页面
        await page.goto(userUrl, { 
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        console.log('页面加载完成');
        
        // 等待页面完全加载
        await delay(5000);
        
        // 提取用户数据
            const userInfo = await page.evaluate(() => {
                function textToNumber(text) {
                    if (!text) return null;
                    
                    let numStr = text.trim();
                    console.log('转换前:', numStr);
                    
                    let multiplier = 1;
                    
                    // 检查并处理中文单位
                    if (numStr.includes('万')) {
                        multiplier = 10000;
                        numStr = numStr.replace('万', '');
                    } else if (numStr.includes('亿')) {
                        multiplier = 100000000;
                        numStr = numStr.replace('亿', '');
                    }
                    
                    // 移除所有非数字字符，只保留数字和小数点
                    numStr = numStr.replace(/[^\d.]/g, '');
                    
                    console.log('转换后:', numStr, '倍数:', multiplier);
                    
                    if (numStr === '') return null;
                    
                    const num = parseFloat(numStr);
                    if (isNaN(num)) return null;
                    
                    return Math.round(num * multiplier);
                }
                
                let posts = null;
                let followers = null;
                let following = null;
                
                // 方法1: 使用用户提供的CSS选择器
                const htmlSpans = document.querySelectorAll('span.html-span');
                console.log('找到的html-span元素数量:', htmlSpans.length);
                
                const htmlSpanTexts = Array.from(htmlSpans).map(el => el.textContent?.trim()).filter(text => text);
                console.log('html-span文本:', htmlSpanTexts);
                
                // 从html-span中提取前三个数字
                const htmlNumbers = htmlSpanTexts.filter(text => /\d/.test(text));
                console.log('html-span中的数字:', htmlNumbers);
                
                if (htmlNumbers.length >= 1) {
                    posts = textToNumber(htmlNumbers[0]);
                }
                if (htmlNumbers.length >= 2) {
                    followers = textToNumber(htmlNumbers[1]);
                }
                if (htmlNumbers.length >= 3) {
                    following = textToNumber(htmlNumbers[2]);
                }
                
                // 如果找到了数据，直接返回
                if (posts && followers && following) {
                    console.log('最终提取结果: 帖子', posts, ', 粉丝', followers, ', 关注', following);
                    return { posts, followers, following };
                }
                
                // 方法2: 使用其他选择器
                const sections = document.querySelectorAll('section');
                console.log('找到的section数量:', sections.length);
                
                for (let i = 0; i < sections.length; i++) {
                    const spans = sections[i].querySelectorAll('span');
                    const spanTexts = Array.from(spans).map(el => el.textContent?.trim()).filter(text => text);
                    
                    console.log(`Section ${i} 文本:`, spanTexts);
                    
                    const numbers = spanTexts.filter(text => /\d/.test(text));
                    console.log(`Section ${i} 数字:`, numbers);
                    
                    if (numbers.length >= 3) {
                        posts = textToNumber(numbers[0]);
                        followers = textToNumber(numbers[1]);
                        following = textToNumber(numbers[2]);
                        console.log('从Section提取的结果: 帖子', posts, ', 粉丝', followers, ', 关注', following);
                        break;
                    }
                }
                
                console.log('最终提取结果: 帖子', posts, ', 粉丝', followers, ', 关注', following);
                return { posts, followers, following };
            });
        
        console.log(`✅ 用户信息获取成功：帖子 ${userInfo.posts}, 粉丝 ${userInfo.followers}, 关注 ${userInfo.following}`);
        
        // 等待用户查看数据（不再关闭浏览器）
        console.log('\n测试完成！浏览器保持打开状态，您可以查看数据...');
        
    } catch (error) {
        console.error('测试失败:', error);
    }
}

// 运行测试
testSingleUser();
