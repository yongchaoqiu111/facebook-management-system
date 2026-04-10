const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const schedule = require("node-schedule");
const WebSocket = require("ws");
const axios = require("axios");
const cheerio = require("cheerio");

const COOKIE_FILE = path.join(path.dirname(__dirname), "cookie.txt");
const CHROME_PROFILE = path.join(path.dirname(__dirname), "chrome-profile-1774327512015");
const app = express();
const PORT = 3001;

// 全局存储浏览器实例
let browserInstance = null;

// 任务存储文件
const tasksFile = path.join(path.dirname(__dirname), "json", "tasks.json");
// 任务执行状态文件
const taskStatusFile = path.join(path.dirname(__dirname), "json", "task-status.json");
// 设置存储文件
const settingsFile = path.join(path.dirname(__dirname), "json", "settings.json");
// 过滤词目录
const filterWordsDir = path.join(path.dirname(__dirname), "json", "filter-words");

// 确保数据目录存在
if (!fs.existsSync(path.join(path.dirname(__dirname), "json"))) {
    fs.mkdirSync(path.join(path.dirname(__dirname), "json"), { recursive: true });
}

// 确保过滤词目录存在
if (!fs.existsSync(filterWordsDir)) {
    fs.mkdirSync(filterWordsDir, { recursive: true });
}

// 初始化任务存储
if (!fs.existsSync(tasksFile)) {
    fs.writeFileSync(tasksFile, JSON.stringify([]), 'utf8');
}

// 初始化任务执行状态存储
if (!fs.existsSync(taskStatusFile)) {
    fs.writeFileSync(taskStatusFile, JSON.stringify({}), 'utf8');
}

// 初始化设置存储
if (!fs.existsSync(settingsFile)) {
    fs.writeFileSync(settingsFile, JSON.stringify({
        keywordTimeout: 180,
        filterWords: []
    }), 'utf8');
}

// 初始化过滤词文件
const filterWordCategories = {
    '美容美妆': ['美容', '护肤', '化妆品', '彩妆', '香水'],
    '健康健身': ['减肥', '健身', '瑜伽', '塑形', '营养'],
    '服饰鞋包': ['服装', '鞋子', '包包', '配饰', '珠宝'],
    '数码电子': ['手机', '电脑', '平板', '相机', '耳机'],
    '美食生鲜': ['美食', '零食', '水果', '饮料', '生鲜'],
    '家居生活': ['家居', '家电', '厨具', '家纺', '装饰'],
    '母婴玩具': ['母婴', '玩具', '童装', '奶粉', '尿布'],
    '教育培训': ['图书', '教育', '培训', '学习', '课程'],
    '旅游出行': ['旅游', '酒店', '机票', '门票', '度假'],
    '汽车服务': ['汽车', '配件', '保养', '维修', '保险']
};

// 创建过滤词文件
Object.entries(filterWordCategories).forEach(([category, words]) => {
    const categoryFile = path.join(filterWordsDir, `${category}.json`);
    if (!fs.existsSync(categoryFile)) {
        fs.writeFileSync(categoryFile, JSON.stringify(words, null, 2), 'utf8');
    }
});

// 创建10个文本文件对应10个大类目
const keywordFilesDir = path.join(path.dirname(__dirname), "json", "keyword-files");
if (!fs.existsSync(keywordFilesDir)) {
    fs.mkdirSync(keywordFilesDir, { recursive: true });
}

// 10个大类目
const mainCategories = [
    '美容美妆', '健康健身', '服饰鞋包', '数码电子', '美食生鲜',
    '家居生活', '母婴玩具', '教育培训', '旅游出行', '汽车服务'
];

// 初始化文本文件
mainCategories.forEach(category => {
    const categoryFile = path.join(keywordFilesDir, `${category}.txt`);
    if (!fs.existsSync(categoryFile)) {
        fs.writeFileSync(categoryFile, '', 'utf8');
    }
});

// 获取所有初始化数据
app.get("/api/initial-data", async (req, res) => {
    try {
        // 获取过滤词分类
        const categories = {};
        mainCategories.forEach(category => {
            const categoryFile = path.join(keywordFilesDir, `${category}.txt`);
            let words = [];
            if (fs.existsSync(categoryFile)) {
                const content = fs.readFileSync(categoryFile, { encoding: 'utf8' });
                words = content.trim().split('\n').filter(word => word.trim());
            }
            categories[category] = words;
        });
        
        // 获取设置
        const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
        
        // 获取直播间列表
        const liveRoomsFile = path.join(path.dirname(__dirname), "json", "live-rooms.json");
        let liveRooms = [];
        if (fs.existsSync(liveRoomsFile)) {
            liveRooms = JSON.parse(fs.readFileSync(liveRoomsFile, 'utf8'));
        }
        
        res.json({
            success: true,
            data: {
                filterWordCategories: categories,
                settings,
                liveRooms
            }
        });
    } catch (error) {
        console.error('获取初始化数据失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 任务调度器
const taskJobs = new Map();

// 全局状态跟踪
let executionStatus = {
    status: '空闲', // 空闲, 运行中, 已停止
    totalUsers: 0,
    currentCount: 0,
    progress: 0,
    currentAction: '等待开始'
};

// 弹幕抓取相关状态
let danmakuAutomation = null;
let isDanmakuRunning = false;

// WebSocket服务器
const wss = new WebSocket.Server({ port: 3002 });

wss.on('listening', () => {
    console.log('✅ WebSocket 服务器已启动，监听端口 3002');
});

wss.on('error', (error) => {
    console.error('❌ WebSocket 服务器启动失败:', error.message);
    if (error.code === 'EADDRINUSE') {
        console.error('端口 3002 已被占用，请检查是否有其他进程在使用');
    }
});

// 客户端连接存储
const clients = new Map();

// 直播间WebSocket连接存储
const roomConnections = new Map();

// 【新增】广播弹幕到所有连接的客户端
function broadcastDanmaku(danmaku, matchedKeyword = null) {
    const message = JSON.stringify({
        type: 'danmaku',
        user_name: danmaku.user.nickname,
        content: danmaku.content,
        user_url: danmaku.user.url,
        contains_keyword: !!matchedKeyword,
        keyword: matchedKeyword,
        timestamp: new Date().toISOString()
    });

    console.log(`📡 准备广播弹幕: ${danmaku.user.nickname} - ${danmaku.content.substring(0, 20)}`);
    console.log(`📡 当前连接的客户端数量: ${clients.size}`);

    let sentCount = 0;
    clients.forEach((client, clientId) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
            sentCount++;
            console.log(`📤 弹幕已发送到客户端 ${clientId}`);
        } else {
            console.log(`⚠️ 客户端 ${clientId} 状态: ${client.readyState}`);
        }
    });

    if (sentCount === 0) {
        console.log('⚠️ 没有可用的客户端连接，弹幕未推送');
    }
}

// 加载任务
function loadTasks() {
    try {
        const content = fs.readFileSync(tasksFile, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error('加载任务失败:', error);
        return [];
    }
}

// WebSocket服务器处理
wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    
    // 客户端连接（前端浏览器）
    if (path === '/ws/client') {
        const clientId = Date.now().toString();
        clients.set(clientId, ws);
        console.log(`✅ 客户端已连接，ID: ${clientId}，当前客户端总数: ${clients.size}`);
        
        ws.on('close', () => {
            clients.delete(clientId);
            console.log(`❌ 客户端已断开连接，ID: ${clientId}，当前客户端总数: ${clients.size}`);
        });
        
        ws.on('error', (error) => {
            console.error(`❌ 客户端连接错误:`, error);
            clients.delete(clientId);
        });
    }
    
    // 直播间连接（Python脚本）
    else if (path.startsWith('/ws/live/')) {
        const roomId = path.replace('/ws/live/', '');
        roomConnections.set(roomId, ws);
        console.log(`直播间 ${roomId} Python客户端已连接`);
        
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                console.log(`收到直播间 ${roomId} 消息:`, data);
                
                // 广播给所有客户端
                clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(data));
                    }
                });
                
            } catch (error) {
                console.error('解析消息失败:', error);
            }
        });
        
        ws.on('close', () => {
            roomConnections.delete(roomId);
            console.log(`直播间 ${roomId} Python客户端已断开连接`);
        });
        
        ws.on('error', (error) => {
            console.error(`直播间 ${roomId} 连接错误:`, error);
            roomConnections.delete(roomId);
        });
    }
});

// 广播消息给所有客户端
function broadcast(message) {
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// 保存任务
function saveTasks(tasks) {
    try {
        fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2), 'utf8');
    } catch (error) {
        console.error('保存任务失败:', error);
    }
}

// 加载任务执行状态
function loadTaskStatus() {
    try {
        const content = fs.readFileSync(taskStatusFile, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error('加载任务执行状态失败:', error);
        return {};
    }
}

// 保存任务执行状态
function saveTaskStatus(status) {
    try {
        fs.writeFileSync(taskStatusFile, JSON.stringify(status, null, 2), 'utf8');
    } catch (error) {
        console.error('保存任务执行状态失败:', error);
    }
}

// 更新任务执行状态
function updateTaskStatus(taskId, status) {
    try {
        const taskStatus = loadTaskStatus();
        taskStatus[taskId] = {
            ...status,
            updatedAt: new Date().toISOString()
        };
        saveTaskStatus(taskStatus);
    } catch (error) {
        console.error('更新任务执行状态失败:', error);
    }
}

// 启动任务调度
function startTaskScheduler() {
    const tasks = loadTasks();
    tasks.forEach(task => {
        scheduleTask(task);
    });
}

// 调度单个任务
function scheduleTask(task) {
    // 取消之前的任务
    if (taskJobs.has(task.id)) {
        taskJobs.get(task.id).cancel();
    }
    
    // 支持立即执行
    if (task.time === 'now') {
        console.log(`立即执行任务: ${task.skill}`);
        executeTask(task);
        return;
    }
    
    // 解析时间
    const [hours, minutes] = task.time.split(':').map(Number);
    
    // 创建定时任务
    const job = schedule.scheduleJob({ hour: hours, minute: minutes }, () => {
        executeTask(task);
    });
    
    taskJobs.set(task.id, job);
    console.log(`任务调度成功: ${task.time} - ${task.skill}`);
}

// 执行任务
async function executeTask(task) {
    // 检查任务是否已被手动停止
    const statusData = loadTaskStatus();
    if (statusData[task.id] && statusData[task.id].status === '已停止') {
        console.log(`任务 ${task.id} 已被手动停止，取消执行`);
        return;
    }

    console.log(`执行任务: ${task.time} - ${task.skill}`);
    
    // 更新任务执行状态为开始
    updateTaskStatus(task.id, {
        status: '运行中',
        startTime: new Date().toISOString()
    });
    
    try {
        // 根据技能类型执行不同的任务
        switch (task.skill) {
            case 'autoFollow':
                // 执行自动关注任务
                await autoFollow(5, 10); // 默认参数执行自动关注
                break;
            case 'autoSearchLiveRooms':
                // 执行自动搜索和替换直播间任务
                await autoSearchLiveRooms();
                break;
            case 'autoBatchCapture':
                // 执行自动批量抓取直播间任务
                await autoBatchCapture();
                break;
        }
        
        console.log(`任务执行成功: ${task.time} - ${task.skill}`);
        
        // 更新任务执行状态为成功
        updateTaskStatus(task.id, {
            status: 'success',
            endTime: new Date().toISOString()
        });
    } catch (error) {
        console.error(`任务执行失败: ${task.time} - ${task.skill}`, error);
        
        // 更新任务执行状态为失败
        updateTaskStatus(task.id, {
            status: 'failed',
            endTime: new Date().toISOString(),
            error: error.message
        });
    }
}

// 启用CORS
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(path.dirname(__dirname), "html")));

// 根路径重定向到路由系统
app.get("/", (req, res) => {
    res.redirect("/index.html");
});

async function openDouyin() {
    console.log("正在打开抖音...");
    
    // 启动浏览器
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ["--start-maximized"]
    });
    
    const page = await browser.newPage();
    
    try {
        await page.goto("https://www.douyin.com", {
            waitUntil: "networkidle2",
            timeout: 60000
        });
        
        console.log("抖音已打开，请在浏览器中登录");
        
        // 保存浏览器实例
        browserInstance = { browser, page };
        
        return true;
    } catch (error) {
        console.error("打开抖音失败:", error);
        await browser.close();
        throw error;
    }
}

