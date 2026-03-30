const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function testCompleteDanmakuCapture() {
    console.log('=== 开始完整测试弹幕抓取 ===');
    
    try {
        // 启动浏览器
        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1920, height: 1080 },
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--start-maximized',
                '--disable-web-security'
            ]
        });
        
        const page = await browser.newPage();
        
        // 访问抖音直播间
        const roomUrl = 'https://live.douyin.com/77994347272';
        console.log(`访问直播间: ${roomUrl}`);
        await page.goto(roomUrl, { waitUntil: 'networkidle2' });
        
        // 等待页面加载完成
        console.log('等待页面加载...');
        await page.waitForSelector('body');
        
        // 模拟前端的弹幕捕获逻辑并返回结果
        const results = await page.evaluate(async () => {
            const capturedDanmakus = [];
            
            // 初始化缓存
            const danmakuCache = new Set();
            
            // 捕获弹幕的主函数
            function captureDanmaku() {
                try {
                    // 主要选择器
                    const selectors = [
                        '.webcast-chatroom___item',
                        '[class*="chatroom"] [class*="item"]',
                        '[data-e2e="chat-item"]',
                        '.webcast-chatroom',
                        '[class*="chatroom"]',
                        '.chat-item',
                        '[class*="item"]'
                    ];
                    
                    let totalCaptured = 0;
                    
                    for (const selector of selectors) {
                        const elements = document.querySelectorAll(selector);
                        
                        for (const element of elements) {
                            if (element._processed) continue;
                            element._processed = true;
                            
                            try {
                                // 提取明文
                                const text = element.innerText.trim();
                                if (!text || text.length < 2) continue;
                                
                                // 拆分用户名和内容
                                const parts = text.split(/：|:/);
                                if (parts.length < 2) continue;
                                const nickname = parts[0].trim();
                                const content = parts.slice(1).join('：').trim();
                                if (!nickname || !content) continue;
                                
                                // 提取用户主页链接或ID
                                let userId = null;
                                let userUrl = '';
                                
                                // 策略1：查找整个弹幕项中的所有链接
                                const allLinks = element.querySelectorAll('a');
                                if (allLinks.length > 0) {
                                    for (const link of allLinks) {
                                        if (link.href.includes('douyin.com/user/')) {
                                            userUrl = link.href;
                                            break;
                                        }
                                    }
                                }
                                
                                // 策略2：尝试从头像URL提取用户信息
                                const avatarElement = element.querySelector('img, [class*="avatar"], [data-e2e="barrage-avatar"]');
                                if (avatarElement && avatarElement.src) {
                                    const avatarSrc = avatarElement.src;
                                    
                                    // 尝试从头像URL中提取secUid或用户ID
                                    const secUidMatch = avatarSrc.match(/sec_uid=([^&]+)/);
                                    if (secUidMatch && !userUrl) {
                                        const secUid = secUidMatch[1];
                                        userUrl = `https://www.douyin.com/user/${secUid}`;
                                    }
                                }
                                
                                if (content && nickname) {
                                    // 创建弹幕唯一标识
                                    const danmakuKey = `${nickname}:${content}:${Date.now()}`;
                                    
                                    if (danmakuCache.has(danmakuKey)) {
                                        continue;
                                    }
                                    
                                    // 添加到缓存
                                    danmakuCache.add(danmakuKey);
                                    setTimeout(() => danmakuCache.delete(danmakuKey), 10000);
                                    
                                    const danmaku = {
                                        type: 'danmaku',
                                        user: {
                                            nickname: nickname,
                                            id: 'unknown',
                                            url: userUrl || ''
                                        },
                                        content: content,
                                        timestamp: Date.now(),
                                        source: 'page_rendered'
                                    };
                                    
                                    capturedDanmakus.push(danmaku);
                                    totalCaptured++;
                                }
                            } catch (error) {
                                console.error('处理弹幕元素失败:', error);
                            }
                        }
                    }
                    
                    return { success: true, totalCaptured, capturedDanmakus };
                    
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
            
            // 执行一次捕获
            return captureDanmaku();
        });
        
        // 输出测试结果
        console.log('=== 测试结果 ===');
        if (results.success) {
            console.log(`成功捕获到 ${results.totalCaptured} 条弹幕`);
            if (results.capturedDanmakus.length > 0) {
                console.log('捕获到的弹幕数据:');
                results.capturedDanmakus.forEach((danmaku, index) => {
                    console.log(`${index + 1}. ${danmaku.user.nickname}: ${danmaku.content}`);
                });
            }
        } else {
            console.log(`捕获失败: ${results.error}`);
        }
        
        // 等待测试完成
        console.log('等待5秒完成测试...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        await browser.close();
        console.log('=== 测试完成 ===');
        
    } catch (error) {
        console.error('测试失败:', error);
    }
}

testCompleteDanmakuCapture();
