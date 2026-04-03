const puppeteer = require('puppeteer');
const chromeFinder = require('chrome-finder');

async function testInstagramData() {
    console.log('开始测试Instagram数据获取...');
    
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
        
        // 测试用户URL
        const userUrls = [
            'https://www.instagram.com/anthonymerchak/',
            'https://www.instagram.com/florian_and_cars/',
            'https://www.instagram.com/abeersabryofficial/'
        ];
        
        for (const userUrl of userUrls) {
            console.log(`\n=== 测试用户: ${userUrl} ===`);
            
            // 访问用户页面
            await page.goto(userUrl, { 
                waitUntil: 'networkidle2',
                timeout: 60000
            });
            console.log('页面加载完成');
            
            // 等待页面完全加载
            await delay(3000);
            
            // 检查并关闭登录弹窗
            console.log('检查登录弹窗');
            await page.evaluate(() => {
                const closeButtons = document.querySelectorAll(
                    'button[aria-label="Close"], ' +
                    'button[aria-label="关闭"], ' +
                    'button[aria-label="Close this modal"], ' +
                    'button[data-testid="close-button"], ' +
                    'button[data-testid="modal-close"]'
                );
                
                for (const button of closeButtons) {
                    try {
                        button.click();
                        console.log('成功关闭弹窗');
                        break;
                    } catch (e) {
                        console.log('按钮点击失败:', e.message);
                    }
                }
            });
            await delay(2000);
            
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
                
                // 查找用户统计数据
                const sections = document.querySelectorAll('section');
                console.log('找到的section数量:', sections.length);
                
                // 方法1: 在每个section中查找统计数据
                for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
                    const section = sections[sectionIndex];
                    const spans = section.querySelectorAll('span');
                    const spanTexts = Array.from(spans).map(el => el.textContent?.trim()).filter(text => text);
                    
                    console.log(`Section ${sectionIndex} 中的文本:`, spanTexts);
                    
                    // 在这个section中查找数字
                    const numberTexts = spanTexts.filter(text => /\d/.test(text));
                    console.log(`Section ${sectionIndex} 中的数字:`, numberTexts);
                    
                    // 查找标签位置
                    let postsTagIndex = -1;
                    let followersTagIndex = -1;
                    let followingTagIndex = -1;
                    
                    for (let i = 0; i < spanTexts.length; i++) {
                        const text = spanTexts[i];
                        if (text.includes('帖子') || text.toLowerCase().includes('posts')) {
                            postsTagIndex = i;
                        } else if (text.includes('粉丝') || text.toLowerCase().includes('followers')) {
                            followersTagIndex = i;
                        } else if (text.includes('关注') || text.toLowerCase().includes('following')) {
                            followingTagIndex = i;
                        }
                    }
                    
                    console.log(`Section ${sectionIndex} 标签位置 - 帖子:`, postsTagIndex, '粉丝:', followersTagIndex, '关注:', followingTagIndex);
                    
                    // 根据标签位置提取数字
                    if (postsTagIndex > 0 && /\d/.test(spanTexts[postsTagIndex - 1])) {
                        posts = textToNumber(spanTexts[postsTagIndex - 1]);
                    }
                    if (followersTagIndex > 0 && /\d/.test(spanTexts[followersTagIndex - 1])) {
                        followers = textToNumber(spanTexts[followersTagIndex - 1]);
                    }
                    if (followingTagIndex > 0 && /\d/.test(spanTexts[followingTagIndex - 1])) {
                        following = textToNumber(spanTexts[followingTagIndex - 1]);
                    }
                }
                
                // 如果找到了数据，直接返回
                if (posts && followers && following) {
                    console.log('最终提取结果: 帖子', posts, ', 粉丝', followers, ', 关注', following);
                    return { posts, followers, following };
                }
                
                // 如果没有找到，使用全局的数字数组
                const allSpans = document.querySelectorAll('span');
                const allTexts = Array.from(allSpans).map(el => el.textContent?.trim()).filter(text => text);
                const globalNumbers = allTexts.filter(text => /\d/.test(text));
                
                console.log('全局数字数组:', globalNumbers);
                
                // 使用前三个数字（按照Instagram的标准顺序：帖子、粉丝、关注）
                if (globalNumbers.length >= 1) {
                    posts = textToNumber(globalNumbers[0]);
                }
                if (globalNumbers.length >= 2) {
                    followers = textToNumber(globalNumbers[1]);
                }
                if (globalNumbers.length >= 3) {
                    following = textToNumber(globalNumbers[2]);
                }
                
                console.log('最终提取结果: 帖子', posts, ', 粉丝', followers, ', 关注', following);
                return { posts, followers, following };
            });
            
            console.log(`✅ 用户信息获取成功：帖子 ${userInfo.posts}, 粉丝 ${userInfo.followers}, 关注 ${userInfo.following}`);
            
            // 等待用户查看数据
            console.log('等待用户查看数据...');
            await delay(5000);
        }
        
        // 关闭浏览器
        await browser.close();
        console.log('\n测试完成！');
        
    } catch (error) {
        console.error('测试失败:', error);
    }
}

// 运行测试
testInstagramData();
