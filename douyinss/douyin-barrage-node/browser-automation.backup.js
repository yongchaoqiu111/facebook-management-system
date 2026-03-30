const puppeteer = require('puppeteer');
const WebSocket = require('ws');

class DouyinBrowserAutomation {
    constructor() {
        this.browser = null;
        this.page = null;
        this.wsServer = null;
        this.clients = new Set();
        this.danmakuCache = new Set(); // 防止重复捕获
    }

    async start(roomUrl, wsPort = 8888) {
        try {
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

            this.page = await this.browser.newPage();
            
            // 监听浏览器控制台输出
            this.page.on('console', msg => {
                const text = msg.text();
                console.log(`[Browser] ${text}`);
            });
            
            // 设置User-Agent
            await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            // 访问直播间
            console.log(`正在访问直播间: ${roomUrl}`);
            await this.page.goto(roomUrl, {
                waitUntil: 'networkidle2',
                timeout: 60000
            });

            // 等待页面稳定
            await this.waitForPageReady();
            
            // 启动WebSocket服务器
            this.startWebSocketServer(wsPort);
            
            // 暴露发送弹幕的函数给浏览器
            await this.page.exposeFunction('sendDanmaku', (danmaku) => {
                this.broadcastMessage(danmaku);
                console.log(`💬 [${new Date(danmaku.timestamp).toLocaleTimeString()}] ${danmaku.user.nickname}: ${danmaku.content}`);
            });
            
            // 注入弹幕监听脚本
            await this.injectDanmakuListener();
            
            // 启动心跳检测
            this.startHeartbeat();
            
            console.log('✅ 浏览器自动化已启动，正在监听弹幕...');
            
        } catch (error) {
            console.error('启动失败:', error);
            await this.stop();
        }
    }

    async waitForPageReady() {
        // 等待直播间加载完成
        await this.page.waitForFunction(() => {
            return document.querySelector('video') !== null || 
                   document.querySelector('.webcast-chatroom') !== null;
        }, { timeout: 30000 }).catch(() => {
            console.log('等待超时，继续执行...');
        });
        
        // 等待额外时间让React组件渲染
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 如果有登录弹窗，尝试关闭
        await this.closeLoginPopup();
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

    async injectDanmakuListener() {
        try {
            // 1. 先注入：让抖音自己解密渲染，我们只拿结果
            await this.page.evaluateOnNewDocument(() => {
                window.danmakuCache = new Set();
                console.log('✅ 已注入：只监听页面渲染结果，不做任何解密');
            });

            // 2. 页面内：高频扫描已渲染的明文弹幕（抖音自己解密好的）
            await this.page.evaluate(() => {
                // 重新定义缓存
                window.danmakuCache = new Set();

                // 调试：打印页面结构
                console.log('=== 页面结构调试 ===');
                console.log('body子元素数量:', document.body.children.length);
                
                // 高频扫描：只拿抖音已经解密、渲染到页面的明文
                setInterval(() => {
                    try {
                        // 主要选择器
                        const selectors = [
                            '.webcast-chatroom___item'
                        ];

                        console.log('=== 选择器扫描开始 ===');
                        
                        for (const selector of selectors) {
                            const elements = document.querySelectorAll(selector);
                            console.log(`选择器 ${selector}: ${elements.length} 个元素`);
                            
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
                                
                                // 查找整个弹幕项中的所有链接
                                const allLinks = item.querySelectorAll('a');
                                
                                // 尝试直接查找用户主页链接
                                if (allLinks.length > 0) {
                                    userUrl = allLinks[0].href;
                                    // 从URL中提取用户ID
                                    const match = userUrl.match(/\/(\d+)/);
                                    if (match) {
                                        userId = match[1];
                                    }
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

                                // 使用暴露的函数发送到服务端
                                window.sendDanmaku(msg);
                                console.log(`💬 ${nickname}: ${content}`);
                            }
                        }
                        
                        console.log('=== 选择器扫描结束 ===');
                    } catch (e) { 
                        console.error('扫描错误:', e); 
                    }
                }, 500); // 500ms扫描，不漏弹幕
            });

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

    async stop() {
        try {
            if (this.page) await this.page.close();
            if (this.browser) await this.browser.close();
            if (this.wsServer) this.wsServer.close();
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
    
    automation.start(roomUrl).catch(console.error);
    
    process.on('SIGINT', async () => {
        await automation.stop();
        process.exit(0);
    });
}

module.exports = DouyinBrowserAutomation;