const puppeteer = require('puppeteer');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

class DouyinBrowserAutomation {
    constructor() {
        this.browser = null;
        this.page = null;
        this.wsServer = null;
        this.clients = new Set();
        this.danmakuCache = new Set(); // 防止重复捕获
        this.outputFile = path.join(__dirname, '..', '用户弹幕数据.json');
    }

    async start(roomUrl, keywords = []) {
        try {
            console.log('=== 启动浏览器自动化 ===');
            
            // 启动浏览器（优化配置）
            this.browser = await puppeteer.launch({
                headless: false,
                defaultViewport: { width: 1920, height: 1080 },
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled', // 隐藏自动化
                    '--start-maximized',
                    '--disable-web-security'
                ]
            });
            console.log('✅ 浏览器已启动');

            this.page = await this.browser.newPage();
            console.log('✅ 新页面已创建');
            
            // 监听浏览器控制台输出
            this.page.on('console', msg => {
                const text = msg.text();
                console.log(`[Browser] ${text}`);
                
                // 检查是否是弹幕数据
                if (text.startsWith('SENDING_DANMAKU:')) {
                    try {
                        const danmakuJson = text.replace('SENDING_DANMAKU:', '').trim();
                        const danmaku = JSON.parse(danmakuJson);
                        this.saveDanmakuToFile(danmaku);
                    } catch (error) {
                        console.error('解析弹幕数据失败:', error);
                    }
                }
            });
            console.log('✅ 控制台监听器已设置');
            
            // 设置User-Agent
            await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            console.log('✅ User-Agent已设置');
            
            // 访问直播间
            console.log(`正在访问直播间: ${roomUrl}`);
            await this.page.goto(roomUrl, {
                waitUntil: 'networkidle2',
                timeout: 60000
            });
            console.log('✅ 页面已加载');

            // 等待页面稳定
            console.log('等待页面稳定...');
            await this.waitForPageReady();
            console.log('✅ 页面已稳定');
            
            // 启动WebSocket服务器
            this.startWebSocketServer(8888);
            console.log('✅ WebSocket服务器已启动');
            
            // 暴露发送弹幕的函数给浏览器，添加关键词过滤
            console.log('暴露sendDanmaku函数...');
            await this.page.exposeFunction('sendDanmaku', (danmaku) => {
                // 关键词过滤：只处理包含关键词的弹幕
                const contentLower = danmaku.content.toLowerCase();
                const shouldProcess = keywords.length === 0 || keywords.some(keyword => 
                    contentLower.includes(keyword.toLowerCase())
                );
                
                if (!shouldProcess) {
                    console.log(`🔍 过滤：内容不包含关键词 - ${danmaku.content}`);
                    return;
                }
                
                this.broadcastMessage(danmaku);
                console.log(`💬 [${new Date(danmaku.timestamp).toLocaleTimeString()}] ${danmaku.user.nickname}: ${danmaku.content}`);
                console.log(`👤 主页：${danmaku.user.url || '未找到'}`);
            });
            console.log('✅ sendDanmaku函数已暴露');
            
            // 注入弹幕监听脚本，传入关键词
            console.log('注入弹幕监听脚本...');
            await this.injectDanmakuListener(keywords);
            console.log('✅ 弹幕监听脚本已注入');
            
            // 启动心跳检测
            this.startHeartbeat();
            console.log('✅ 心跳检测已启动');
            
            console.log('✅ 浏览器自动化已启动，正在监听弹幕...');
            console.log(`🔍 关键词过滤：${keywords.length > 0 ? keywords.join(', ') : '无关键词'}`);
            
            // 防止脚本退出
            await new Promise(resolve => {
                this.stopPromise = resolve;
            });
            
        } catch (error) {
            console.error('启动失败:', error);
            console.error('错误详情:', error.stack);
            await this.stop();
        }
    }

    async waitForPageReady() {
        console.log('开始等待页面元素加载...');
        
        try {
            // 等待直播间加载完成
            await this.page.waitForFunction(() => {
                return document.querySelector('video') !== null || 
                       document.querySelector('.webcast-chatroom') !== null ||
                       document.querySelector('[data-e2e="chat-item"]') !== null;
            }, { timeout: 45000 });
            console.log('✅ 找到视频或聊天房间元素');
            
        } catch (error) {
            console.log('等待超时，继续执行...');
            console.log('当前页面内容:', await this.page.content().then(c => c.substring(0, 500)));
        }
        
        console.log('等待React组件渲染...');
        // 等待额外时间让React组件渲染
        let remainingTime = 10000;
        const interval = setInterval(() => {
            remainingTime -= 1000;
            console.log(`剩余等待时间: ${remainingTime}ms`);
        }, 1000);
        
        await new Promise(resolve => setTimeout(resolve, 10000));
        clearInterval(interval);
        console.log('✅ React组件渲染完成');
        
        // 如果有登录弹窗，尝试关闭
        console.log('尝试关闭登录弹窗...');
        await this.closeLoginPopup();
        console.log('✅ 登录弹窗处理完成');
        
        // 输出页面结构信息
        console.log('输出页面结构信息...');
        const pageInfo = await this.page.evaluate(() => {
            console.log('=== 页面结构详细信息 ===');
            const videoExists = document.querySelector('video') !== null;
            const chatroomExists = document.querySelector('.webcast-chatroom') !== null;
            const chatItems = document.querySelectorAll('[data-e2e="chat-item"]').length;
            const chatContainers = document.querySelectorAll('[class*="chatroom"]').length;
            
            console.log('video元素:', videoExists ? '存在' : '不存在');
            console.log('webcast-chatroom:', chatroomExists ? '存在' : '不存在');
            console.log('chat-item元素:', chatItems);
            console.log('所有可能的弹幕容器:', chatContainers);
            
            return { videoExists, chatroomExists, chatItems, chatContainers };
        });
        
        console.log(`页面结构统计: video=${pageInfo.videoExists}, chatroom=${pageInfo.chatroomExists}, chatItems=${pageInfo.chatItems}, containers=${pageInfo.chatContainers}`);
        console.log('✅ 页面稳定检查完成');
    }

    async closeLoginPopup() {
        try {
            await this.page.evaluate(() => {
                const closeBtn = document.querySelector('.close-btn, .modal-close, [aria-label="关闭"]');
                if (closeBtn) {
                    closeBtn.click();
                }
            });
        } catch(e) {
            // 忽略错误
        }
    }

    async injectDanmakuListener(keywords = []) {
        try {
            // 1. 先注入：让抖音自己解密渲染，我们只拿结果
            await this.page.evaluateOnNewDocument(() => {
                window.danmakuCache = new Set();
                console.log('✅ 已注入：只监听页面渲染结果，不做任何解密');
            });

            // 2. 页面内：高频扫描已渲染的明文弹幕（抖音自己解密好的）
            await this.page.evaluate((keywords) => {
                // 重新定义缓存
                window.danmakuCache = new Set();
                window._KEYWORDS = keywords;

                // 定义发送弹幕到服务端的函数
                window.sendDanmaku = function(danmaku) {
                    // 通过控制台发送到服务端
                    console.log('SENDING_DANMAKU:', JSON.stringify(danmaku));
                };

                // 调试：打印页面结构
                console.log('=== 页面结构调试 ===');
                console.log('body子元素数量:', document.body.children.length);
                console.log(`关键词过滤：${keywords.length > 0 ? keywords.join(', ') : '无关键词'}`);
                
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
                
                // 简单的持续捕获策略
                setInterval(() => {
                    try {
                        console.log('=== 捕获扫描开始 ===');
                        
                        for (const selector of selectors) {
                            const elements = document.querySelectorAll(selector);
                            console.log(`选择器 ${selector}: ${elements.length} 个元素`);
                            
                            if (elements.length > 0) {
                                console.log(`第一个元素的HTML结构:`, elements[0].outerHTML.substring(0, 500) + '...');
                            }
                            
                            for (const item of elements) {
                                if (item._processed) continue;
                                item._processed = true;
                                
                                // 提取明文：抖音已经解密好的文本
                                const text = item.innerText.trim();
                                if (!text || text.length < 2) continue;
                                
                                console.log(`找到文本: ${text}`);
                                
                                // 拆分用户名和内容（抖音自己分好的）
                                const parts = text.split(/：|:/);
                                if (parts.length < 2) continue;
                                const nickname = parts[0].trim();
                                const content = parts.slice(1).join('：').trim();
                                if (!nickname || !content) continue;
                                
                                // 提取用户主页链接或ID
                                let userId = null;
                                let userUrl = null;
                                
                                // 策略1：查找整个弹幕项中的所有链接
                                const allLinks = item.querySelectorAll('a');
                                
                                // 尝试直接查找用户主页链接
                                if (allLinks.length > 0) {
                                    for (const link of allLinks) {
                                        if (link.href.includes('douyin.com/user/')) {
                                            userUrl = link.href;
                                            console.log(`找到用户主页链接: ${userUrl}`);
                                            break;
                                        }
                                    }
                                }
                                
                                // 策略2：尝试从React内部获取完整用户数据（包含secUid）
                                const reactProps = Object.keys(item).filter(k => k.startsWith("__react"));
                                if (reactProps.length > 0) {
                                    console.log(`找到React属性: ${reactProps.join(', ')}`);
                                    for (const prop of reactProps) {
                                        try {
                                            const reactData = item[prop];
                                            console.log(`属性 ${prop} 的类型:`, typeof reactData);
                                            console.log(`属性 ${prop} 的所有键:`, Object.keys(reactData));
                                            
                                            // 递归搜索用户信息的函数
                                            function searchUserData(obj, path = '') {
                                                if (!obj || typeof obj !== 'object') return;
                                                
                                                // 检查message.payload.user路径（从日志发现的关键路径）
                                                if (obj.message && obj.message.payload && obj.message.payload.user) {
                                                    const user = obj.message.payload.user;
                                                    console.log(`✅ 在路径 ${path}.message.payload.user 找到用户信息:`, JSON.stringify(user, null, 2));
                                                    if (user.id && user.sec_uid) {
                                                        return user;
                                                    }
                                                }
                                                
                                                // 检查当前对象是否包含用户信息
                                                if (obj.id && obj.sec_uid) {
                                                    console.log(`✅ 在路径 ${path} 找到用户信息:`, JSON.stringify(obj, null, 2));
                                                    return obj;
                                                }
                                                
                                                // 检查当前对象是否包含user字段
                                                if (obj.user && typeof obj.user === 'object') {
                                                    if (obj.user.id && obj.user.sec_uid) {
                                                        console.log(`✅ 在路径 ${path}.user 找到用户信息:`, JSON.stringify(obj.user, null, 2));
                                                        return obj.user;
                                                    }
                                                }
                                                
                                                // 检查当前对象是否包含user_info字段
                                                if (obj.user_info && typeof obj.user_info === 'object') {
                                                    if (obj.user_info.id && obj.user_info.sec_uid) {
                                                        console.log(`✅ 在路径 ${path}.user_info 找到用户信息:`, JSON.stringify(obj.user_info, null, 2));
                                                        return obj.user_info;
                                                    }
                                                }
                                                
                                                // 检查message.payload.common路径
                                                if (obj.message && obj.message.payload && obj.message.payload.common) {
                                                    const common = obj.message.payload.common;
                                                    console.log(`检查message.payload.common:`, JSON.stringify(common, null, 2));
                                                    if (common.user_id && common.sec_uid) {
                                                        console.log(`✅ 在路径 ${path}.message.payload.common 找到用户信息:`, JSON.stringify(common, null, 2));
                                                        return common;
                                                    }
                                                }
                                                
                                                // 递归搜索子对象
                                                for (const key in obj) {
                                                    if (obj[key] && typeof obj[key] === 'object') {
                                                        const result = searchUserData(obj[key], path ? `${path}.${key}` : key);
                                                        if (result) return result;
                                                    }
                                                }
                                                return null;
                                            }
                                            
                                            // 搜索memoizedProps中的用户信息
                                            if (reactData.memoizedProps) {
                                                const userData = searchUserData(reactData.memoizedProps, 'memoizedProps');
                                                if (userData && userData.id && userData.sec_uid) {
                                                    userId = userData.id;
                                                    const secUid = userData.sec_uid;
                                                    userUrl = `https://www.douyin.com/user/${secUid}`;
                                                    console.log(`✅ 成功获取用户信息 - ID: ${userId}, secUid: ${secUid}, 主页: ${userUrl}`);
                                                }
                                            }
                                            
                                            // 如果还没找到，搜索props中的用户信息
                                            if (!userUrl && reactData.props) {
                                                const userData = searchUserData(reactData.props, 'props');
                                                if (userData && userData.id && userData.sec_uid) {
                                                    userId = userData.id;
                                                    const secUid = userData.sec_uid;
                                                    userUrl = `https://www.douyin.com/user/${secUid}`;
                                                    console.log(`✅ 成功获取用户信息 - ID: ${userId}, secUid: ${secUid}, 主页: ${userUrl}`);
                                                }
                                            }
                                            
                                        } catch (e) {
                                            console.log('React数据解析错误:', e.message);
                                        }
                                    }
                                } else {
                                    console.log('未找到React属性');
                                }
                                
                                // 去重
                                const key = `${nickname}_${content}_${Date.now()}`;
                                if (window.danmakuCache.has(key)) continue;
                                window.danmakuCache.add(key);
                                setTimeout(() => window.danmakuCache.delete(key), 10000);
                                
                                // 组装明文弹幕（全是抖音解密好的）
                                const msg = {
                                    type: 'danmaku',
                                    user: { 
                                        nickname,
                                        id: userId,
                                        url: userUrl
                                    },
                                    content,
                                    timestamp: Date.now(),
                                    source: 'page_rendered'
                                };
                                
                                // 使用暴露的函数发送到服务端，会在服务端进行关键词过滤
                                window.sendDanmaku(msg);
                                console.log(`💬 ${nickname}: ${content}`);
                                if (userUrl) {
                                    console.log(`👤 主页：${userUrl}`);
                                }
                                
                            }
                        }
                        
                        console.log('=== 捕获扫描结束 ===');
                        
                    } catch (e) { 
                        console.error('捕获错误:', e); 
                    }
                }, 1000); // 每秒捕获一次
                
                console.log('✅ 弹幕监听已启动：简单持续捕获模式');
            }, keywords);

            console.log('✅ 弹幕监听已启动：纯前端、零解密');
        } catch (err) {
            console.error('注入失败:', err);
        }
    }

    startWebSocketServer(port) {
        this.wsServer = new WebSocket.Server({ port });
        
        this.wsServer.on('connection', (ws) => {
            console.log('🔌 客户端已连接');
            this.clients.add(ws);
            
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    if (data.type === 'ping') {
                        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                    }
                } catch(e) {}
            });
            
            ws.on('close', () => {
                this.clients.delete(ws);
                console.log('🔌 客户端断开');
            });
        });
        
        console.log(`🌐 WebSocket服务器运行在 ws://localhost:${port}`);
    }

    startHeartbeat() {
        setInterval(() => {
            const heartbeat = {
                type: 'heartbeat',
                timestamp: Date.now(),
                clients: this.clients.size
            };
            
            this.broadcastMessage(heartbeat);
        }, 30000);
    }

    broadcastMessage(message) {
        const data = JSON.stringify(message);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    }

    saveDanmakuToFile(danmaku) {
        try {
            // 读取现有数据
            let existingData = [];
            if (fs.existsSync(this.outputFile)) {
                const content = fs.readFileSync(this.outputFile, 'utf8');
                existingData = JSON.parse(content);
            }

            // 只保存需要的字段：用户昵称、用户主页、发言内容
            const simplifiedData = {
                timestamp: Date.now(),
                user: {
                    nickname: danmaku.user.nickname,
                    url: danmaku.user.url,
                    id: danmaku.user.id
                },
                content: danmaku.content
            };

            // 添加新数据
            existingData.push(simplifiedData);

            // 写入文件
            fs.writeFileSync(this.outputFile, JSON.stringify(existingData, null, 2));
            console.log(`✅ 已保存弹幕数据到文件: ${this.outputFile}`);
        } catch (error) {
            console.error('保存弹幕数据失败:', error);
        }
    }

    async stop() {
        try {
            if (this.page) await this.page.close();
            if (this.browser) await this.browser.close();
            if (this.wsServer) this.wsServer.close();
            
            // 解析stopPromise，允许脚本退出
            if (this.stopPromise) {
                this.stopPromise();
            }
            
            console.log('✅ 浏览器自动化已停止');
        } catch (error) {
            console.error('停止失败:', error);
        }
    }
}

// 运行示例
if (require.main === module) {
    const automation = new DouyinBrowserAutomation();
    const roomUrl = process.argv[2] || 'https://live.douyin.com/85101249452';
    const keywords = process.argv.slice(3); // 从第4个参数开始作为关键词
    
    console.log(`启动参数:`);
    console.log(`- 直播间: ${roomUrl}`);
    console.log(`- 关键词: ${keywords.length > 0 ? keywords.join(', ') : '无关键词'}`);
    
    automation.start(roomUrl, keywords).catch(console.error);
    
    process.on('SIGINT', async () => {
        await automation.stop();
        process.exit(0);
    });
}

module.exports = DouyinBrowserAutomation;