const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 使用用户目录存储数据
const userDataDir = path.join(process.env.APPDATA || process.env.HOME || '.', 'InstagramAutomation');
fs.mkdirSync(userDataDir, { recursive: true });

// 创建浏览器用户数据目录，保存登录状态
const browserUserDataDir = path.join(userDataDir, 'browser-data');
fs.mkdirSync(browserUserDataDir, { recursive: true });

// 文件路径
const ALL_DATA_FILE = path.join(userDataDir, "全部评论.json");
const RESULT_FILE = path.join(userDataDir, "筛选结果.json");

// 延迟函数
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 获取用户信息
async function getUserInfo(browser, page, userUrl) {
    try {
        console.log(`🔍 正在获取用户信息: ${userUrl}`);
        
        // 直接在当前页面访问用户主页
        await page.goto(userUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 60000 // 增加超时时间到60秒
        });
        await delay(3000);
        
        // 提取帖子数、粉丝数和关注数
        const userInfo = await page.evaluate(() => {
            console.log('开始提取用户数据...');
            
            // 方法1: 查找包含帖子数、粉丝数、关注数的区域
            const statsElements = document.querySelectorAll('a[href$="/followers/"], a[href$="/following/"], a[href$="/posts/"]');
            console.log(`找到 ${statsElements.length} 个统计元素`);
            
            // 方法2: 查找所有包含数字的span
            const allSpans = document.querySelectorAll('span');
            console.log(`找到 ${allSpans.length} 个span元素`);
            
            const numberSpans = [];
            for (const span of allSpans) {
                const text = span.textContent || '';
                if (/[\d.,万]+/.test(text) && text.trim().length > 0) {
                    numberSpans.push(text.trim());
                }
            }
            
            console.log(`找到 ${numberSpans.length} 个包含数字的span:`, numberSpans);
            
            // 辅助函数：转换文本为数字
            function textToNumber(text) {
                if (!text) return null;
                
                text = text.trim();
                
                // 处理中文数字单位
                if (text.includes('万')) {
                    text = text.replace('万', '');
                    const num = parseFloat(text);
                    return num * 10000;
                }
                
                // 处理千分位和小数点
                text = text.replace(/[,.]/g, '');
                const num = parseInt(text);
                return isNaN(num) ? null : num;
            }
            
            let posts = null;
            let followers = null;
            let following = null;
            
            // 按顺序：第一个是帖子数，第二个是粉丝数，第三个是关注数
            if (numberSpans.length >= 1) {
                posts = textToNumber(numberSpans[0]);
                console.log(`帖子数: ${posts}`);
            }
            if (numberSpans.length >= 2) {
                followers = textToNumber(numberSpans[1]);
                console.log(`粉丝数: ${followers}`);
            }
            if (numberSpans.length >= 3) {
                following = textToNumber(numberSpans[2]);
                console.log(`关注数: ${following}`);
            }
            
            return { posts, followers, following };
        });
        
        console.log(`✅ 用户信息获取成功: 帖子 ${userInfo.posts}, 粉丝 ${userInfo.followers}, 关注 ${userInfo.following}`);
        return userInfo;
    } catch (error) {
        console.error(`❌ 获取用户信息失败 (${userUrl}): ${error.message}`);
        return { posts: null, followers: null, following: null };
    }
}

// 主函数
async function main(maxFollowers, maxFollowing) {
    console.log('🚀 开始执行粉丝数量过滤...');
    
    try {
        // 读取评论数据
    const commentsData = JSON.parse(fs.readFileSync(ALL_DATA_FILE, 'utf8'));
    console.log(`📊 评论总数: ${commentsData.length}`);
        
        // 启动浏览器
        console.log('🌐 启动浏览器...');
        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            userDataDir: browserUserDataDir,
            args: ['--start-maximized']
        });
        
        const page = await browser.newPage();
        
        // 过滤结果数组
        const result = [];
        
        // 逐个检查用户
        for (let i = 0; i < commentsData.length; i++) {
            const item = commentsData[i];
            console.log(`\n处理第 ${i + 1}/${commentsData.length} 条数据`);
            

            
            // 如果没有用户URL，跳过
            if (!item.userUrl) {
                console.log('❌ 跳过：无用户URL');
                continue;
            }
            
            // 获取用户实际的粉丝数和关注数
            const userInfo = await getUserInfo(browser, page, item.userUrl);
            
            // 判断是否符合条件
            let shouldInclude = true;
            
            // 粉丝数量过滤：如果粉丝数 > 最大粉丝数，则跳过
            if (maxFollowers && userInfo.followers !== null && userInfo.followers > parseInt(maxFollowers)) {
                console.log(`❌ 跳过：粉丝数 ${userInfo.followers} > 最大粉丝数 ${maxFollowers}`);
                shouldInclude = false;
            }
            
            // 关注数量过滤：如果关注数 > 最大关注数，则跳过
            if (maxFollowing && userInfo.following !== null && userInfo.following > parseInt(maxFollowing)) {
                console.log(`❌ 跳过：关注数 ${userInfo.following} > 最大关注数 ${maxFollowing}`);
                shouldInclude = false;
            }
            
            if (shouldInclude) {
                // 添加用户信息到结果中
                const filteredItem = {
                    ...item,
                    posts: userInfo.posts,
                    followers: userInfo.followers,
                    following: userInfo.following
                };
                result.push(filteredItem);
                console.log(`✅ 符合条件，已添加到结果`);
            }
            
            // 添加随机延迟避免被封号
            await delay(Math.random() * 3000 + 2000);
        }
        
        // 关闭浏览器
        await browser.close();
        console.log('🌐 浏览器已关闭');
        
        // 保存结果
        fs.writeFileSync(RESULT_FILE, JSON.stringify(result, null, 2), 'utf8');
        console.log(`💾 已保存筛选结果到: ${RESULT_FILE}`);
        console.log(`✅ 过滤完成，符合条件: ${result.length} 条`);
        
        return {
            success: true,
            totalUsers: commentsData.length,
            resultCount: result.length
        };
        
    } catch (error) {
        console.error('❌ 过滤过程中发生错误:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// 解析命令行参数
const args = process.argv.slice(2);
const maxFollowers = args[0];
const maxFollowing = args[1];

if (!maxFollowers || !maxFollowing) {
    console.error('❌ 参数错误：请提供最大粉丝数和最大关注数');
    process.exit(1);
}

// 导出main函数，供主程序调用
if (require.main === module) {
    // 直接运行时执行
    main(maxFollowers, maxFollowing)
        .then(result => {
            if (result.success) {
                console.log('🎉 粉丝数量过滤任务完成！');
                process.exit(0);
            } else {
                console.error('❌ 粉丝数量过滤任务失败:', result.error);
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('❌ 任务执行出错:', error.message);
            process.exit(1);
        });
} else {
    // 被require时导出main函数
    module.exports = { main };
}