async function saveCookie() {
    console.log("正在保存Cookie...");
    
    if (!browserInstance) {
        console.error("请先打开抖音登录页面");
        throw new Error("请先打开抖音登录页面");
    }
    
    const { browser, page } = browserInstance;
    
    try {
        // 等待用户登录
        console.log("请确保已登录抖音...");
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 获取Cookies
        const cookies = await page.cookies();
        
        // 保存Cookies到文件
        fs.writeFileSync(COOKIE_FILE, JSON.stringify(cookies, null, 2));
        
        console.log(`Cookie保存成功: ${COOKIE_FILE}`);
        
        // 关闭浏览器
        await browser.close();
        
        // 清除浏览器实例
        browserInstance = null;
        
        return true;
    } catch (error) {
        console.error("保存Cookie失败:", error);
        if (browser) {
            await browser.close();
        }
        browserInstance = null;
        throw error;
    }
}

async function loginWithCookie() {
    console.log("正在携带Cookie登录...");
    
    if (!fs.existsSync(COOKIE_FILE)) {
        console.error("Cookie文件不存在，请先保存Cookie");
        throw new Error("Cookie文件不存在，请先保存Cookie");
    }
    
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ["--start-maximized"]
    });
    
    const page = await browser.newPage();
    
    try {
        // 加载Cookies
        const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, "utf8"));
        
        // 设置Cookies
        await page.setCookie(...cookies);
        
        // 打开抖音
        await page.goto("https://www.douyin.com", {
            waitUntil: "networkidle2",
            timeout: 60000
        });
        
        console.log("已携带Cookie登录抖音");
        
        // 返回成功，不等待浏览器关闭
        return true;
    } catch (error) {
        console.error("携带Cookie登录失败:", error);
        await browser.close();
        throw error;
    }
}

// Express路由
app.get("/open-douyin", async (req, res) => {
    try {
        await openDouyin();
        res.json({ success: true, message: "抖音已打开，请在新窗口中登录" });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.get("/save-cookie", async (req, res) => {
    try {
        await saveCookie();
        res.json({ success: true, message: "Cookie保存成功" });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.get("/login-with-cookie", async (req, res) => {
    try {
        await loginWithCookie();
        res.json({ success: true, message: "已携带Cookie登录抖音" });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// 弹幕监控功能
let barrageWebSocket = null;
let isBarrageRunning = false;

// 启动弹幕监听
app.post("/api/barrage/start", async (req, res) => {
    try {
        if (isBarrageRunning) {
            return res.json({
                success: true,
                message: '弹幕监听已在运行'
            });
        }
        
        const { startBarrageMonitor } = require('./barrage');
        barrageWebSocket = startBarrageMonitor();
        isBarrageRunning = true;
        
        res.json({
            success: true,
            message: '弹幕监听已启动'
        });
    } catch (error) {
        console.error('启动弹幕监听失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 停止弹幕监听
app.post("/api/barrage/stop", async (req, res) => {
    try {
        if (!isBarrageRunning || !barrageWebSocket) {
            return res.json({
                success: true,
                message: '弹幕监听未运行'
            });
        }
        
        barrageWebSocket.close();
        isBarrageRunning = false;
        
        res.json({
            success: true,
            message: '弹幕监听已停止'
        });
    } catch (error) {
        console.error('停止弹幕监听失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 获取弹幕监听状态
app.get("/api/barrage/status", async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                running: isBarrageRunning
            }
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// 获取弹幕数据
app.get("/api/barrage/data", async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const BARRAGE_FILE = path.join(path.dirname(__dirname), "json", "直播间弹幕.json");
        
        if (!fs.existsSync(BARRAGE_FILE)) {
            return res.json({
                success: true,
                data: []
            });
        }
        
        const data = JSON.parse(fs.readFileSync(BARRAGE_FILE, 'utf8'));
        
        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error('获取弹幕数据失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 定时任务API路由

// 获取所有任务
app.get("/api/tasks", async (req, res) => {
    try {
        console.log('收到获取任务请求');
        const tasks = loadTasks();
        console.log('获取到的任务:', tasks);
        res.json({
            success: true,
            data: tasks
        });
    } catch (error) {
        console.error('获取任务失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 添加任务
app.post("/api/tasks", async (req, res) => {
    try {
        const { time, skill } = req.body;
        if (!time) {
            return res.json({ success: false, error: '请提供执行时间' });
        }

        const tasks = loadTasks();
        const newTask = {
            id: `task-${Date.now()}`,
            time,
            skill: skill || 'autoFollow' // 默认使用自动关注技能
        };

        tasks.push(newTask);
        saveTasks(tasks);
        scheduleTask(newTask);

        res.json({
            success: true,
            message: '任务创建成功',
            data: newTask
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// 删除任务
app.delete("/api/tasks/:id", async (req, res) => {
    try {
        const { id } = req.params;
        console.log('收到删除任务请求:', id);
        
        const tasks = loadTasks();
        console.log('当前任务列表:', tasks);
        
        const filteredTasks = tasks.filter(task => task.id !== id);
        console.log('删除后的任务列表:', filteredTasks);
        
        // 取消任务调度
        if (taskJobs.has(id)) {
            console.log('取消任务调度:', id);
            taskJobs.get(id).cancel();
            taskJobs.delete(id);
        }
        
        saveTasks(filteredTasks);
        console.log('任务删除成功');
        
        res.json({
            success: true,
            message: '任务删除成功'
        });
    } catch (error) {
        console.error('删除任务失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 获取任务执行状态
app.get("/api/task-status", async (req, res) => {
    try {
        const status = loadTaskStatus();
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// 自动搜索和替换直播间函数
async function autoSearchLiveRooms() {
    console.log(`====================================`);
    console.log(`开始自动搜索和替换直播间任务`);
    console.log(`====================================`);
    
    try {
        const liveRoomsFile = path.join(path.dirname(__dirname), "json", "live-rooms.json");
        let liveRooms = [];
        
        // 加载当前直播间列表
        if (fs.existsSync(liveRoomsFile)) {
            const content = fs.readFileSync(liveRoomsFile, 'utf8');
            liveRooms = JSON.parse(content);
        }
        
        // 找出状态为"已结束"或"抓取失败"的直播间
        const failedRooms = liveRooms.filter(room => 
            room.status === '已结束' || room.status === '抓取失败'
        );
        
        if (failedRooms.length > 0) {
            console.log(`找到 ${failedRooms.length} 个不能进入的直播间`);
            
            // 使用关键词搜索新直播间（使用默认关键词"美容"）
            const keyword = '美容';
            console.log(`正在搜索关键词: ${keyword}`);
            
            // 模拟搜索结果（实际应用中应该调用搜索API）
            const mockLiveRooms = [
                {
                    id: '291387640585',
                    url: 'https://live.douyin.com/291387640585',
                    title: '美容护肤直播间',
                    avatar: '',
                    foundAt: new Date().toISOString()
                },
                {
                    id: '486948817488',
                    url: 'https://live.douyin.com/486948817488',
                    title: '美妆产品推荐',
                    avatar: '',
                    foundAt: new Date().toISOString()
                },
                {
                    id: '318554791737',
                    url: 'https://live.douyin.com/318554791737',
                    title: '护肤技巧分享',
                    avatar: '',
                    foundAt: new Date().toISOString()
                },
                {
                    id: '625819849604',
                    url: 'https://live.douyin.com/625819849604',
                    title: '美容美妆教程',
                    avatar: '',
                    foundAt: new Date().toISOString()
                },
                {
                    id: '112908963841',
                    url: 'https://live.douyin.com/112908963841',
                    title: '护肤品评测',
                    avatar: '',
                    foundAt: new Date().toISOString()
                },
                {
                    id: '274750495051',
                    url: 'https://live.douyin.com/274750495051',
                    title: '美容护肤专家',
                    avatar: '',
                    foundAt: new Date().toISOString()
                }
            ];
            
            // 过滤匹配关键词的直播间
            const searchResults = mockLiveRooms.filter(room => 
                room.title.includes(keyword) || 
                room.title.includes('美妆') || 
                room.title.includes('护肤') || 
                room.title.includes('化妆品')
            );
            
            console.log(`搜索完成，找到 ${searchResults.length} 个新直播间`);
            
            // 用新搜索到的直播间替换失败的直播间
            for (let i = 0; i< Math.min(failedRooms.length, searchResults.length); i++) {
                const failedRoomIndex = liveRooms.findIndex(r => r.url === failedRooms[i].url);
                if (failedRoomIndex !== -1) {
                    liveRooms[failedRoomIndex] = {
                        ...liveRooms[failedRoomIndex],
                        url: searchResults[i].url,
                        id: searchResults[i].id,
                        status: '待抓取',
                        lastCaptureTime: null
                    };
                    console.log(`已替换直播间: ${failedRooms[i].url} -> ${searchResults[i].url}`);
                }
            }
            
            // 保存更新后的直播间列表
            fs.writeFileSync(liveRoomsFile, JSON.stringify(liveRooms, null, 2));
            console.log(`已保存更新后的直播间列表`);
            
        } else {
            console.log('没有发现不能进入的直播间');
        }
        
        console.log(`自动搜索和替换直播间任务完成`);
        
    } catch (error) {
        console.error('自动搜索和替换直播间失败:', error);
        throw error;
    }
}

// 自动批量抓取直播间函数
async function autoBatchCapture() {
    console.log(`====================================`);
    console.log(`开始自动批量抓取直播间任务`);
    console.log(`====================================`);
    
    try {
        const liveRoomsFile = path.join(path.dirname(__dirname), "json", "live-rooms.json");
        
        // 检查直播间列表文件是否存在
        if (!fs.existsSync(liveRoomsFile)) {
            console.log('直播间列表文件不存在，请先添加直播间');
            return;
        }
        
        // 加载直播间列表
        const content = fs.readFileSync(liveRoomsFile, 'utf8');
        const liveRooms = JSON.parse(content);
        
        if (liveRooms.length === 0) {
            console.log('直播间列表为空，请先添加直播间');
            return;
        }
        
        console.log(`找到 ${liveRooms.length} 个直播间，开始批量抓取`);
        
        // 遍历所有直播间进行抓取
        for (let i = 0; i< liveRooms.length; i++) {
            // 【紧急刹车】每次循环前检查任务状态
            const currentStatus = loadTaskStatus();
            if (currentStatus['task-1775298006539'] && currentStatus['task-1775298006539'].status === '已停止') {
                console.log('检测到停止指令，自动批量抓取任务立即终止');
                break;
            }

            const room = liveRooms[i];
            let roomId = room.id;
            
            console.log(`\n正在抓取第 ${i + 1}/${liveRooms.length} 个直播间: ${roomId}`);
            
            // 检查是否是隐私直播间
            if (roomId.includes('*') || /[★☆*]/.test(roomId)) {
                console.log(`直播间 ${roomId} 是隐私直播间，自动跳过`);
                continue;
            }
            
            try {
                // 启动直播间抓取
                const pythonExe = 'C:\\Users\\Administrator\\AppData\\Local\\Programs\\Python\\Python313\\python.exe';
                const scriptPath = path.join(path.dirname(__dirname), 'DouyinLiveWebFetcher', 'main.py');
                const command = `powershell -Command "& {& '${pythonExe}' '${scriptPath}' '${roomId}'}"`;
                
                console.log(`执行命令: ${command}`);
                
                // 使用exec执行命令
                const { exec } = require('child_process');
                await new Promise((resolve, reject) =>{
                    const process = exec(command, {
                        cwd: path.join(path.dirname(__dirname), "DouyinLiveWebFetcher"),
                        detached: false,
                        stdio: 'pipe'
                    });
                    
                    // 捕获输出
                    process.stdout.on('data', (data) => {
                        console.log(data.toString().trim());
                    });
                    
                    process.stderr.on('data', (data) => {
                        console.error(data.toString().trim());
                    });
                    
                    process.on('exit', (code) => {
                        console.log(`直播间 ${roomId} 抓取进程已退出，退出码: ${code}`);
                        resolve();
                    });
                    
                    process.on('error', (error) => {
                        console.error(`直播间 ${roomId} 抓取失败:`, error);
                        resolve(); // 继续下一个直播间
                    });
                });
                
                // 更新直播间状态
                room.status = '已抓取';
                room.lastCaptureTime = new Date().toISOString();
                
            } catch (error) {
                console.error(`抓取直播间 ${roomId} 时出错:`, error);
                room.status = '抓取失败';
            }
        }
        
        // 保存更新后的直播间列表
        fs.writeFileSync(liveRoomsFile, JSON.stringify(liveRooms, null, 2));
        console.log(`已保存更新后的直播间列表`);
        
        console.log(`\n自动批量抓取直播间任务完成`);
        
    } catch (error) {
        console.error('自动批量抓取直播间失败:', error);
        throw error;
    }
}

// 自动关注函数
async function autoFollow(interval = 5, count = 10) {
    console.log(`====================================`);
    console.log(`开始自动关注任务`);
    console.log(`关注间隔: ${interval} 秒`);
    console.log(`关注数量: ${count} 个`);
    console.log(`====================================`);
    
    // 更新状态
    executionStatus.status = '运行中';
    executionStatus.currentAction = '运行中...';
    
    // 读取筛选结果文件
    console.log(`[1/8] 读取筛选结果文件...`);
    const filterResultFile = path.join(path.dirname(__dirname), "json", "筛选结果.json");
    if (!fs.existsSync(filterResultFile)) {
        executionStatus.status = '已停止';
        throw new Error("筛选结果.json 文件不存在");
    }
    
    const filterResult = JSON.parse(fs.readFileSync(filterResultFile, "utf8"));
    if (!filterResult || !Array.isArray(filterResult)) {
        executionStatus.status = '已停止';
        throw new Error("筛选结果.json 文件格式错误");
    }
    console.log(`[1/8] 成功读取筛选结果，共 ${filterResult.length} 个用户`);
    
    // 更新总用户数
    executionStatus.totalUsers = filterResult.length;
    
    // 读取进度文件
    console.log(`[2/8] 读取进度文件...`);
        const progressFile = path.join(path.dirname(__dirname), "json", "follow-progress.json");
        let progress = 0;
        if (fs.existsSync(progressFile)) {
            try {
                const progressData = JSON.parse(fs.readFileSync(progressFile, "utf8"));
                progress = progressData.progress || 0;
                
                // 如果进度超过用户总数，重置为0
                if (progress >= filterResult.length) {
                    console.log(`[2/8] 进度 ${progress} 已超过总用户数 ${filterResult.length}，重置为0`);
                    progress = 0;
                    fs.writeFileSync(progressFile, JSON.stringify({ progress: 0 }, null, 2));
                } else {
                    console.log(`[2/8] 成功读取进度文件，上次执行到第 ${progress} 个用户`);
                }
            } catch (error) {
                console.error("[2/8] 读取进度文件失败:", error);
            }
        } else {
            console.log(`[2/8] 进度文件不存在，从第 1 个用户开始`);
        }
    
    console.log(`[3/8] 准备完成，从第 ${progress + 1} 个用户开始，共有 ${filterResult.length} 个用户`);
    
    // 启动浏览器
    console.log(`[4/8] 启动浏览器...`);
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ["--start-maximized"]
    });
    console.log(`[4/8] 浏览器启动成功`);
    
    console.log(`[5/8] 创建新页面...`);
    const page = await browser.newPage();
    console.log(`[5/8] 页面创建成功`);
    
    try {
        // 加载Cookie
        console.log(`[6/8] 加载Cookie...`);
        if (fs.existsSync(COOKIE_FILE)) {
            const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, "utf8"));
            await page.setCookie(...cookies);
            console.log(`[6/8] Cookie加载成功，共加载 ${cookies.length} 个Cookie`);
        } else {
            console.warn("[6/8] Cookie文件不存在，将使用新的浏览器实例");
        }
        
        console.log(`[7/8] 开始处理用户列表...`);
        
        let attemptCount = 0;
        
        for (let i = progress; i < filterResult.length && attemptCount < count; i++) {
            const user = filterResult[i];
            if (!user || !user.userUrl) {
                console.warn(`第 ${i + 1} 个用户数据无效，跳过`);
                continue;
            }
            
            console.log(`正在处理第 ${i + 1} 个用户: ${user.userUrl}`);
            
            try {
                // 访问用户主页
                console.log(`正在访问用户主页: ${user.userUrl}`);
                executionStatus.currentAction = '访问用户主页';
                await page.goto(user.userUrl, {
                    waitUntil: "networkidle2",
                    timeout: 60000
                });
                
                console.log('页面加载完成，等待内容渲染...');
                executionStatus.currentAction = '等待页面渲染';
                // 等待页面完全加载
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                // 处理弹框
                try {
                    console.log('检查是否有弹框需要关闭...');
                    executionStatus.currentAction = '处理页面弹框';
                    // 尝试关闭可能出现的弹框
                    const closeButtons = [
                        "button[class*='close']",
                        "button[class*='关闭']",
                        ".close-btn",
                        ".btn-close",
                        "[aria-label*='关闭']",
                        ".x1yx2hs2",  // 抖音新版关闭按钮
                        ".x1xmf6yo",  // 抖音新版关闭按钮
                        ".x193iq5w.x1q0g3np.x1a02dak.x1e5z3b5.x1qjfqp7.x1yr5g0i.x1fcty0u.x78zum5.xdt5ytf",
                        "div[role='dialog'] button"
                    ];
                    
                    for (const selector of closeButtons) {
                        try {
                            const closeButton = await page.$(selector);
                            if (closeButton) {
                                console.log(`找到弹框关闭按钮，选择器: ${selector}`);
                                await closeButton.click();
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                break;
                            }
                        } catch (error) {
                            console.warn(`尝试关闭弹框失败:`, error);
                        }
                    }
                } catch (error) {
                    console.warn(`处理弹框失败:`, error);
                }
                
                // 滚动到页面顶部，关注按钮通常在顶部
                try {
                    console.log('滚动到页面顶部...');
                    executionStatus.currentAction = '滚动到页面顶部';
                    await page.evaluate(() => {
                        window.scrollTo(0, 0);
                    });
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } catch (error) {
                    console.warn(`滚动页面失败:`, error);
                }
                
                // 增加尝试次数
                attemptCount++;
                console.log(`第 ${attemptCount} 次关注尝试`);
                
                // 更新当前执行次数
                executionStatus.currentCount = attemptCount;
                
                // ========================== 
                // 抖音 PC 版 关注按钮 终极点击 
                // ========================== 
                let clickSuccess = false; 
                let clickMethod = ''; 
                
                // 抖音关注按钮 所有真实选择器（2026最新） 
                const followSelectors = [ 
                    "[data-e2e='user-info-follow-btn']",
                    "[data-e2e='user-info-follow-button']", 
                    "[data-e2e='follow-button']", 
                    "button[data-e2e='user-info-follow-btn']",
                    ".semi-button.semi-button-primary",
                    ".semi-button-primary",
                    ".tIwhKJF7",
                    ".dGq2GnTL",
                    "button:has-text('关注')", 
                    "button:contains('关注')", 
                    ".semi-button-primary:has-text('关注')", 
                    "div[role='button']:has-text('关注')", 
                    "button[type='button']:has(span:contains('关注'))",
                    "[class*='follow']",
                    "[class*='关注']"
                ]; 
                
                let foundSelector = null; 
                let followButton = null; 
                
                console.log('开始查找关注按钮...');
                executionStatus.currentAction = '查找关注按钮';
                
                // 查找按钮 
                for (const sel of followSelectors) { 
                    try { 
                        const el = await page.$(sel); 
                        if (el) { 
                            followButton = el; 
                            foundSelector = sel; 
                            console.log("✅ 找到关注按钮：" + sel);
                            executionStatus.currentAction = '找到关注按钮';
                            break; 
                        } 
                    } catch (e) {
                        console.warn("尝试选择器失败:", e);
                    } 
                } 
                
                // 如果还是没找到，尝试使用更通用的方法
                if (!followButton) {
                    try {
                        console.log('尝试通过文本查找关注按钮...');
                        executionStatus.currentAction = '通过文本查找关注按钮';
                        // 尝试查找包含"关注"文本的按钮
                        const buttons = await page.$$('button');
                        console.log(`找到 ${buttons.length} 个按钮`);
                        
                        for (let j = 0; j < buttons.length; j++) {
                            try {
                                const text = await page.evaluate(button => button.textContent, buttons[j]);
                                if (text && text.includes('关注')) {
                                    followButton = buttons[j];
                                    console.log(`找到关注按钮，通过文本内容: "${text}"`);
                                    foundSelector = 'text:关注';
                                    executionStatus.currentAction = '通过文本找到关注按钮';
                                    break;
                                }
                            } catch (error) {
                                console.warn(`检查按钮 ${j} 失败:`, error);
                            }
                        }
                    } catch (error) {
                        console.warn(`尝试通过文本查找关注按钮失败:`, error);
                    }
                }
                
                if (!followButton) { 
                    console.log("❌ 未找到关注按钮"); 
                    executionStatus.currentAction = "未找到关注按钮";
                    // 未找到按钮，保存进度继续下一个用户
                    progress = i + 1;
                    fs.writeFileSync(progressFile, JSON.stringify({ progress }, null, 2));
                    continue;
                }
                
                // 检查按钮文本内容
                executionStatus.currentAction = '检查按钮状态';
                const buttonText = await page.evaluate(el => el.textContent.trim(), followButton);
                console.log(`关注按钮文本: "${buttonText}"`);
                
                if (buttonText === '已关注') {
                    console.log(`用户已关注，跳过: ${user.userUrl}`);
                    executionStatus.currentAction = '用户已关注，跳过';
                    // 保存进度继续下一个用户
                    progress = i + 1;
                    fs.writeFileSync(progressFile, JSON.stringify({ progress }, null, 2));
                    continue; // 跳过此用户，处理下一个
                }
                
                // 方法1：直接点击 
                try {
                    executionStatus.currentAction = '尝试点击方法1: 直接点击';
                    await followButton.click({ delay: 100 }); 
                    clickSuccess = true; 
                    clickMethod = "方法1: 直接点击";
                    console.log("✅ 方法1成功");
                } catch (e) {
                    console.warn("方法1失败:", e);
                } 
 
                // 方法2：点击内部文字 
                if (!clickSuccess) { 
                    try {
                        executionStatus.currentAction = '尝试点击方法2: 点击内部span';
                        const span = await followButton.$("span"); 
                        if (span) await span.click({ delay: 100 }); 
                        clickSuccess = true; 
                        clickMethod = "方法2: 点击内部span";
                        console.log("✅ 方法2成功");
                    } catch (e) {
                        console.warn("方法2失败:", e);
                    }
                } 
 
                // 方法3：evaluate 原生点击 
                if (!clickSuccess) { 
                    try {
                        executionStatus.currentAction = '尝试点击方法3: evaluate原生click';
                        await page.evaluate((btn) => btn.click(), followButton); 
                        clickSuccess = true; 
                        clickMethod = "方法3: evaluate原生click";
                        console.log("✅ 方法3成功");
                    } catch (e) {
                        console.warn("方法3失败:", e);
                    }
                } 
 
                // 方法4：鼠标事件模拟 
                if (!clickSuccess) { 
                    try {
                        executionStatus.currentAction = '尝试点击方法4: 鼠标事件全套';
                        await page.evaluate((btn) => { 
                            btn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); 
                            btn.dispatchEvent(new MouseEvent("mouseup", { bubbles: true })); 
                            btn.dispatchEvent(new MouseEvent("click", { bubbles: true })); 
                        }, followButton); 
                        clickSuccess = true; 
                        clickMethod = "方法4: 鼠标事件全套";
                        console.log("✅ 方法4成功");
                    } catch (e) {
                        console.warn("方法4失败:", e);
                    }
                } 
 
                // 方法5：page.click 强制点击 
                if (!clickSuccess) { 
                    try {
                        executionStatus.currentAction = '尝试点击方法5: page.click强制';
                        await page.click(foundSelector, { force: true, timeout: 3000 }); 
                        clickSuccess = true; 
                        clickMethod = "方法5: page.click强制";
                        console.log("✅ 方法5成功");
                    } catch (e) {
                        console.warn("方法5失败:", e);
                    }
                } 
 
                // 方法6：坐标点击（最稳兜底） 
                if (!clickSuccess) { 
                    try {
                        executionStatus.currentAction = '尝试点击方法6: 鼠标坐标点击';
                        const box = await followButton.boundingBox(); 
                        if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); 
                        clickSuccess = true; 
                        clickMethod = "方法6: 鼠标坐标点击";
                        console.log("✅ 方法6成功");
                    } catch (e) {
                        console.warn("方法6失败:", e);
                    }
                } 
 
                // 方法7：滚动到视图再点 
                if (!clickSuccess) { 
                    try {
                        executionStatus.currentAction = '尝试点击方法7: 滚动视图点击';
                        await followButton.scrollIntoViewIfNeeded(); 
                        await new Promise(resolve => setTimeout(resolve, 300)); 
                        await followButton.click({ force: true }); 
                        clickSuccess = true; 
                        clickMethod = "方法7: 滚动视图点击";
                        console.log("✅ 方法7成功");
                    } catch (e) {
                        console.warn("方法7失败:", e);
                    }
                } 
 
                if (clickSuccess) { 
                    console.log("✅ 关注成功：" + clickMethod); 
                    executionStatus.currentAction = "关注成功：" + clickMethod; 
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // 保存进度
                    progress = i + 1;
                    fs.writeFileSync(progressFile, JSON.stringify({ progress }, null, 2));
                    console.log(`进度保存成功，当前进度: ${progress}`);
                } else { 
                    console.log("❌ 所有点击方式都失败"); 
                    executionStatus.currentAction = "关注失败";
                    // 关注失败，保存进度继续下一个用户
                    progress = i + 1;
                    fs.writeFileSync(progressFile, JSON.stringify({ progress }, null, 2));
                }
                
            } catch (error) {
                console.error(`处理用户 ${user.userUrl} 失败:`, error);
                
                // 保存进度
                progress = i + 1;
                fs.writeFileSync(progressFile, JSON.stringify({ progress }, null, 2));
            }
            
            // 如果不是最后一个用户，等待指定的时间间隔
            if (i < filterResult.length - 1 && attemptCount < count - 1) {
                console.log(`等待 ${interval} 秒后继续下一个用户...`);
                executionStatus.currentAction = `等待 ${interval} 秒...`;
                
                // 分多次等待，每次等待1秒，以便前端能够更新状态
                for (let j = 0; j < interval; j++) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
                executionStatus.currentAction = '准备处理下一个用户';
            }
        }
        
        console.log(`自动关注完成，共尝试 ${attemptCount} 次`);
        
        // 更新状态为已停止
        executionStatus.status = 'stopped';
        
        // 不要关闭浏览器，让用户手动关闭
        console.log("自动关注已完成，浏览器窗口保持打开状态");
        
        return {
            success: true,
            attemptCount,
            progress
        };
        
    } catch (error) {
        console.error("自动关注失败:", error);
        // 更新状态为已停止
        executionStatus.status = 'stopped';
        // 发生错误时也不关闭浏览器，让用户查看错误
        throw error;
    }
}

// 自动关注路由
app.get("/auto-follow", async (req, res) => {
    try {
        const interval = parseInt(req.query.interval) || 5;
        const count = parseInt(req.query.count) || 10;
        
        const result = await autoFollow(interval, count);
        
        res.json({
            success: true,
            message: `自动关注完成，共关注 ${result.followedCount} 个用户，下次从第 ${result.progress + 1} 个开始`,
            data: result
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// 获取执行状态路由
app.get("/get-status", async (req, res) => {
    try {
        res.json({
            success: true,
            data: executionStatus
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// 全局过滤状态
let filterStatus = {
    status: '未开始',
    currentAction: '等待开始',
    totalUsers: 0,
    resultCount: 0
};

// 弹幕抓取类
class DouyinDanmakuAutomation {
            constructor() {
                this.browser = null;
                this.page = null;
                this.danmakuCache = new Set();
                this.userUrlCache = new Set();
                this.outputFile = path.join(path.dirname(__dirname), 'json', '筛选结果.json');
                this.danmakuCount = 0;
            }

    async start(roomUrl) {
        try {
            console.log('=== 启动抖音弹幕抓取 ===');
            
            // 读取关键词文件
            let keywords = [];
            const keywordsFile = path.join(path.dirname(__dirname), 'keywords.json');
            if (fs.existsSync(keywordsFile)) {
                const keywordsContent = fs.readFileSync(keywordsFile, 'utf8');
                const keywordsConfig = JSON.parse(keywordsContent);
                keywords = keywordsConfig.keywords || [];
            }
            console.log(`🔍 关键词过滤：${keywords.length > 0 ? keywords.join(', ') : '无关键词'}`);
            
            // 启动浏览器
            this.browser = await puppeteer.launch({
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
                        this.lastKeywordTime = Date.now(); // 重置关键词计时器
                    } catch (error) {
                        console.error('解析弹幕数据失败:', error);
                    }
                }
                
                // 检查是否触发超时
                if (text.includes('TIMEOUT_TRIGGERED') && !this._stopped) {
                    this._stopped = true;
                    console.log('⚠️ 检测到关键词超时，自动停止并关闭浏览器');
                    this.stop(); // 直接关闭浏览器
                    isDanmakuRunning = false;
                    this.isTimedOut = true;
                }
                
                // 【新增】检查是否直播间关播
                if (text.includes('STREAM_ENDED') && !this._stopped) {
                    this._stopped = true;
                    console.log('🛑 检测到直播间已关播，自动停止并关闭浏览器');
                    this.stop(); // 直接关闭浏览器
                    isDanmakuRunning = false;
                    this.isTimedOut = true;
                }
            });

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
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 等待页面元素加载
            console.log('开始等待页面元素加载...');
            await this.page.waitForFunction(() => {
                return document.querySelector('video') || 
                       document.querySelector('[class*="chatroom"]') ||
                       document.querySelector('[data-e2e="chat-item"]');
            }, { timeout: 30000 });
            console.log('✅ 找到视频或聊天房间元素');

            // 等待React组件渲染
            console.log('等待React组件渲染...');
            let waitTime = 10000;
            while (waitTime > 0) {
                console.log(`剩余等待时间: ${waitTime}ms`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                waitTime -= 1000;
                
                const hasReactProps = await this.page.evaluate(() => {
                    const elements = document.querySelectorAll('*');
                    for (let element of elements) {
                        const attributes = element.attributes;
                        for (let attr of attributes) {
                            if (attr.name.startsWith('__react')) {
                                return true;
                            }
                        }
                    }
                    return false;
                });
                
                if (hasReactProps) {
                    console.log('✅ React组件已渲染');
                    break;
                }
            }

            // 注入JavaScript来捕获弹幕，传入关键词和超时设置
            const settingsFilePath = path.join(path.dirname(__dirname), 'json', 'settings.json'); // 修复路径
            let filterWords = [], timeout = 180, excludeWords = [];
            if (fs.existsSync(settingsFilePath)) {
                const s = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
                filterWords = s.filterWords || [];
                timeout = s.keywordTimeout || 180;
                excludeWords = s.excludeWords || []; // 【新增】排除词
            }

            await this.page.evaluate((filterWords, timeout, excludeWords) => {
                window._KEYWORDS = filterWords || [];
                window._TIMEOUT = timeout * 1000; // 转换为毫秒
                window._LAST_KEYWORD_TIME = Date.now();
                window._EXCLUDE_WORDS = excludeWords || []; // 【新增】排除词
                
                // 定义发送弹幕数据的函数（带关键词过滤和排除词）
                window.sendDanmaku = function(danmaku) {
                    // ... (保留原有的过滤逻辑)
                    if (!danmaku.user.url || danmaku.user.url === '') return;
                    if (danmaku.content.trim() === '为主播点赞了') return;
                    
                    // 【优化1】排除词检查（优先级最高）
                    const contentLower = danmaku.content.toLowerCase();
                    if (window._EXCLUDE_WORDS && window._EXCLUDE_WORDS.length > 0) {
                        const isExcluded = window._EXCLUDE_WORDS.some(word => contentLower.includes(word.toLowerCase()));
                        if (isExcluded) {
                            console.log(`⛔ 排除词过滤: ${danmaku.content}`);
                            return;
                        }
                    }
                    
                    if (!window.userUrlCache) window.userUrlCache = new Set();
                    if (window.userUrlCache.has(danmaku.user.url)) return;
                    window.userUrlCache.add(danmaku.user.url);
            
                    // 关键词过滤
                    let matched = false;
                    if (window._KEYWORDS.length > 0) {
                        matched = window._KEYWORDS.some(keyword => contentLower.includes(keyword.toLowerCase()));
                        if (!matched) return;
                    }
                    
                    // 命中关键词，重置计时器
                    window._LAST_KEYWORD_TIME = Date.now();
                    console.log('SENDING_DANMAKU:' + JSON.stringify(danmaku));
                };
                
                // 检查是否超时的定时器
                setInterval(() => {
                    if (Date.now() - window._LAST_KEYWORD_TIME > window._TIMEOUT) {
                        console.log('TIMEOUT_TRIGGERED: 关键词超时，准备切换直播间');
                    }
                }, 5000);

                // 【新增+优化3】检测直播间是否关播的定时器
                if (!window._ENDED_CHECK_STARTED) {
                    window._ENDED_CHECK_STARTED = true;
                    
                    setInterval(() => {
                        // 【策略1】检查页面是否出现关播提示文字
                        const bodyText = document.body.innerText || '';
                        const endedKeywords = ['直播已结束', '主播已离开', '直播已关闭', '直播回放', '主播已下播'];
                        const isEndedByText = endedKeywords.some(keyword => bodyText.includes(keyword));
                        
                        // 【策略2】检查是否有关播特有的 DOM 结构（根据实际页面结构）
                        const endedDivs = document.querySelectorAll('div');
                        let isEndedByDOM = false;
                        for (const div of endedDivs) {
                            if (div.innerText && div.innerText.trim() === '直播已结束') {
                                isEndedByDOM = true;
                                break;
                            }
                        }
                        
                        // 【策略3】检查弹幕容器是否存在
                        const chatSelectors = [
                            '.webcast-chatroom___container',
                            '.webcast-chatroom___list',
                            '[class*="chatroom"]',
                            '[class*="barrage"]',
                            '[class*="danmaku"]',
                            '[data-e2e="chat-input"]'
                        ];
                        let chatContainerExists = false;
                        for (const sel of chatSelectors) {
                            if (document.querySelector(sel)) {
                                chatContainerExists = true;
                                break;
                            }
                        }
                        
                        // 检测到关播（不刷新，直接标记完成，避免注入脚本状态丢失）
                        if (isEndedByText || isEndedByDOM || !chatContainerExists) {
                            console.log(`STREAM_ENDED: 检测到关播 (文字=${isEndedByText}, DOM=${isEndedByDOM}, 容器=${chatContainerExists})`);
                            window._STREAM_ENDED = true;
                        } else {
                            console.log(`❤️ 心跳检测: 直播中`);
                        }
                    }, 20000); // 【性能优化】20秒检测一次关播
                }
                
                // ... (保留原有的 refreshKeywords 和 captureDanmaku 逻辑)
                
                // 定期获取最新关键词的函数
                window.refreshKeywords = async function() {
                    try {
                        const response = await fetch('/api/keywords');
                        const data = await response.json();
                        if (data.success) {
                            window._KEYWORDS = data.keywords || [];
                            console.log(`✅ 已更新关键词: ${window._KEYWORDS.join(', ')}`);
                        }
                    } catch (error) {
                        console.error('更新关键词失败:', error);
                    }
                };
                
                // 每30秒更新一次关键词
                setInterval(window.refreshKeywords, 30000);

                // 递归搜索函数，查找包含用户信息的对象（从备份文件提取的成功逻辑）
                function searchUserData(obj, path = '') {
                    if (!obj || typeof obj !== 'object') return null;
                    
                    // 检查message.payload.user路径
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

                // 捕获弹幕的主函数
                function captureDanmaku() {
                    try {
                        console.log('=== 捕获扫描开始 ===');
                        
                        // 【性能优化】只使用第一个成功的选择器，避免重复扫描
                        if (!window._ACTIVE_SELECTOR) {
                            // 第一次运行，测试所有选择器
                            const selectors = [
                                '[class*="chatroom"] [class*="item"]', // 最常用
                                '.webcast-chatroom___item',  // 旧版
                                '[class*="ChatItem"]', // 新版 React 结构
                                '[class*="message"]', // 消息类
                                '[data-e2e*="barrage"]', // 抖音 e2e 测试属性
                                '.chat-item' // 通用类名
                            ];
                            
                            for (const selector of selectors) {
                                try {
                                    const elements = document.querySelectorAll(selector);
                                    if (elements.length > 0) {
                                        window._ACTIVE_SELECTOR = selector;
                                        console.log(`✅ 找到可用选择器: ${selector} (${elements.length}个元素)`);
                                        break;
                                    }
                                } catch (e) {
                                    console.log(`选择器 ${selector} 无效，跳过`);
                                }
                            }
                            
                            if (!window._ACTIVE_SELECTOR) {
                                console.log('⚠️ 未找到弹幕元素，跳过本次扫描');
                                return;
                            }
                        }
                        
                        // 使用已确认的选择器进行扫描
                        const selector = window._ACTIVE_SELECTOR;
                        const elements = document.querySelectorAll(selector);
                        console.log(`选择器 ${selector}: ${elements.length} 个元素`);
                        
                        if (elements.length > 0) {
                            // 【调试】打印前3个元素的完整 HTML 结构
                            for (let i = 0; i < Math.min(3, elements.length); i++) {
                                console.log(`[DEBUG] 元素${i+1} HTML:`, elements[i].outerHTML.substring(0, 500));
                                console.log(`[DEBUG] 元素${i+1} text:`, elements[i].innerText);
                                console.log(`[DEBUG] 元素${i+1} class:`, elements[i].className);
                            }
                        }
                        
                        for (const element of elements) {
                            if (element._processed) continue;
                            element._processed = true;
                            
                            try {
                                // 提取明文：抖音已经解密好的文本
                                const text = element.innerText.trim();
                                if (!text || text.length < 2) continue;
                                
                                console.log(`找到文本: ${text}`);
                                
                                // 拆分用户名和内容
                                let nickname = '未知用户';
                                let content = text;
                                
                                // 尝试拆分昵称和内容
                                const parts = text.split(/：|:/);
                                if (parts.length >= 2) {
                                    nickname = parts[0].trim();
                                    content = parts.slice(1).join('：').trim();
                                } else {
                                    // 如果没有冒号，可能是进场提示或其他系统消息
                                    console.log(`❌ 跳过无冒号文本: ${text}`);
                                    continue;
                                }
                                
                                // 【精准过滤】排除系统消息
                                const systemPatterns = [
                                    /\s+来了$/,           // "XXX 来了"
                                    /^为主播点赞了$/,     // "为主播点赞了"
                                    /\s+加入了粉丝团$/,   // "XXX 加入了粉丝团"
                                    /\s+送出/,            // "XXX 送出礼物"
                                    /\s+点亮了/,          // "XXX 点亮了粉丝牌"
                                    /\s+关注了主播$/,     // "XXX 关注了主播"
                                    /\s+分享了直播间$/    // "XXX 分享了直播间"
                                ];
                                
                                const isSystemMessage = systemPatterns.some(pattern => pattern.test(text));
                                if (isSystemMessage) {
                                    console.log(`❌ 跳过系统消息: ${text}`);
                                    continue;
                                }
                                
                                // 确保内容不为空
                                if (!content || content.length < 1) continue;
                                    
                                    // 提取用户主页链接或ID（参照成功代码的逻辑）
                                    let userId = null;
                                    let userUrl = '';
                                    
                                    // 策略1：查找整个弹幕项中的所有链接（更宽松的匹配）
                                    const allLinks = element.querySelectorAll('a');
                                    if (allLinks.length > 0) {
                                        for (const link of allLinks) {
                                            const href = link.href;
                                            if (href && (href.includes('douyin.com/user/') || href.includes('/user/'))) {
                                                userUrl = href;
                                                // 确保链接是完整的URL
                                                if (userUrl.startsWith('//')) {
                                                    userUrl = 'https:' + userUrl;
                                                }
                                                console.log(`找到用户主页链接: ${userUrl}`);
                                                break;
                                            }
                                        }
                                    }
                                    
                                    // 策略2：尝试从头像元素的父元素查找链接
                                    if (!userUrl) {
                                        const avatarElement = element.querySelector('img, [class*="avatar"], [data-e2e="barrage-avatar"]');
                                        if (avatarElement) {
                                            let parent = avatarElement.parentElement;
                                            let depth = 5;
                                            while (parent && depth > 0) {
                                                const parentLinks = parent.querySelectorAll('a');
                                                for (const link of parentLinks) {
                                                    const href = link.href;
                                                    if (href && (href.includes('douyin.com/user/') || href.includes('/user/'))) {
                                                        userUrl = href;
                                                        if (userUrl.startsWith('//')) {
                                                            userUrl = 'https:' + userUrl;
                                                        }
                                                        console.log(`从头像父元素找到用户主页链接: ${userUrl}`);
                                                        break;
                                                    }
                                                }
                                                if (userUrl) break;
                                                parent = parent.parentElement;
                                                depth--;
                                            }
                                        }
                                    }
                                    
                                    // 策略3：尝试从头像URL提取用户信息
                                    const avatarElement = element.querySelector('img, [class*="avatar"], [data-e2e="barrage-avatar"]');
                                    if (avatarElement && avatarElement.src && !userUrl) {
                                        const avatarSrc = avatarElement.src;
                                        console.log('头像URL:', avatarSrc);
                                        
                                        // 尝试从头像URL中提取secUid或用户ID
                                        const secUidMatch = avatarSrc.match(/sec_uid=([^&]+)/);
                                        if (secUidMatch) {
                                            const secUid = secUidMatch[1];
                                            userUrl = `https://www.douyin.com/user/${secUid}`;
                                            console.log('从头像URL提取到secUid:', secUid);
                                        }
                                    }
                                    
                                    // 策略4：从React数据结构中提取用户信息（从备份文件提取的成功逻辑）
                                    if (!userUrl) {
                                        try {
                                            console.log('开始尝试从React数据提取用户信息...');
                                            
                                            // 查找React属性
                                            const reactProps = Object.keys(element).filter(k => k.startsWith("__react"));
                                            console.log(`找到React属性: ${reactProps.join(', ')}`);
                                            
                                            if (reactProps.length >0) {
                                                for (const prop of reactProps) {
                                                    try {
                                                        const reactData = element[prop];
                                                        console.log(`属性 ${prop} 的类型:`, typeof reactData);
                                                        
                                                        // 搜索memoizedProps中的用户信息
                                                        if (reactData.memoizedProps) {
                                                            const userData = searchUserData(reactData.memoizedProps, 'memoizedProps');
                                                            if (userData && userData.id && userData.sec_uid) {
                                                                userId = userData.id;
                                                                const secUid = userData.sec_uid;
                                                                userUrl = `https://www.douyin.com/user/${secUid}`;
                                                                console.log(`✅ 成功获取用户信息 - ID: ${userId}, secUid: ${secUid}, 主页: ${userUrl}`);
                                                                break;
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
                                                                break;
                                                            }
                                                        }
                                                    } catch (e) {
                                                        console.log(`解析React属性 ${prop} 错误:`, e.message);
                                                    }
                                                }
                                            } else {
                                                console.log('未找到React属性');
                                            }
                                        } catch (error) {
                                            console.error('从React数据提取用户信息失败:', error);
                                        }
                                    }
                                    
                                    console.log(`弹幕内容: ${content}, 昵称: ${nickname}, 用户URL: ${userUrl}`);
                                    
                                    // 检查内容是否有效
                                    if (!content || content.length < 2) {
                                        console.log('❌ 弹幕内容为空或太短');
                                        return;
                                    }
                                    
                                    // 【优化1】创建弹幕唯一标识（昵称+内容+时间戳精确到分钟，5分钟过期）
                                    const timestamp = Math.floor(Date.now() / 60000); // 精确到分钟
                                    const danmakuKey = `${nickname}:${content}:${timestamp}`;
                                    
                                    // 检查是否已经处理过这条弹幕
                                    if (!window.danmakuCache) {
                                        window.danmakuCache = new Map(); // 改用 Map 存储过期时间
                                    }
                                    
                                    if (window.danmakuCache.has(danmakuKey)) {
                                        console.log(`❌ 重复弹幕，跳过: ${nickname}:${content}`);
                                        return;
                                    }
                                    
                                    // 添加到缓存，5分钟后自动过期
                                    window.danmakuCache.set(danmakuKey, Date.now());
                                    setTimeout(() => window.danmakuCache.delete(danmakuKey), 5 * 60 * 1000);
                                    
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
                                    
                                    console.log('发送弹幕数据:', danmaku);
                                    window.sendDanmaku(danmaku);
                                } catch (error) {
                                    console.error('处理弹幕元素失败:', error);
                                    continue;
                                }
                            } // 关闭 elements 循环
                        
                        console.log('=== 捕获扫描结束 ===');
                    } catch (error) {
                        console.error('捕获弹幕失败:', error);
                    }
                }

                // 启动定时捕获
                setInterval(captureDanmaku, 1000);
                console.log('✅ 弹幕捕获已启动，每秒执行一次');
            });

        } catch (error) {
            console.error('启动弹幕抓取失败:', error);
            throw error;
        }
    }

    saveDanmakuToFile(danmaku) {
        try {
            const timestamp = new Date().toLocaleTimeString('zh-CN');
            
            // 实时在终端输出弹幕信息
            console.log(`\n${'='.repeat(60)}`);
            console.log(`📺 [${timestamp}] 弹幕来袭！`);
            console.log(`👤 用户: ${danmaku.user.nickname}`);
            console.log(`💬 内容: ${danmaku.content}`);
            console.log(`🔗 用户主页: ${danmaku.user.url}`);
            console.log(`${'='.repeat(60)}`);
            
            // 读取关键词文件（读取json目录下的关键词文件）
            let keywords = [];
            const keywordsFile = path.join(path.dirname(__dirname), 'json', 'keywords.json');
            
            if (fs.existsSync(keywordsFile)) {
                const keywordsContent = fs.readFileSync(keywordsFile, 'utf8');
                const keywordsConfig = JSON.parse(keywordsContent);
                keywords = keywordsConfig.keywords || [];
            } else {
                // 尝试读取根目录下的关键词文件作为备用
                const backupKeywordsFile = path.join(path.dirname(__dirname), 'keywords.json');
                if (fs.existsSync(backupKeywordsFile)) {
                    const keywordsContent = fs.readFileSync(backupKeywordsFile, 'utf8');
                    const keywordsConfig = JSON.parse(keywordsContent);
                    keywords = keywordsConfig.keywords || [];
                }
            }

            // 如果有关键词，进行过滤
            let shouldSave = true;
            let matchedKeyword = null; // 移到外层，确保作用域覆盖全函数
            if (keywords.length > 0) {
                const content = danmaku.content.toLowerCase();
                const nickname = danmaku.user.nickname.toLowerCase();
                
                // 检查内容或昵称是否包含关键词
                const containsKeyword = keywords.some(keyword => {
                    const keywordLower = keyword.toLowerCase();
                    const contentMatch = content.includes(keywordLower);
                    const nicknameMatch = nickname.includes(keywordLower);
                    if (contentMatch || nicknameMatch) {
                        matchedKeyword = keyword;
                        return true;
                    }
                    return false;
                });
                
                if (!containsKeyword) {
                    console.log(`❌ 未命中关键词，跳过保存`);
                    shouldSave = false;
                } else {
                    console.log(`✅ 🔍 命中关键词: "${matchedKeyword}"`);
                }
            } else {
                console.log(`⚠️  无关键词，直接保存`);
            }

            if (!shouldSave) return;

            // 基于userUrl的过滤：同一个用户只记录一条
            const userUrl = danmaku.user.url || '';
            if (userUrl && this.userUrlCache.has(userUrl)) {
                console.log(`❌ 用户已存在，跳过保存`);
                return;
            }

            // 【新增】通过 WebSocket 广播弹幕到前端
            broadcastDanmaku(danmaku, matchedKeyword);

            // 读取现有数据
            let existingData = [];
            if (fs.existsSync(this.outputFile)) {
                try {
                    const content = fs.readFileSync(this.outputFile, 'utf8');
                    existingData = JSON.parse(content);
                } catch (parseError) {
                    console.error('解析现有文件失败，重新创建:', parseError);
                    existingData = [];
                }
            }

            // 转换为用户要求的格式
            const saveData = {
                text: danmaku.content,
                userUrl: userUrl
            };
            existingData.push(saveData);
            
            // 添加到用户缓存
            if (userUrl) {
                this.userUrlCache.add(userUrl);
            }

            // 写入文件
            fs.writeFileSync(this.outputFile, JSON.stringify(existingData, null, 2));
            this.danmakuCount++;
            console.log(`💾 已保存到文件 (累计: ${this.danmakuCount}条)`);
        } catch (error) {
            console.error('保存弹幕数据失败:', error);
        }
    }

    async stop() {
        try {
            if (this.page) await this.page.close();
            if (this.browser) await this.browser.close();
            console.log('✅ 弹幕抓取已停止');
        } catch (error) {
            console.error('停止弹幕抓取失败:', error);
        }
    }
}

// 获取关键词路由
app.get("/get-keywords", async (req, res) => {
    try {
        const { category } = req.query;
        let keywords = [];
        
        if (category) {
            const categoryFile = path.join(keywordFilesDir, `${category}.txt`);
            if (fs.existsSync(categoryFile)) {
                const content = fs.readFileSync(categoryFile, { encoding: 'utf8' });
                keywords = content.trim().split('\n').filter(word => word.trim());
            }
        }
        
        res.json({
            success: true,
            data: { keywords }
        });
        
    } catch (error) {
        console.error('获取关键词失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 添加关键词路由
app.post("/add-keyword", async (req, res) => {
    try {
        const { keyword, category } = req.body;
        if (!keyword) {
            return res.json({ success: false, error: '关键词不能为空' });
        }
        if (!category) {
            return res.json({ success: false, error: '请指定类别' });
        }
        
        const categoryFile = path.join(keywordFilesDir, `${category}.txt`);
        
        // 确保文件存在
        if (!fs.existsSync(categoryFile)) {
            fs.writeFileSync(categoryFile, '', { encoding: 'utf8' });
        }
        
        // 读取现有关键词
        const content = fs.readFileSync(categoryFile, { encoding: 'utf8' });
        let keywords = content.trim().split('\n').filter(word => word.trim());
        
        // 检查关键词是否已存在
        if (!keywords.includes(keyword)) {
            keywords.push(keyword);
            fs.writeFileSync(categoryFile, keywords.join('\n'), { encoding: 'utf8' });
        }
        
        res.json({
            success: true,
            message: '关键词添加成功'
        });
        
    } catch (error) {
        console.error('添加关键词失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 删除关键词路由
app.post("/delete-keyword", async (req, res) => {
    try {
        const { keyword, category } = req.body;
        if (!keyword) {
            return res.json({ success: false, error: '关键词不能为空' });
        }
        if (!category) {
            return res.json({ success: false, error: '请指定类别' });
        }
        
        const categoryFile = path.join(keywordFilesDir, `${category}.txt`);
        
        if (!fs.existsSync(categoryFile)) {
            return res.json({ success: false, error: '关键词文件不存在' });
        }
        
        // 读取现有关键词
        const content = fs.readFileSync(categoryFile, { encoding: 'utf8' });
        let keywords = content.trim().split('\n').filter(word => word.trim());
        
        // 删除关键词
        keywords = keywords.filter(k => k !== keyword);
        fs.writeFileSync(categoryFile, keywords.join('\n'), { encoding: 'utf8' });
        
        res.json({
            success: true,
            message: '关键词删除成功'
        });
        
    } catch (error) {
        console.error('删除关键词失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 清空关键词路由
app.post("/clear-keywords", async (req, res) => {
    try {
        const { category } = req.body;
        
        if (!category) {
            return res.json({ success: false, error: '请指定类别' });
        }
        
        const keywordsConfigPath = path.join(path.dirname(__dirname), "json", "keywords.json");
        
        if (!fs.existsSync(keywordsConfigPath)) {
            return res.json({ success: false, error: '关键词配置文件不存在' });
        }
        
        const keywordsConfig = JSON.parse(fs.readFileSync(keywordsConfigPath, 'utf8'));
        
        if (!keywordsConfig.categories) {
            keywordsConfig.categories = {};
        }
        
        keywordsConfig.categories[category] = [];
        fs.writeFileSync(keywordsConfigPath, JSON.stringify(keywordsConfig, null, 2));
        
        res.json({ success: true, message: '关键词已清空' });
    } catch (error) {
        console.error('清空关键词失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 保存直播间路由
app.post("/api/save-live-room", async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.json({ success: false, error: '直播间链接不能为空' });
        }
        
        const liveRoomsFile = path.join(path.dirname(__dirname), "json", "live-rooms.json");
        let liveRooms = [];
        
        if (fs.existsSync(liveRoomsFile)) {
            const content = fs.readFileSync(liveRoomsFile, 'utf8');
            liveRooms = JSON.parse(content);
        }
        
        // 检查是否已存在
        const exists = liveRooms.some(room => room.url === url);
        if (!exists) {
            liveRooms.push({
                url: url,
                savedAt: new Date().toISOString()
            });
            fs.writeFileSync(liveRoomsFile, JSON.stringify(liveRooms, null, 2));
        }
        
        res.json({ success: true, message: '直播间保存成功' });
        
    } catch (error) {
        console.error('保存直播间失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 获取已保存直播间路由
app.get("/api/get-saved-live-rooms", async (req, res) => {
    try {
        const liveRoomsFile = path.join(path.dirname(__dirname), "json", "live-rooms.json");
        let liveRooms = [];
        
        if (fs.existsSync(liveRoomsFile)) {
            const content = fs.readFileSync(liveRoomsFile, 'utf8');
            liveRooms = JSON.parse(content);
        }
        
        res.json({ success: true, data: liveRooms });
        
    } catch (error) {
        console.error('获取已保存直播间失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 搜索直播间路由
app.get("/api/search-live-rooms", async (req, res) => {
    try {
        const { keyword } = req.query;
        if (!keyword) {
            return res.json({ success: false, error: '搜索关键词不能为空' });
        }
        
        console.log(`正在搜索关键词: ${keyword}`);
        
        const liveRooms = [];
        
        // 从文件中读取请求头信息
        const redFile = path.join(path.dirname(__dirname), "red.txt");
        let requestHeaders = {};
        
        if (fs.existsSync(redFile)) {
            const content = fs.readFileSync(redFile, 'utf8');
            const lines = content.split('\n');
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line && !line.includes('Request URL') && !line.includes('Request Method') && !line.includes('Status Code')) {
                    const nextLine = lines[i + 1]?.trim();
                    if (nextLine) {
                        requestHeaders[line] = nextLine;
                        i++;
                    }
                }
            }
        }
        
        // 使用真实的抖音搜索API
        const searchUrl = `https://www.douyin.com/aweme/v1/web/live/search/?device_platform=webapp&aid=6383&channel=channel_pc_web&search_channel=aweme_live&keyword=${encodeURIComponent(keyword)}&search_source=normal_search&query_correct_type=1&is_filter_search=0&from_group_id=&disable_rs=0&offset=0&count=15&need_filter_settings=1&list_type=single&pc_search_top_1_params=%7B%22enable_ai_search_top_1%22%3A1%7D&update_version_code=170400&pc_client_type=1&pc_libra_divert=Windows&support_h265=1&support_dash=1&cpu_core_num=20&version_code=170400&version_name=17.4.0&cookie_enabled=true&screen_width=3440&screen_height=1440&browser_language=zh-CN&browser_platform=Win32&browser_name=Chrome&browser_version=146.0.0.0&browser_online=true&engine_name=Blink&engine_version=146.0.0.0&os_name=Windows&os_version=10&device_memory=8&platform=PC&downlink=10&effective_type=4g&round_trip_time=50&webid=7622711207275120191`;
        
        // 使用axios发送请求
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': requestHeaders['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
                'Accept': requestHeaders['accept'] || 'application/json, text/plain, */*',
                'Accept-Language': requestHeaders['accept-language'] || 'zh-CN,zh;q=0.9',
                'Referer': requestHeaders['referer'] || 'https://www.douyin.com/search/%E5%81%A5%E8%BA%AB?type=live',
                'Cookie': requestHeaders['cookie'] || '',
                'sec-ch-ua': requestHeaders['sec-ch-ua'] || '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
                'sec-ch-ua-mobile': requestHeaders['sec-ch-ua-mobile'] || '?0',
                'sec-ch-ua-platform': requestHeaders['sec-ch-ua-platform'] || '"Windows"',
                'sec-fetch-dest': requestHeaders['sec-fetch-dest'] || 'empty',
                'sec-fetch-mode': requestHeaders['sec-fetch-mode'] || 'cors',
                'sec-fetch-site': requestHeaders['sec-fetch-site'] || 'same-origin',
                'uifid': requestHeaders['uifid'] || 'ed3eadd74fe8fd7fe8cc39b2f8425a87324d41d3f6a0cfdc014da4c26c6540513141af70d5bc26d22eecb247108cf73ab9279e5145e78ac3a2f2b9142bf0765d926c580e8b901f822c7a8c9b1f58174567d7c476eab1a80eed1f9057edbebb51a0ddf5a0c4153ae8d3ab1c8f05f05f8d7b3ab664e9f98cf534d1c245ff358d389762b07338b6be0451b5d24a21502d23cdb4eaf52752b812b7ef71171fac2f9a',
                'host': 'www.douyin.com'
            }
        });
        
        console.log('API返回数据:', JSON.stringify(response.data, null, 2));
        
        // 解析API返回的数据
        if (response.data && response.data.data) {
            console.log('数据结构:', Object.keys(response.data.data));
            
            // 直接遍历数组
            for (const key in response.data.data) {
                const item = response.data.data[key];
                
                // 打印整个item的结构
                console.log(`Item ${key} keys:`, Object.keys(item));
                
                // 从lives字段获取房间信息
                if (item && item.lives) {
                    console.log(`Item ${key} lives type:`, typeof item.lives);
                    console.log(`Item ${key} lives keys:`, Object.keys(item.lives));
                    
                    const liveData = item.lives;
                    
                    // 打印liveData的完整结构，寻找web_rid字段
                    console.log(`liveData完整结构:`, JSON.stringify(liveData, null, 2));
                    
                    // 从author字段获取房间信息
                    if (liveData.author && liveData.author.room_id) {
                        const searchRoomId = liveData.author.room_id;
                        const title = liveData.video_text || liveData.author.nickname || '未知标题';
                        
                        // 尝试从搜索API响应数据中提取真实的直播间ID
                        let realRoomId = searchRoomId;
                        
                        // 调用info_by_scene API获取完整的直播间信息
                        try {
                            const infoUrl = `https://live.douyin.com/webcast/room/info_by_scene/?aid=6383&app_name=douyin_web&live_id=1&device_platform=web&language=zh-CN&cookie_enabled=true&screen_width=3440&screen_height=1440&browser_language=zh-CN&browser_platform=Win32&browser_name=Chrome&browser_version=146.0.0.0&room_id=${searchRoomId}&scene=douyin_pc_search&channel=channel_pc_web&region=cn&device_id=7622711207275120191&device_type=web_device&os_version=web&version_code=170400&webcast_sdk_version=2450&ignoreToast=true&verifyFp=verify_mnbyke2b_l8ygReik_i95E_4fVx_AArE_MrnT9Dvcu7cI&fp=verify_mnbyke2b_l8ygReik_i95E_4fVx_AArE_MrnT9Dvcu7cI&msToken=Rcxz4bpDLRF0W4KLZBrbpJ4OB6pDrWao_hmjgWbBvKwmKzbR8d8P4UA1NzNRHBVzsZoRmBawVjACb1BdXXa1qRb8I4-ZRuf2X6aLloRbyCN_35c5hERWPSQBzfGEslCn0os-FsxhTcgs9xrrvWmsHma4m1F8j3CS1FI-uYIYdCGv&a_bogus=QysVgHUEdNR5aVKGmOsme4nlT0IANs8yCMi2Sn%2FPePuPP1FG%2F8Nu8NaZcoohbO94P8pTiFn7WdPAOnxcm4XhZqNkKmZDuiJR04dnV78LZZHdYBi293RQevSEFv4eM8sYK%2F%2FHEawXWUXr2LQ3irOiA5-G9cFH-OYpbNqbp%2Fbcj9WrVWjHnxdGedJDuhXU`;
                            
                            const infoResponse = await axios.get(infoUrl, {
                                headers: {
                                    'User-Agent': requestHeaders['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
                                    'Accept': requestHeaders['accept'] || 'application/json, text/plain, */*',
                                    'Accept-Language': requestHeaders['accept-language'] || 'zh-CN,zh;q=0.9',
                                    'Referer': requestHeaders['referer'] || 'https://www.douyin.com/',
                                    'Cookie': requestHeaders['cookie'] || '',
                                    'sec-ch-ua': requestHeaders['sec-ch-ua'] || '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
                                    'sec-ch-ua-mobile': requestHeaders['sec-ch-ua-mobile'] || '?0',
                                    'sec-ch-ua-platform': requestHeaders['sec-ch-ua-platform'] || '"Windows"',
                                    'sec-fetch-dest': requestHeaders['sec-fetch-dest'] || 'empty',
                                    'sec-fetch-mode': requestHeaders['sec-fetch-mode'] || 'cors',
                                    'sec-fetch-site': requestHeaders['sec-fetch-site'] || 'same-site',
                                    'x-secsdk-csrf-token': 'DOWNGRADE'
                                }
                            });
                            
                            console.log(`info_by_scene API返回数据:`, JSON.stringify(infoResponse.data, null, 2));
                            
                            if (infoResponse.data && infoResponse.data.data) {
                                const roomInfo = infoResponse.data.data;
                                
                                // 检查roomInfo中是否有web_rid字段
                                if (roomInfo.owner && roomInfo.owner.web_rid) {
                                    realRoomId = roomInfo.owner.web_rid.toString();
                                    console.log(`从info_by_scene API的owner.web_rid中提取到真实直播间ID: ${realRoomId}`);
                                } else if (roomInfo.web_rid) {
                                    realRoomId = roomInfo.web_rid.toString();
                                    console.log(`从info_by_scene API的web_rid中提取到真实直播间ID: ${realRoomId}`);
                                }
                            }
                        } catch (infoError) {
                            console.error(`调用info_by_scene API失败:`, infoError.message);
                            
                            // 如果info_by_scene API失败，尝试从搜索结果中提取
                            // 检查liveData中是否有web_rid字段（用户提示这是真实ID）
                            if (liveData.web_rid) {
                                realRoomId = liveData.web_rid.toString();
                                console.log(`从liveData.web_rid中提取到真实直播间ID: ${realRoomId}`);
                            } else {
                                // 检查rawdata字段
                                if (liveData.rawdata) {
                                    console.log(`发现rawdata字段，尝试提取真实ID`);
                                    try {
                                        const rawdataStr = liveData.rawdata;
                                        const rawdataObj = JSON.parse(rawdataStr);
                                        
                                        // 检查rawdata中是否有web_rid字段
                                        if (rawdataObj.web_rid) {
                                            realRoomId = rawdataObj.web_rid.toString();
                                            console.log(`从rawdata.web_rid中提取到真实直播间ID: ${realRoomId}`);
                                        } else {
                                            console.log(`rawdata对象结构:`, Object.keys(rawdataObj));
                                            
                                            // 查看cover字段（用户提示真实ID在cover中）
                                            if (rawdataObj.cover) {
                                                console.log(`cover字段内容:`, rawdataObj.cover);
                                                // 尝试从cover中提取真实ID
                                                const coverMatch = rawdataObj.cover.match(/(\d{10,20})/);
                                                if (coverMatch && coverMatch[1]) {
                                                    realRoomId = coverMatch[1];
                                                    console.log(`从cover字段中提取到真实直播间ID: ${realRoomId}`);
                                                }
                                            }
                                            
                                            // 查看stream_url的结构
                                            if (realRoomId === searchRoomId && rawdataObj.stream_url) {
                                                console.log(`stream_url结构:`, Object.keys(rawdataObj.stream_url));
                                                
                                                // 尝试从Hls字段中提取（数组类型）
                                                if (rawdataObj.stream_url.Hls) {
                                                    console.log(`Hls字段类型: ${typeof rawdataObj.stream_url.Hls}, 是否为数组: ${Array.isArray(rawdataObj.stream_url.Hls)}`);
                                                    if (Array.isArray(rawdataObj.stream_url.Hls)) {
                                                        console.log(`Hls字段是数组类型，长度: ${rawdataObj.stream_url.Hls.length}`);
                                                        for (let i = 0; i < rawdataObj.stream_url.Hls.length; i++) {
                                                            const hlsItem = rawdataObj.stream_url.Hls[i];
                                                            console.log(`Hls数组第${i}项:`, hlsItem);
                                                            if (hlsItem && hlsItem.url) {
                                                                console.log(`Hls URL: ${hlsItem.url}`);
                                                                const streamMatch = hlsItem.url.match(/stream-(\d+)/);
                                                                console.log(`Stream match result:`, streamMatch);
                                                                if (streamMatch && streamMatch[1]) {
                                                                    realRoomId = streamMatch[1];
                                                                    console.log(`从stream_url.Hls数组中提取到真实直播间ID: ${realRoomId}`);
                                                                    break;
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                                
                                                // 尝试从Flv字段中提取（数组类型）
                                                if (realRoomId === searchRoomId && rawdataObj.stream_url.Flv) {
                                                    console.log(`Flv字段类型: ${typeof rawdataObj.stream_url.Flv}, 是否为数组: ${Array.isArray(rawdataObj.stream_url.Flv)}`);
                                                    if (Array.isArray(rawdataObj.stream_url.Flv)) {
                                                        console.log(`Flv字段是数组类型，长度: ${rawdataObj.stream_url.Flv.length}`);
                                                        for (let i = 0; i < rawdataObj.stream_url.Flv.length; i++) {
                                                            const flvItem = rawdataObj.stream_url.Flv[i];
                                                            console.log(`Flv数组第${i}项:`, flvItem);
                                                            if (flvItem && flvItem.url) {
                                                                console.log(`Flv URL: ${flvItem.url}`);
                                                                const streamMatch = flvItem.url.match(/stream-(\d+)/);
                                                                console.log(`Stream match result:`, streamMatch);
                                                                if (streamMatch && streamMatch[1]) {
                                                                    realRoomId = streamMatch[1];
                                                                    console.log(`从stream_url.Flv数组中提取到真实直播间ID: ${realRoomId}`);
                                                                    break;
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                            
                                            // 如果没有从URL中提取到，尝试其他字段
                                            if (realRoomId === searchRoomId && rawdataObj.owner && rawdataObj.owner.room_id) {
                                                realRoomId = rawdataObj.owner.room_id.toString();
                                                console.log(`从rawdata.owner.room_id中提取到真实直播间ID: ${realRoomId}`);
                                            }
                                        }
                                    } catch (parseError) {
                                        console.error(`解析rawdata失败:`, parseError.message);
                                    }
                                }
                            }
                        }
                        
                        console.log(`最终使用的直播间ID: ${realRoomId}`);
                        
                        liveRooms.push({
                            id: realRoomId,
                            url: `https://live.douyin.com/${realRoomId}`,
                            title: title,
                            avatar: liveData.author.avatar_thumb?.url || '',
                            foundAt: new Date().toISOString()
                        });
                        console.log(`成功提取直播间: ${realRoomId} - ${title}`);
                    }
                }
            }
        }
        
        console.log(`搜索完成，找到 ${liveRooms.length} 个直播间`);
        res.json({ success: true, data: liveRooms });
        
    } catch (error) {
        console.error('搜索直播间失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 批量保存搜索结果路由
app.post("/api/save-search-results", async (req, res) => {
    try {
        const { rooms } = req.body;
        if (!rooms || !Array.isArray(rooms)) {
            return res.json({ success: false, error: '房间列表不能为空' });
        }
        
        const liveRoomsFile = path.join(path.dirname(__dirname), "json", "live-rooms.json");
        let existingRooms = [];
        
        if (fs.existsSync(liveRoomsFile)) {
            const content = fs.readFileSync(liveRoomsFile, 'utf8');
            existingRooms = JSON.parse(content);
        }
        
        let savedCount = 0;
        
        for (const room of rooms) {
            const exists = existingRooms.some(r => r.url === room.url);
            if (!exists) {
                existingRooms.push({
                    url: room.url,
                    savedAt: new Date().toISOString()
                });
                savedCount++;
            }
        }
        
        if (savedCount > 0) {
            fs.writeFileSync(liveRoomsFile, JSON.stringify(existingRooms, null, 2));
        }
        
        console.log(`批量保存完成，新增 ${savedCount} 个直播间`);
        res.json({ success: true, message: `成功保存 ${savedCount} 个直播间` });
        
    } catch (error) {
        console.error('批量保存直播间失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 启动过滤路由
app.post("/start-filter", async (req, res) => {
    try {
        const { exec } = require('child_process');
        const { category } = req.body;
        
        console.log(`正在启动过滤功能，使用类别: ${category}...`);
        
        // 更新过滤状态
        filterStatus.status = '运行中';
        filterStatus.currentAction = `正在使用${category}关键词执行过滤...`;
        
        // 在后台启动gl.js脚本，传递类别参数
        const child = exec(`node js/gl.js ${category}`, {
            cwd: path.dirname(__dirname),
            detached: true,
            stdio: 'ignore'
        });
        
        // 不等待子进程完成，立即返回成功
        child.unref();
        
        console.log('过滤功能已启动');
        res.json({
            success: true,
            message: '过滤功能已启动，正在执行'
        });
        
    } catch (error) {
        console.error('启动过滤失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 启动直播间抓取路由
// 存储正在运行的直播间进程
const runningRooms = {};

app.post("/start-room-capture", async (req, res) => {
    try {
        const { roomId } = req.body;
        
        if (!roomId) {
            return res.json({ success: false, error: '请提供直播间ID' });
        }
        
        // 检查是否是隐私直播间（ID中包含星号或特殊字符）
        if (roomId.includes('*') || /[★☆*]/.test(roomId)) {
            console.log(`直播间 ${roomId} 是隐私直播间，自动跳过`);
            res.json({
                success: false,
                error: `直播间 ${roomId} 是隐私直播间，无法抓取`
            });
            return;
        }
        
        console.log(`正在启动直播间抓取，直播间ID: ${roomId}...`);
        
        // 使用PowerShell启动Python脚本抓取直播间弹幕
        const { exec } = require('child_process');
        const pythonScriptPath = path.join(path.dirname(__dirname), "DouyinLiveWebFetcher", "main.py");
        
        // 构建命令：使用PowerShell运行Python脚本
        const pythonPath = "C:\\Users\\Administrator\\AppData\\Local\\Programs\\Python\\Python313\\python.exe";
        
        // 检查 Python 路径是否存在
        if (!fs.existsSync(pythonPath)) {
            console.error(`Python 路径不存在: ${pythonPath}`);
            return res.json({ success: false, error: 'Python 解释器路径配置错误，请检查 login.js 中的 pythonPath' });
        }

        const command = `powershell -Command "& {& '${pythonPath}' '${pythonScriptPath}' '${roomId}'}"`;
        
        console.log('正在执行命令:', command);
        
        const process = exec(command, {
            cwd: path.join(path.dirname(__dirname), "DouyinLiveWebFetcher"),
            detached: false,
            stdio: 'pipe'
        });
        
        // 保存进程引用
        runningRooms[roomId] = process;
        console.log(`✅ 进程已创建，PID: ${process.pid}`);
        
        // 捕获Python脚本的输出
        process.stdout.on('data', (data) => {
            const output = data.toString().trim();
            if (output) {
                console.log(`[直播间 ${roomId}] ${output}`);
            }
        });
        
        // 捕获错误输出
        process.stderr.on('data', (data) => {
            const errorOutput = data.toString().trim();
            if (errorOutput) {
                console.error(`[直播间 ${roomId} 错误] ${errorOutput}`);
            }
        });
        
        // 监听进程退出
        process.on('exit', (code) => {
            console.log(`直播间 ${roomId} 抓取进程已退出，退出码: ${code}`);
            delete runningRooms[roomId];
            
            // 检查直播间状态
            console.log(`检查直播间 ${roomId} 状态: 已结束`);
        });

        // 监听进程错误
        process.on('error', (err) => {
            console.error(`[直播间 ${roomId}] 进程错误事件:`, err.message);
            delete runningRooms[roomId];
        });
        
        console.log(`直播间 ${roomId} 抓取已启动`);
        res.json({
            success: true,
            message: `直播间 ${roomId} 抓取已启动`
        });
        
    } catch (error) {
        console.error('启动直播间抓取失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 检查直播间状态API
app.post("/api/room-status", async (req, res) => {
    try {
        const { roomId } = req.body;
        
        if (!roomId) {
            return res.json({ success: false, error: '请提供直播间ID' });
        }
        
        const process = runningRooms[roomId];
        let isRunning = false;
        
        if (process) {
            // 检查进程是否还在运行
            try {
                process.kill(0); // 发送信号0来检查进程是否存在
                isRunning = true;
            } catch (error) {
                // 进程不存在，从runningRooms中删除
                delete runningRooms[roomId];
                isRunning = false;
            }
        }
        
        console.log(`检查直播间 ${roomId} 状态: ${isRunning ? '运行中' : '已结束'}`);
        
        res.json({
            success: true,
            running: isRunning
        });
        
    } catch (error) {
        console.error('检查直播间状态失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 停止任务执行路由
app.post("/api/stop-task", async (req, res) => {
    try {
        const { taskId } = req.body;
        if (!taskId) {
            return res.json({ success: false, error: '请提供任务ID' });
        }

        // 1. 更新状态为已停止
        updateTaskStatus(taskId, {
            status: '已停止',
            updatedAt: new Date().toISOString()
        });

        // 2. 强制终止所有正在运行的直播间抓取进程
        console.log(`正在清理后台 Python 进程...`);
        
        // 方法 A: 清理记录在案的进程
        for (const roomId in runningRooms) {
            const process = runningRooms[roomId];
            if (process) {
                try {
                    process.kill('SIGINT');
                    console.log(`已发送终止信号给直播间 ${roomId}`);
                } catch (e) { /* ignore */ }
            }
        }
        Object.keys(runningRooms).forEach(key => delete runningRooms[key]);

        // 方法 B: 暴力杀死所有 python.exe 进程（防止自动任务产生的进程逃逸）
        const { exec } = require('child_process');
        exec('taskkill /F /IM python.exe', (error, stdout, stderr) => {
            if (error) {
                console.log('未发现正在运行的 Python 进程或已全部清理');
            } else {
                console.log('已强制关闭所有 Python 抓取脚本');
            }
        });

        console.log(`任务 ${taskId} 已标记为停止，相关进程已清理`);
        res.json({ success: true, message: '任务已停止并清理进程' });
    } catch (error) {
        console.error('停止任务失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 获取过滤状态路由
app.get("/get-filter-status", async (req, res) => {
    try {
        console.log('开始获取过滤状态...');
        
        // 读取全部评论文件获取总数
        const commentsFile = path.join(path.dirname(__dirname), "json", "全部评论.json");
        console.log('评论文件路径:', commentsFile);
        console.log('文件是否存在:', fs.existsSync(commentsFile));
        
        if (fs.existsSync(commentsFile)) {
            try {
                const commentsData = JSON.parse(fs.readFileSync(commentsFile, 'utf8'));
                console.log('评论数据类型:', Array.isArray(commentsData) ? '数组' : typeof commentsData);
                console.log('评论总数:', commentsData.length);
                filterStatus.totalUsers = commentsData.length || 0;
            } catch (e) {
                console.error('解析评论文件失败:', e);
            }
        }
        
        // 读取筛选结果文件获取过滤后数量
        const resultFile = path.join(path.dirname(__dirname), "json", "筛选结果.json");
        console.log('筛选结果文件路径:', resultFile);
        console.log('文件是否存在:', fs.existsSync(resultFile));
        
        if (fs.existsSync(resultFile)) {
            try {
                const resultData = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
                console.log('筛选结果数据类型:', Array.isArray(resultData) ? '数组' : typeof resultData);
                console.log('筛选结果数量:', resultData.length);
                filterStatus.resultCount = resultData.length || 0;
                
                // 如果过滤结果文件存在且有内容，说明过滤已完成
                if (resultData.length > 0) {
                    filterStatus.status = '已完成';
                    filterStatus.currentAction = '过滤已完成';
                    console.log('更新状态为已完成');
                }
            } catch (e) {
                console.error('解析筛选结果文件失败:', e);
            }
        }
        
        console.log('最终状态:', filterStatus);
        
        res.json({
            success: true,
            data: filterStatus
        });
        
    } catch (error) {
        console.error('获取过滤状态失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 启动弹幕抓取路由
app.post("/api/danmaku/start", async (req, res) => {
    try {
        const { roomUrl } = req.body;
        
        if (!roomUrl) {
            return res.json({ success: false, error: '请输入直播间链接' });
        }
        
        if (isDanmakuRunning) {
            return res.json({ success: false, error: '弹幕抓取已在运行中' });
        }
        
        danmakuAutomation = new DouyinDanmakuAutomation();
        isDanmakuRunning = true;
        danmakuAutomation.isTimedOut = false; // 重置超时标志
        
        await danmakuAutomation.start(roomUrl);
        
        res.json({ 
            success: true, 
            message: '弹幕抓取已启动' 
        });
        
    } catch (error) {
        console.error('启动弹幕抓取失败:', error);
        isDanmakuRunning = false;
        res.json({ success: false, error: error.message });
    }
});

// 停止弹幕抓取路由
app.post("/api/danmaku/stop", async (req, res) => {
    try {
        if (!isDanmakuRunning || !danmakuAutomation) {
            return res.json({ success: false, error: '弹幕抓取未运行' });
        }
        
        await danmakuAutomation.stop();
        isDanmakuRunning = false;
        
        res.json({ 
            success: true, 
            message: '弹幕抓取已停止' 
        });
        
    } catch (error) {
        console.error('停止弹幕抓取失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 获取弹幕抓取状态路由
app.get("/api/danmaku/status", async (req, res) => {
    try {
        const danmakuCount = danmakuAutomation ? danmakuAutomation.danmakuCount : 0;
        let status = isDanmakuRunning ? 'running' : 'stopped';
        
        // 如果检测到超时或关播，标记为停止，前端会触发换房
        if (isDanmakuRunning && danmakuAutomation && danmakuAutomation.isTimedOut) {
            status = 'stopped';
            console.log('🔄 状态接口返回 stopped，触发前端换房逻辑');
            // 注意：关闭逻辑已在页面脚本监听器中处理，这里只返回状态
        }

        res.json({ 
            success: true, 
            data: { 
                status: status,
                danmakuCount: danmakuCount,
                currentAction: isDanmakuRunning ? '正在监控直播间' : '等待开始'
            } 
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// 获取初始状态路由（扫描数据并返回总用户数和上次进度）
app.get("/get-initial-status", async (req, res) => {
    try {
        // 读取筛选结果文件
        const filterResultFile = path.join(path.dirname(__dirname), "json", "筛选结果.json");
        if (!fs.existsSync(filterResultFile)) {
            throw new Error("筛选结果.json 文件不存在");
        }
        
        const filterResult = JSON.parse(fs.readFileSync(filterResultFile, "utf8"));
        if (!filterResult || !Array.isArray(filterResult)) {
            throw new Error("筛选结果.json 文件格式错误");
        }
        
        // 读取进度文件
        const progressFile = path.join(path.dirname(__dirname), "json", "follow-progress.json");
        let lastProgress = 0;
        if (fs.existsSync(progressFile)) {
            try {
                const progressData = JSON.parse(fs.readFileSync(progressFile, "utf8"));
                lastProgress = progressData.progress || 0;
                
                // 如果进度超过用户总数，重置为0
                if (lastProgress >= filterResult.length) {
                    console.log(`进度 ${lastProgress} 已超过总用户数 ${filterResult.length}，重置为0`);
                    lastProgress = 0;
                    fs.writeFileSync(progressFile, JSON.stringify({ progress: 0 }, null, 2));
                }
            } catch (error) {
                console.error("读取进度文件失败:", error);
            }
        }
        
        // 更新全局状态
        executionStatus.totalUsers = filterResult.length;
        executionStatus.currentCount = lastProgress;
        
        res.json({
            success: true,
            data: {
                totalUsers: filterResult.length,
                lastProgress: lastProgress,
                currentCount: lastProgress,
                startFrom: lastProgress + 1,
                status: 'idle'
            }
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// 启动评论抓取工具路由
app.post("/start-capture", async (req, res) => {
    try {
        console.log('正在启动评论抓取工具...');
        
        // 使用 PowerShell 启动新窗口并执行命令
        const { exec } = require('child_process');
        
        // 构建命令：打开新的PowerShell窗口，自动执行命令
        const command = 'powershell -Command "Start-Process powershell -ArgumentList \'-NoExit -Command \"d:; cd \\weibo\\douyinss\\js; node c.js\"\' -WindowStyle Normal"';
        
        console.log('执行命令:', command);
        
        exec(command, {
            cwd: __dirname,
            detached: true,
            stdio: 'ignore'
        }, (error, stdout, stderr) => {
            if (error) {
                console.error('启动评论抓取工具失败:', error);
                res.json({ success: false, error: error.message });
                return;
            }
            
            console.log('评论抓取工具已启动');
            res.json({ success: true, message: '评论抓取工具已启动' });
        });
        
    } catch (error) {
        console.error('启动评论抓取工具失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 清空筛选评论路由
app.post("/clear-filter-results", async (req, res) => {
    try {
        console.log('正在清空筛选评论...');
        
        const filterResultFile = path.join(path.dirname(__dirname), "json", "筛选结果.json");
        
        if (fs.existsSync(filterResultFile)) {
            fs.writeFileSync(filterResultFile, '[]');
            console.log('筛选评论已清空');
        }
        
        // 重置过滤状态
        filterStatus.status = '未开始';
        filterStatus.currentAction = '等待开始';
        filterStatus.resultCount = 0;
        
        res.json({ success: true, message: '筛选评论已清空' });
        
    } catch (error) {
        console.error('清空筛选评论失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 通用归类API
app.post("/classify-content", async (req, res) => {
    try {
        const { category } = req.body;
        
        if (!category) {
            res.json({ success: false, error: '请指定归类类别' });
            return;
        }
        
        console.log(`正在将内容归类到${category}...`);
        
        const filterResultFile = path.join(path.dirname(__dirname), "json", "筛选结果.json");
        
        if (!fs.existsSync(filterResultFile)) {
            res.json({ success: false, error: '筛选结果文件不存在' });
            return;
        }
        
        const filterResult = JSON.parse(fs.readFileSync(filterResultFile, "utf8"));
        if (!filterResult || !Array.isArray(filterResult)) {
            res.json({ success: false, error: '筛选结果格式错误' });
            return;
        }
        
        // 将所有内容归类到指定类别
        const classifiedResults = filterResult.map(item => ({
            ...item,
            category: category,
            classifiedAt: new Date().toLocaleString()
        }));
        
        fs.writeFileSync(filterResultFile, JSON.stringify(classifiedResults, null, 2), 'utf8');
        
        console.log(`成功将 ${classifiedResults.length} 条内容归类到${category}`);
        res.json({ success: true, message: `成功将 ${classifiedResults.length} 条内容归类到${category}` });
    } catch (error) {
        console.error('归类失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 清空全部评论路由
app.post("/clear-all-comments", async (req, res) => {
    try {
        console.log('正在清空全部评论...');
        
        const allCommentsFile = path.join(path.dirname(__dirname), "json", "全部评论.json");
        
        if (fs.existsSync(allCommentsFile)) {
            fs.writeFileSync(allCommentsFile, '[]');
            console.log('全部评论已清空');
        }
        
        res.json({ success: true, message: '全部评论已清空' });
        
    } catch (error) {
        console.error('清空全部评论失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 获取最新关键词API
app.get("/api/keywords", async (req, res) => {
    try {
        const keywordsFile = path.join(path.dirname(__dirname), "keywords.json");
        
        if (fs.existsSync(keywordsFile)) {
            const content = fs.readFileSync(keywordsFile, 'utf8');
            const keywordsConfig = JSON.parse(content);
            res.json({ success: true, keywords: keywordsConfig.keywords || [] });
        } else {
            res.json({ success: true, keywords: [] });
        }
    } catch (error) {
        console.error('获取关键词失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 保存直播间列表API
app.post("/api/save-live-rooms", async (req, res) => {
    try {
        const { rooms } = req.body;
        const liveRoomsFile = path.join(path.dirname(__dirname), "json", "live-rooms.json");
        
        fs.writeFileSync(liveRoomsFile, JSON.stringify(rooms, null, 2), 'utf8');
        res.json({ success: true, message: '直播间列表保存成功' });
    } catch (error) {
        console.error('保存直播间列表失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 获取直播间列表API
app.get("/api/get-live-rooms", async (req, res) => {
    try {
        const liveRoomsFile = path.join(path.dirname(__dirname), "json", "live-rooms.json");
        
        if (fs.existsSync(liveRoomsFile)) {
            const content = fs.readFileSync(liveRoomsFile, 'utf8');
            const rooms = JSON.parse(content);
            res.json({ success: true, data: rooms });
        } else {
            res.json({ success: true, data: [] });
        }
    } catch (error) {
        console.error('获取直播间列表失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 获取设置
app.get("/api/settings", async (req, res) => {
    try {
        const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
        res.json({ success: true, settings });
    } catch (error) {
        console.error('获取设置失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 获取过滤词分类
app.get("/api/filter-word-categories", async (req, res) => {
    try {
        const categories = {};
        
        // 读取所有过滤词文件
        const files = fs.readdirSync(filterWordsDir);
        files.forEach(file => {
            if (file.endsWith('.json')) {
                const categoryName = file.replace('.json', '');
                const filePath = path.join(filterWordsDir, file);
                const words = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                categories[categoryName] = words;
            }
        });
        
        res.json({ success: true, categories });
    } catch (error) {
        console.error('获取过滤词分类失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 保存设置
app.post("/api/settings", async (req, res) => {
    try {
        const { keywordTimeout, filterWords } = req.body;
        
        if (!keywordTimeout || !Array.isArray(filterWords)) {
            return res.json({ success: false, error: '参数错误' });
        }
        
        const settings = {
            keywordTimeout: parseInt(keywordTimeout),
            filterWords
        };
        
        // 1. 保存设置文件
        fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf8');

        // 2. 自动同步到抓取脚本使用的 keywords.json
        const keywordsConfigPath = path.join(path.dirname(__dirname), "json", "keywords.json");
        let keywordsConfig = { keywords: [], categories: {} };
        
        if (fs.existsSync(keywordsConfigPath)) {
            try {
                const content = fs.readFileSync(keywordsConfigPath, 'utf8');
                keywordsConfig = JSON.parse(content);
            } catch (e) {
                console.error('解析 keywords.json 失败，将创建新文件', e);
                // 如果解析失败，保留原有的 categories 结构
                keywordsConfig = { keywords: filterWords, categories: {} };
            }
        }

        // 更新关键词列表为选中的过滤词
        keywordsConfig.keywords = filterWords;
        
        // 确保分类结构存在（可选，方便前端下次加载）
        if (!keywordsConfig.categories) keywordsConfig.categories = {};
        
        // 【修复】使用临时文件 + 重命名，确保原子写入
        const tempPath = keywordsConfigPath + '.tmp';
        fs.writeFileSync(tempPath, JSON.stringify(keywordsConfig, null, 2), 'utf8');
        fs.renameSync(tempPath, keywordsConfigPath); // 原子替换
        
        console.log(`✅ 关键词已同步至抓取配置: ${filterWords.join(', ')}`);

        res.json({ success: true, message: '设置已保存并同步至抓取系统' });
    } catch (error) {
        console.error('保存设置失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 根路径重定向
app.get("/", (req, res) => {
    res.redirect("/live-room-manager.html");
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器已启动，监听端口 ${PORT}`);
    console.log(`请访问 http://localhost:${PORT}/login.html`);
    
    // 启动任务调度器
    startTaskScheduler();
});

// 命令行参数处理
const args = process.argv.slice(2);
const action = args[0];

if (action === "open") {
    openDouyin();
} else if (action === "save") {
    saveCookie();
} else if (action === "login") {
    loginWithCookie();
} else {
    console.log("用法: node douyin-login.js [open|save|login]");
    console.log("  open: 打开抖音并手动登录");
    console.log("  save: 保存当前登录状态的Cookie");
    console.log("  login: 使用保存的Cookie登录");
    console.log("  无参数: 启动Web服务器");
}
