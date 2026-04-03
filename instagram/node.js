const chromeFinder = require('chrome-finder');
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const schedule = require("node-schedule");

// 获取应用根目录（打包兼容）
function getAppRoot() {
    if (process.resourcesPath && fs.existsSync(path.join(process.resourcesPath, 'app'))) {
        // Electron打包环境
        return path.join(process.resourcesPath, 'app');
    } else if (process.resourcesPath) {
        // Electron资源目录
        return process.resourcesPath;
    } else {
        // 开发环境
        return __dirname;
    }
}

const appRoot = getAppRoot();
console.log(`✅ 应用根目录: ${appRoot}`);

// 动态require puppeteer（打包兼容）
let puppeteer;
try {
    // 首先尝试从应用根目录的node_modules目录require
    const puppeteerPath = path.join(appRoot, 'node_modules', 'puppeteer');
    if (fs.existsSync(puppeteerPath)) {
        puppeteer = require(puppeteerPath);
        console.log('✅ 从应用根目录加载puppeteer成功');
    } else {
        // 如果找不到，尝试从当前目录的node_modules加载
        const currentDirPuppeteerPath = path.join(__dirname, 'node_modules', 'puppeteer');
        if (fs.existsSync(currentDirPuppeteerPath)) {
            puppeteer = require(currentDirPuppeteerPath);
            console.log('✅ 从当前目录加载puppeteer成功');
        } else {
            throw new Error('未找到puppeteer模块，请确保node_modules/puppeteer目录存在');
        }
    }
} catch (error) {
    console.error('❌ 加载puppeteer失败:', error.message);
    process.exit(1);
}

// 使用项目目录存储数据
const userDataDir = path.join(appRoot, 'json');
fs.mkdirSync(userDataDir, { recursive: true });

// 创建浏览器用户数据目录，保存登录状态
const browserUserDataDir = path.join(appRoot, 'browser-data');
fs.mkdirSync(browserUserDataDir, { recursive: true });

const COOKIE_FILE = path.join(userDataDir, "cookie.txt");
const app = express();
const PORT = 3003;

// 全局存储浏览器实例
let browserInstance = null;
let globalPage = null;

// 处理命令行参数，支持执行外部js文件
if (process.argv.length >= 3) {
    const jsFile = process.argv[2];
    if (jsFile.includes('c.js')) {
        console.log('执行评论抓取工具...');
        const cjsPath = path.join(appRoot, 'js', 'c.js');
        require(cjsPath);
        process.exit(0);
    } else if (jsFile.includes('followers-filter.js')) {
        console.log('执行粉丝过滤工具...');
        const maxFollowers = process.argv[3];
        const maxFollowing = process.argv[4];
        const followersFilterPath = path.join(appRoot, 'js', 'followers-filter.js');
        require(followersFilterPath).main(maxFollowers, maxFollowing);
        process.exit(0);
    } else if (jsFile.includes('gl.js')) {
        console.log('执行关键词过滤工具...');
        const gljsPath = path.join(appRoot, 'js', 'gl.js');
        require(gljsPath);
        process.exit(0);
    }
}

// 全局变量：存储当前处理的用户信息
let currentUserInfo = {
    url: '',
    posts: null,
    followers: null,
    following: null
};

// 任务存储文件
const tasksFile = path.join(userDataDir, "tasks.json");
// 任务执行状态文件
const taskStatusFile = path.join(userDataDir, "task-status.json");

// 初始化任务存储
if (!fs.existsSync(tasksFile)) {
    fs.writeFileSync(tasksFile, JSON.stringify([]), 'utf8');
}

// 初始化任务执行状态存储
if (!fs.existsSync(taskStatusFile)) {
    fs.writeFileSync(taskStatusFile, JSON.stringify({}), 'utf8');
}

// 任务调度器
const taskJobs = new Map();

// 全局状态跟踪
let executionStatus = {
    status: 'idle',
    totalUsers: 0,
    currentCount: 0,
    progress: 0,
    currentAction: '等待开始'
};

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
    if (taskJobs.has(task.id)) {
        taskJobs.get(task.id).cancel();
    }
    
    if (task.time === 'now') {
        console.log(`立即执行任务: ${task.skill}`);
        executeTask(task);
        return;
    }
    
    const [hours, minutes] = task.time.split(':').map(Number);
    
    const job = schedule.scheduleJob({ hour: hours, minute: minutes }, () => {
        executeTask(task);
    });
    
    taskJobs.set(task.id, job);
    console.log(`任务调度成功: ${task.time} - ${task.skill}`);
}

// 执行任务
async function executeTask(task) {
    console.log(`执行任务: ${task.time} - ${task.skill}`);
    
    updateTaskStatus(task.id, {
        status: 'running',
        startTime: new Date().toISOString()
    });
    
    try {
        switch (task.skill) {
            case 'autoFollow':
                await autoFollow(5, 10);
                break;
        }
        
        console.log(`任务执行成功: ${task.time} - ${task.skill}`);
        
        updateTaskStatus(task.id, {
            status: 'success',
            endTime: new Date().toISOString()
        });
    } catch (error) {
        console.error(`任务执行失败: ${task.time} - ${task.skill}`, error);
        
        updateTaskStatus(task.id, {
            status: 'failed',
            endTime: new Date().toISOString(),
            error: error.message
        });
    }
}

app.use(cors());
app.use(express.json());

// 根路径重定向到login.html
app.get("/", (req, res) => {
    res.redirect("/login.html");
});

// 使用绝对路径作为静态文件目录（打包兼容）
const htmlDir = path.join(appRoot, 'html');
app.use(express.static(htmlDir));

// 全局 getUserInfo 函数
async function getUserInfo(userUrl) {
    try {
        console.log(`🔍 正在获取用户信息: ${userUrl}`);
        
        // 自动查找Chrome浏览器路径
        const chromePath = chromeFinder();
        
        // 启动浏览器
        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            userDataDir: browserUserDataDir,
            args: [
                '--start-maximized',
                '--window-position=0,0',
                '--window-size=1920,1080',
                '--disable-gpu',
                '--no-sandbox'
            ],
            executablePath: chromePath
        });
        
        const page = await browser.newPage();
        
        // 添加页面console监听器来捕获调试信息
        page.on('console', msg => {
            const text = msg.text();
            console.log('页面console:', text);
        });
        
        // 延迟函数
        function delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        
        // 访问用户主页
        console.log(`🌐 正在访问用户页面: ${userUrl}`);
        await page.goto(userUrl, { 
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        console.log(`✅ 页面加载完成`);
        
        // 等待页面完全加载
        await delay(3000);
        
        // 检查并关闭登录弹窗
        console.log(`🔧 检查登录弹窗`);
        await page.evaluate(() => {
            const closeButtons = document.querySelectorAll(
                '[aria-label="Close"], ' +
                '[aria-label="关闭"], ' +
                '[aria-label="Close this modal"], ' +
                '.x1i10hfl.xjqpnuy.x2hbi6w.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1ypdohk.xdl72j9.x2lah0s.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.x2lwn1j.x78zum5.xdt5ytf.x1iyjqo2.x2ql1qa, ' +
                'button[class*="_"], ' +
                'div[role="button"], ' +
                'svg[aria-label="Close"], ' +
                'svg[aria-label="关闭"], ' +
                '[data-testid="close-button"], ' +
                '[data-testid="modal-close"]'
            );
            
            for (const button of closeButtons) {
                const text = button.innerText || button.textContent || '';
                const ariaLabel = button.getAttribute('aria-label') || '';
                const testId = button.getAttribute('data-testid') || '';
                
                if (text.includes('Close') || text.includes('关闭') || text.includes('×') || 
                    ariaLabel.includes('Close') || ariaLabel.includes('关闭') ||
                    testId.includes('close') || testId.includes('Close')) {
                    button.click();
                    break;
                }
            }
        });
        await delay(3000);
        
        // 提取用户数据
        console.log(`🔧 开始提取用户数据`);
        
        const userInfo = await page.evaluate(() => {
            console.log('开始提取用户数据...');
            
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
            
            // 调试：打印页面标题和URL
            console.log('页面标题:', document.title);
            console.log('页面URL:', window.location.href);
            
            // 方法1: 使用html-span选择器提取用户数据（测试脚本验证过的稳定选择器）
            console.log('🔍 尝试方法1: 使用html-span选择器');
            const htmlSpans = document.querySelectorAll('span.html-span');
            console.log('找到的html-span元素数量:', htmlSpans.length);
            
            const htmlSpanTexts = Array.from(htmlSpans).map(el => el.textContent?.trim()).filter(text => text);
            console.log('html-span文本:', htmlSpanTexts);
            
            // 从html-span中提取前三个数字
            const htmlNumbers = htmlSpanTexts.filter(text => /\d/.test(text));
            console.log('html-span中的数字:', htmlNumbers);
            
            // 按照Instagram的标准顺序：帖子、粉丝、关注
            if (htmlNumbers.length >= 1) {
                posts = textToNumber(htmlNumbers[0]);
            }
            if (htmlNumbers.length >= 2) {
                followers = textToNumber(htmlNumbers[1]);
            }
            if (htmlNumbers.length >= 3) {
                following = textToNumber(htmlNumbers[2]);
            }
            
            console.log('最终提取结果: 帖子', posts, ', 粉丝', followers, ', 关注', following);
            return { posts, followers, following };
        });
        
        console.log(`✅ 用户信息获取成功：帖子 ${userInfo.posts}, 粉丝 ${userInfo.followers}, 关注 ${userInfo.following}`);
        
        // 更新全局变量，存储当前用户信息
        currentUserInfo = {
            url: userUrl,
            posts: userInfo.posts,
            followers: userInfo.followers,
            following: userInfo.following
        };
        
        // 等待用户查看数据（增加等待时间）
        console.log(`⏳ 等待用户查看数据...`);
        for (let i = 0; i < 5; i++) {
            await delay(1000);
            // 检查是否需要停止
            if (filterStatus.status === '已停止') {
                console.log('🚫 收到停止命令，立即关闭浏览器');
                await browser.close();
                throw new Error('用户已停止过滤');
            }
        }
        
        // 关闭浏览器
        await browser.close();
        
        return userInfo;
        
    } catch (error) {
        console.error('获取用户信息失败:', error);
        throw error;
    }
}

async function openInstagram() {
    console.log("正在打开Instagram...");
    
    // 自动查找Chrome浏览器路径
    const chromePath = chromeFinder();
    
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ["--start-maximized"],
        // 使用自动找到的Chrome路径
        executablePath: chromePath
    });
    
    const page = await browser.newPage();
    
    try {
        await page.goto("https://www.instagram.com", {
            waitUntil: "networkidle2",
            timeout: 60000
        });
        
        console.log("Instagram已打开，请在浏览器中登录");
        
        browserInstance = { browser, page };
        
        return true;
    } catch (error) {
        console.error("打开Instagram失败:", error);
        await browser.close();
        throw error;
    }
}

async function saveCookie() {
    console.log("正在保存Cookie...");
    
    if (!browserInstance) {
        console.error("请先打开Instagram登录页面");
        throw new Error("请先打开Instagram登录页面");
    }
    
    const { browser, page } = browserInstance;
    
    try {
        console.log("请确保已登录Instagram...");
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const cookies = await page.cookies();
        
        fs.writeFileSync(COOKIE_FILE, JSON.stringify(cookies, null, 2));
        
        console.log(`Cookie保存成功: ${COOKIE_FILE}`);
        
        await browser.close();
        
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
    
    // 自动查找Chrome浏览器路径
    const chromePath = chromeFinder();
    
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ["--start-maximized"],
        // 使用自动找到的Chrome路径
        executablePath: chromePath
    });
    
    const page = await browser.newPage();
    
    try {
        const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, "utf8"));
        
        await page.setCookie(...cookies);
        
        await page.goto("https://www.instagram.com", {
            waitUntil: "networkidle2",
            timeout: 60000
        });
        
        console.log("已携带Cookie登录Instagram");
        
        return true;
    } catch (error) {
        console.error("携带Cookie登录失败:", error);
        await browser.close();
        throw error;
    }
}

app.get("/open-instagram", async (req, res) => {
    try {
        await openInstagram();
        res.json({ success: true, message: "Instagram已打开，请在新窗口中登录" });
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
        res.json({ success: true, message: "已携带Cookie登录Instagram" });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

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

app.post("/api/tasks", async (req, res) => {
    try {
        const { time } = req.body;
        if (!time) {
            return res.json({ success: false, error: '请提供执行时间' });
        }

        const tasks = loadTasks();
        const newTask = {
            id: `task-${Date.now()}`,
            time,
            skill: 'autoFollow'
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

app.delete("/api/tasks/:id", async (req, res) => {
    try {
        const { id } = req.params;
        console.log('收到删除任务请求:', id);
        
        const tasks = loadTasks();
        console.log('当前任务列表:', tasks);
        
        const filteredTasks = tasks.filter(task => task.id !== id);
        console.log('删除后的任务列表:', filteredTasks);
        
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

async function autoFollow(interval = 5, count = 10) {
    console.log(`====================================`);
    console.log(`开始自动关注任务`);
    console.log(`关注间隔: ${interval} 秒`);
    console.log(`关注数量: ${count} 个`);
    console.log(`====================================`);
    
    executionStatus.status = 'running';
    executionStatus.currentAction = '运行中...';
    
    const filterResultFile = path.join(userDataDir, "筛选结果.json");
    if (!fs.existsSync(filterResultFile)) {
        executionStatus.status = 'stopped';
        throw new Error("筛选结果.json 文件不存在");
    }
    
    const filterResult = JSON.parse(fs.readFileSync(filterResultFile, "utf8"));
    if (!filterResult || !Array.isArray(filterResult)) {
        executionStatus.status = 'stopped';
        throw new Error("筛选结果.json 文件格式错误");
    }
    console.log(`[1/8] 成功读取筛选结果，共 ${filterResult.length} 个用户`);
    
    executionStatus.totalUsers = filterResult.length;
    
    const progressFile = path.join(userDataDir, "follow-progress.json");
    let progress = 0;
    if (fs.existsSync(progressFile)) {
        try {
            const progressData = JSON.parse(fs.readFileSync(progressFile, "utf8"));
            progress = progressData.progress || 0;
            
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
    
    console.log(`[4/8] 启动浏览器...`);
    // 自动查找Chrome浏览器路径
    const chromePath = chromeFinder();
    
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ["--start-maximized"],
        // 使用自动找到的Chrome路径
        executablePath: chromePath
    });
    console.log(`[4/8] 浏览器启动成功`);
    
    console.log(`[5/8] 创建新页面...`);
    const page = await browser.newPage();
    console.log(`[5/8] 页面创建成功`);
    
    try {
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
                console.log(`正在访问用户主页: ${user.userUrl}`);
                executionStatus.currentAction = '访问用户主页';
                await page.goto(user.userUrl, {
                    waitUntil: "networkidle2",
                    timeout: 60000
                });
                
                console.log('页面加载完成，等待内容渲染...');
                executionStatus.currentAction = '等待页面渲染';
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                try {
                    console.log('检查是否有弹框需要关闭...');
                    executionStatus.currentAction = '处理页面弹框';
                    const closeButtons = [
                        "button[class*='close']",
                        ".close-btn",
                        ".btn-close",
                        "[aria-label*='Close']",
                        "[aria-label*='关闭']"
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
                
                attemptCount++;
                console.log(`第 ${attemptCount} 次关注尝试`);
                
                executionStatus.currentCount = attemptCount;
                
                let clickSuccess = false;
                let clickMethod = '';
                
                const followSelectors = [
                    "button._acan._acap._acas",
                    "button._aswp._aswr._aswu._aswy._asw_._asx2",
                    "button[aria-label*='Follow']",
                    "button[aria-label*='follow']",
                    "button[aria-label*='关注']",
                    "button:has-text('Follow')",
                    "button:has-text('关注')",
                    "button:contains('Follow')",
                    "button:contains('关注')",
                    "[class*='follow']",
                    "[class*='Follow']",
                    "[class*='aswp']"
                ];
                
                let foundSelector = null;
                let followButton = null;
                
                console.log('开始查找关注按钮...');
                executionStatus.currentAction = '查找关注按钮';
                
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
                
                if (!followButton) {
                    try {
                        console.log('尝试通过文本查找关注按钮...');
                        executionStatus.currentAction = '通过文本查找关注按钮';
                        const buttons = await page.$$('button');
                        console.log(`找到 ${buttons.length} 个按钮`);
                        
                        for (let j = 0; j < buttons.length; j++) {
                            try {
                                const text = await page.evaluate(button => button.textContent, buttons[j]);
                                if (text && text.includes('Follow')) {
                                    followButton = buttons[j];
                                    console.log(`找到关注按钮，通过文本内容: "${text}"`);
                                    foundSelector = 'text:Follow';
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
                    progress = i + 1;
                    fs.writeFileSync(progressFile, JSON.stringify({ progress }, null, 2));
                    continue;
                }
                
                executionStatus.currentAction = '检查按钮状态';
                const buttonText = await page.evaluate(el => el.textContent.trim(), followButton);
                console.log(`关注按钮文本: "${buttonText}"`);
                
                if (buttonText === 'Following' || buttonText === 'Followed' || buttonText === '已关注' || buttonText === '正在关注') {
                    console.log(`用户已关注，跳过: ${user.userUrl}`);
                    executionStatus.currentAction = '用户已关注，跳过';
                    progress = i + 1;
                    fs.writeFileSync(progressFile, JSON.stringify({ progress }, null, 2));
                    continue;
                }
                
                try {
                    executionStatus.currentAction = '尝试点击方法1: 直接点击';
                    await followButton.click({ delay: 100 });
                    clickSuccess = true;
                    clickMethod = "方法1: 直接点击";
                    console.log("✅ 方法1成功");
                } catch (e) {
                    console.warn("方法1失败:", e);
                }
                
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
                    
                    progress = i + 1;
                    fs.writeFileSync(progressFile, JSON.stringify({ progress }, null, 2));
                    console.log(`进度保存成功，当前进度: ${progress}`);
                } else {
                    console.log("❌ 所有点击方式都失败");
                    executionStatus.currentAction = "关注失败";
                    progress = i + 1;
                    fs.writeFileSync(progressFile, JSON.stringify({ progress }, null, 2));
                }
                
            } catch (error) {
                console.error(`处理用户 ${user.userUrl} 失败:`, error);
                
                progress = i + 1;
                fs.writeFileSync(progressFile, JSON.stringify({ progress }, null, 2));
            }
            
            if (i < filterResult.length - 1 && attemptCount < count - 1) {
                console.log(`等待 ${interval} 秒后继续下一个用户...`);
                executionStatus.currentAction = `等待 ${interval} 秒...`;
                
                for (let j = 0; j < interval; j++) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
                executionStatus.currentAction = '准备处理下一个用户';
            }
        }
        
        console.log(`自动关注完成，共尝试 ${attemptCount} 次`);
        
        executionStatus.status = 'stopped';
        
        console.log("自动关注已完成，浏览器窗口保持打开状态");
        
        return {
            success: true,
            attemptCount,
            progress
        };
        
    } catch (error) {
        console.error("自动关注失败:", error);
        executionStatus.status = 'stopped';
        throw error;
    }
}

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

let filterStatus = {
    status: '未开始',
    currentAction: '等待开始',
    totalUsers: 0,
    resultCount: 0
};

app.get("/get-keywords", async (req, res) => {
    try {
        const keywordsConfigPath = path.join(userDataDir, "keywords.json");
        let keywords = [];
        
        if (fs.existsSync(keywordsConfigPath)) {
            const keywordsConfig = JSON.parse(fs.readFileSync(keywordsConfigPath, 'utf8'));
            keywords = keywordsConfig.keywords || [];
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

app.post("/add-keyword", async (req, res) => {
    try {
        const { keyword } = req.body;
        if (!keyword) {
            return res.json({ success: false, error: '关键词不能为空' });
        }
        
        const keywordsConfigPath = path.join(userDataDir, "keywords.json");
        let keywords = [];
        
        if (fs.existsSync(keywordsConfigPath)) {
            const keywordsConfig = JSON.parse(fs.readFileSync(keywordsConfigPath, 'utf8'));
            keywords = keywordsConfig.keywords || [];
        }
        
        if (!keywords.includes(keyword)) {
            keywords.push(keyword);
            fs.writeFileSync(keywordsConfigPath, JSON.stringify({ keywords }, null, 2));
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

app.post("/delete-keyword", async (req, res) => {
    try {
        const { keyword } = req.body;
        if (!keyword) {
            return res.json({ success: false, error: '关键词不能为空' });
        }
        
        const keywordsConfigPath = path.join(userDataDir, "keywords.json");
        if (!fs.existsSync(keywordsConfigPath)) {
            return res.json({ success: false, error: '关键词配置文件不存在' });
        }
        
        const keywordsConfig = JSON.parse(fs.readFileSync(keywordsConfigPath, 'utf8'));
        let keywords = keywordsConfig.keywords || [];
        
        keywords = keywords.filter(k => k !== keyword);
        fs.writeFileSync(keywordsConfigPath, JSON.stringify({ keywords }, null, 2));
        
        res.json({
            success: true,
            message: '关键词删除成功'
        });
        
    } catch (error) {
        console.error('删除关键词失败:', error);
        res.json({ success: false, error: error.message });
    }
});

app.post("/clear-keywords", async (req, res) => {
    try {
        const keywordsConfigPath = path.join(userDataDir, "keywords.json");
        fs.writeFileSync(keywordsConfigPath, JSON.stringify({ keywords: [] }, null, 2));
        
        res.json({
            success: true,
            message: '关键词已清空'
        });
        
    } catch (error) {
        console.error('清空关键词失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 获取评论数据路由
app.get("/get-comments", async (req, res) => {
    try {
        console.log('正在获取评论数据...');
        
        const commentsFile = path.join(userDataDir, "全部评论.json");
        
        if (!fs.existsSync(commentsFile)) {
            res.json({
                success: false,
                error: '评论文件不存在'
            });
            return;
        }
        
        const commentsData = JSON.parse(fs.readFileSync(commentsFile, 'utf8'));
        console.log(`获取到 ${commentsData.length} 条评论数据`);
        
        res.json({
            success: true,
            data: commentsData
        });
        
    } catch (error) {
        console.error('获取评论数据失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 保存过滤结果路由
app.post("/save-filter-result", async (req, res) => {
    try {
        console.log('正在保存过滤结果...');
        
        const resultData = req.body;
        const resultFile = path.join(userDataDir, "筛选结果.json");
        
        let resultArray = [];
        if (fs.existsSync(resultFile)) {
            resultArray = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
        }
        
        resultArray.push(resultData);
        fs.writeFileSync(resultFile, JSON.stringify(resultArray, null, 2));
        
        console.log('过滤结果保存成功');
        
        res.json({
            success: true,
            message: '过滤结果保存成功'
        });
        
    } catch (error) {
        console.error('保存过滤结果失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 获取用户信息路由（支持POST）
app.post("/get-user-info", async (req, res) => {
    try {
        const url = req.body.url;
        if (!url) {
            res.json({ success: false, error: 'URL参数不能为空' });
            return;
        }
        
        console.log(`正在获取用户信息: ${url}`);
        
        // 调用现有的getUserInfo函数
        const userInfo = await getUserInfo(url);
        console.log(`获取用户信息成功:`, userInfo);
        
        res.json({
            success: true,
            data: userInfo
        });
        
    } catch (error) {
        console.error('获取用户信息失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 通过用户ID获取用户信息（使用浏览器获取数据）
app.post("/get-user-by-id", async (req, res) => {
    try {
        const userId = req.body.userId;
        if (!userId) {
            res.json({ success: false, error: '用户ID不能为空' });
            return;
        }
        
        console.log(`正在通过用户ID获取用户信息: ${userId}`);
        
        // 构建用户URL
        const userUrl = `https://www.instagram.com/${userId}/`;
        
        // 调用现有的getUserInfo函数（使用浏览器获取数据）
        const userInfo = await getUserInfo(userUrl);
        console.log(`✅ 获取用户信息成功：帖子 ${userInfo.posts}, 粉丝 ${userInfo.followers}, 关注 ${userInfo.following}`);
        
        res.json({
            success: true,
            data: userInfo
        });
        
    } catch (error) {
        console.error('通过用户ID获取用户信息失败:', error);
        res.json({ success: false, error: error.message });
    }
});

app.get("/get-filter-status", async (req, res) => {
    try {
        console.log('开始获取过滤状态...');
        
        const commentsFile = path.join(userDataDir, "全部评论.json");
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
        
        const resultFile = path.join(userDataDir, "筛选结果.json");
        console.log('筛选结果文件路径:', resultFile);
        console.log('文件是否存在:', fs.existsSync(resultFile));
        
        if (fs.existsSync(resultFile)) {
            try {
                const resultData = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
                console.log('筛选结果数据类型:', Array.isArray(resultData) ? '数组' : typeof resultData);
                console.log('筛选结果数量:', resultData.length);
                filterStatus.resultCount = resultData.length || 0;
                
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
        res.json({
            success: false,
            error: error.message
        });
    }
});

// 获取当前处理用户信息
app.get("/get-current-user", (req, res) => {
    console.log('获取当前用户信息:', currentUserInfo);
    res.json({ 
        success: true, 
        data: currentUserInfo 
    });
});

app.get("/get-initial-status", async (req, res) => {
    try {
        const filterResultFile = path.join(userDataDir, "筛选结果.json");
        if (!fs.existsSync(filterResultFile)) {
            throw new Error("筛选结果.json 文件不存在");
        }
        
        const filterResult = JSON.parse(fs.readFileSync(filterResultFile, "utf8"));
        if (!filterResult || !Array.isArray(filterResult)) {
            throw new Error("筛选结果.json 文件格式错误");
        }
        
        const progressFile = path.join(userDataDir, "follow-progress.json");
        let lastProgress = 0;
        if (fs.existsSync(progressFile)) {
            try {
                const progressData = JSON.parse(fs.readFileSync(progressFile, "utf8"));
                lastProgress = progressData.progress || 0;
                
                if (lastProgress >= filterResult.length) {
                    console.log(`进度 ${lastProgress} 已超过总用户数 ${filterResult.length}，重置为0`);
                    lastProgress = 0;
                    fs.writeFileSync(progressFile, JSON.stringify({ progress: 0 }, null, 2));
                }
            } catch (error) {
                console.error("读取进度文件失败:", error);
            }
        }
        
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

// 启动关键词过滤路由
app.post("/start-keyword-filter", async (req, res) => {
    try {
        console.log('正在启动关键词过滤功能...');
        
        filterStatus.status = '运行中';
        filterStatus.currentAction = '正在执行关键词过滤...';
        
        // 读取评论数据
        const commentsFile = path.join(userDataDir, "全部评论.json");
        const keywordsFile = path.join(userDataDir, "keywords.json");
        const resultFile = path.join(userDataDir, "筛选结果.json");
        
        console.log('读取评论文件:', commentsFile);
        console.log('读取关键词文件:', keywordsFile);
        
        // 读取评论数据
        const commentsData = JSON.parse(fs.readFileSync(commentsFile, 'utf8'));
        console.log('评论总数:', commentsData.length);
        
        // 读取关键词数据
        let keywords = [];
        if (fs.existsSync(keywordsFile)) {
            const keywordsData = JSON.parse(fs.readFileSync(keywordsFile, 'utf8'));
            keywords = keywordsData.keywords || [];
        }
        console.log('关键词列表:', keywords);
        
        // 如果没有关键词，直接返回
        if (keywords.length === 0) {
            filterStatus.status = '失败';
            filterStatus.currentAction = '无关键词';
            res.json({
                success: false,
                error: '请先添加关键词'
            });
            return;
        }
        
        // 过滤结果数组
        const result = [];
        
        // 逐个检查评论
        for (let i = 0; i < commentsData.length; i++) {
            // 检查是否需要停止
            if (filterStatus.status === '已停止') {
                console.log('🚫 收到停止命令，终止过滤');
                break;
            }
            
            const item = commentsData[i];
            console.log(`\n处理第 ${i + 1}/${commentsData.length} 条评论`);
            
            // 检查评论内容是否包含任何关键词
            const commentText = (item.text || '').toLowerCase();
            const containsKeyword = keywords.some(keyword => commentText.includes(keyword.toLowerCase()));
            
            if (containsKeyword) {
                console.log(`✅ 评论包含关键词，已添加到结果`);
                result.push(item);
            } else {
                console.log(`❌ 评论不包含关键词，跳过`);
            }
        }
        
        // 保存结果
        fs.writeFileSync(resultFile, JSON.stringify(result, null, 2), 'utf8');
        console.log('已保存筛选结果到:', resultFile);
        
        // 更新状态
        filterStatus.resultCount = result.length;
        filterStatus.status = '已完成';
        filterStatus.currentAction = '关键词过滤已完成';
        
        console.log('关键词过滤完成，结果数量:', filterStatus.resultCount);
        
        res.json({
            success: true,
            message: '关键词过滤功能已完成',
            data: {
                totalComments: commentsData.length,
                resultCount: result.length
            }
        });
        
    } catch (error) {
        console.error('启动关键词过滤失败:', error);
        filterStatus.status = '失败';
        filterStatus.currentAction = '关键词过滤执行失败';
        res.json({ success: false, error: error.message });
    }
});

// 启动粉丝数量过滤路由
app.post("/start-filter", async (req, res) => {
    try {
        console.log('正在启动粉丝数量过滤功能...');
        
        filterStatus.status = '运行中';
        filterStatus.currentAction = '正在执行粉丝数量过滤...';
        
        // 获取筛选条件
        const { maxFollowers, maxFollowing, delaySeconds } = req.body;
        
        if (!maxFollowers || !maxFollowing || !delaySeconds) {
            filterStatus.status = '失败';
            filterStatus.currentAction = '参数错误';
            res.json({
                success: false,
                error: '请提供最大粉丝数、最大关注数和间隔时间'
            });
            return;
        }
        
        // 读取评论数据
        const commentsFile = path.join(userDataDir, "全部评论.json");
        const keywordsFile = path.join(userDataDir, "keywords.json");
        const resultFile = path.join(userDataDir, "筛选结果.json");
        
        console.log('读取评论文件:', commentsFile);
        console.log('读取关键词文件:', keywordsFile);
        
        // 跳过关键词检查，直接基于粉丝和关注数量过滤
        
        // 读取评论数据
        const commentsData = JSON.parse(fs.readFileSync(commentsFile, 'utf8'));
        console.log('评论总数:', commentsData.length);
        
        // 启动浏览器进行实时检测
        console.log('🌐 启动浏览器...');
        const puppeteer = require('puppeteer');
        // 自动查找Chrome浏览器路径
        const chromePath = chromeFinder();
        
        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            userDataDir: browserUserDataDir,
            args: [
                '--start-maximized',
                '--window-position=0,0',
                '--window-size=1920,1080',
                '--disable-gpu',
                '--no-sandbox'
            ],
            // 使用自动找到的Chrome路径
            executablePath: chromePath
        });
        console.log('✅ 浏览器已启动，窗口可见');
        
        const page = await browser.newPage();
        
        // 延迟函数
        function delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        
        // 获取用户信息
        async function getUserInfo(userUrl) {
            try {
                console.log(`🔍 正在获取用户信息: ${userUrl}`);
                
                // 打开新标签页
                const newPage = await browser.newPage();
                
                // 设置页面可见性
                await newPage.bringToFront();
                
                // 访问用户主页
                console.log(`🌐 正在访问用户页面: ${userUrl}`);
                await newPage.goto(userUrl, { 
                    waitUntil: 'networkidle2',
                    timeout: 60000
                });
                console.log(`✅ 页面加载完成`);
                
                // 等待页面完全加载
                await delay(3000);
                
                // 检查并关闭登录弹窗
                console.log(`🔧 检查登录弹窗`);
                await newPage.evaluate(() => {
                    // 查找Instagram登录弹窗的关闭按钮（更精确的选择器）
                    const closeButtons = document.querySelectorAll(
                        '[aria-label="Close"], ' +
                        '[aria-label="关闭"], ' +
                        '[aria-label="Close this modal"], ' +
                        '.x1i10hfl.xjqpnuy.x2hbi6w.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1ypdohk.xdl72j9.x2lah0s.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.x2lwn1j.x78zum5.xdt5ytf.x1iyjqo2.x2ql1qa, ' +
                        'button[class*="_"], ' +
                        'div[role="button"], ' +
                        'svg[aria-label="Close"], ' +
                        'svg[aria-label="关闭"], ' +
                        '[data-testid="close-button"], ' +
                        '[data-testid="modal-close"]'
                    );
                    
                    console.log(`📊 找到 ${closeButtons.length} 个可能的关闭按钮`);
                    
                    for (const button of closeButtons) {
                        const text = button.innerText || button.textContent || '';
                        const ariaLabel = button.getAttribute('aria-label') || '';
                        const testId = button.getAttribute('data-testid') || '';
                        
                        console.log(`🔍 检查按钮: 文本="${text}", aria-label="${ariaLabel}", testid="${testId}"`);
                        
                        if (text.includes('Close') || text.includes('关闭') || text.includes('×') || 
                            ariaLabel.includes('Close') || ariaLabel.includes('关闭') ||
                            testId.includes('close') || testId.includes('Close')) {
                            button.click();
                            console.log('✅ 已关闭登录弹窗');
                            break;
                        }
                    }
                });
                await delay(3000);
                
                // 提取粉丝数量和关注数量
                console.log(`🔧 开始提取用户数据`);
                
                // 截图保存页面状态（调试用）
                await newPage.screenshot({ path: `screenshot_${Date.now()}.png`, fullPage: true });
                console.log(`📸 已保存页面截图`);
                
                const userInfo = await newPage.evaluate(() => {
                    console.log('📝 开始执行页面脚本');
                    
                    // 获取页面标题和URL
                    console.log(`🌐 页面标题: ${document.title}`);
                    console.log(`🔗 当前URL: ${window.location.href}`);
                    
                    // 定义辅助函数：将文本转换为数字（支持中文单位）
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
                    
                    // 方法1: 使用html-span选择器提取用户数据
                    console.log('🔍 尝试方法1: 使用html-span选择器');
                    const htmlSpans = document.querySelectorAll('span.html-span');
                    console.log('找到的html-span元素数量:', htmlSpans.length);
                    
                    const htmlSpanTexts = Array.from(htmlSpans).map(el => el.textContent?.trim()).filter(text => text);
                    console.log('html-span文本:', htmlSpanTexts);
                    
                    // 从html-span中提取前三个数字
                    const htmlNumbers = htmlSpanTexts.filter(text => /\d/.test(text));
                    console.log('html-span中的数字:', htmlNumbers);
                    
                    // 按照Instagram的标准顺序：帖子、粉丝、关注
                    // 根据测试结果，顺序应该是：帖子、粉丝、关注
                    if (htmlNumbers.length >= 1) {
                        posts = textToNumber(htmlNumbers[0]);
                    }
                    if (htmlNumbers.length >= 2) {
                        followers = textToNumber(htmlNumbers[1]);
                    }
                    if (htmlNumbers.length >= 3) {
                        following = textToNumber(htmlNumbers[2]);
                    }
                    
                    console.log('最终提取结果: 帖子', posts, ', 粉丝', followers, ', 关注', following);
                    return { posts, followers, following };
                });
                
                console.log(`✅ 用户信息获取成功：帖子 ${userInfo.posts}, 粉丝 ${userInfo.followers}, 关注 ${userInfo.following}`);
                
                // 更新全局变量，存储当前用户信息
                currentUserInfo = {
                    url: userUrl,
                    posts: userInfo.posts,
                    followers: userInfo.followers,
                    following: userInfo.following
                };
                
                // 如果获取到了数据，等待10秒让用户查看
                if (userInfo.followers || userInfo.following || userInfo.posts) {
                    console.log(`⏳ 等待用户查看数据...`);
                    await delay(10000);
                }
                
                // 如果没有获取到数据，等待更长时间再尝试
                if (!userInfo.posts && !userInfo.followers && !userInfo.following) {
                    console.log(`⏳ 未获取到数据，等待后重试...`);
                    await delay(15000);
                    
                    const retryInfo = await newPage.evaluate(() => {
                        // 获取所有包含数字的元素（更通用的选择器）
                        const allElements = document.querySelectorAll('span, div');
                        const numberElements = [];
                        
                        for (const element of allElements) {
                            const text = element.textContent || '';
                            const trimmedText = text.trim();
                            // 只保留包含数字的文本
                            if (trimmedText && /[\d万亿]/.test(trimmedText)) {
                                numberElements.push(trimmedText);
                            }
                        }
                        
                        let posts = null;
                        let followers = null;
                        let following = null;
                        
                        // 按顺序：第一个是帖子数，第二个是粉丝数，第三个是关注数
                        if (numberElements.length >= 1) {
                            posts = parseInt(numberElements[0].replace(/[,.]/g, ''));
                        }
                        if (numberElements.length >= 2) {
                            followers = parseInt(numberElements[1].replace(/[,.]/g, ''));
                        }
                        if (numberElements.length >= 3) {
                            following = parseInt(numberElements[2].replace(/[,.]/g, ''));
                        }
                        
                        return { posts, followers, following };
                    });
                    
                    if (retryInfo.followers || retryInfo.following || retryInfo.posts) {
                        console.log(`✅ 重试成功: 帖子 ${retryInfo.posts}, 粉丝 ${retryInfo.followers}, 关注 ${retryInfo.following}`);
                        // 更新全局变量，存储当前用户信息
                        currentUserInfo = {
                            url: userUrl,
                            posts: retryInfo.posts,
                            followers: retryInfo.followers,
                            following: retryInfo.following
                        };
                        // 等待一段时间，让用户可以看到数据
                        console.log(`⏳ 等待用户查看数据...`);
                        await delay(3000);
                        await newPage.close();
                        return retryInfo;
                    }
                }
                
                // 关闭页面后再返回
                await newPage.close();
                return userInfo;
            } catch (error) {
                console.error(`❌ 获取用户信息失败 (${userUrl}): ${error.message}`);
                console.error(`📋 错误堆栈: ${error.stack}`);
                return { posts: null, followers: null, following: null };
            }
        }
        
        // 过滤结果数组
        const result = [];
        
        // 逐个检查用户
        for (let i = 0; i < commentsData.length; i++) {
            // 检查是否需要停止
            if (filterStatus.status === '已停止') {
                console.log('🚫 收到停止命令，终止过滤');
                break;
            }
            
            const item = commentsData[i];
            console.log(`\n处理第 ${i + 1}/${commentsData.length} 条数据`);
            
            // 跳过关键词检查，只基于粉丝和关注数量过滤
            
            // 如果没有用户URL，跳过
            if (!item.userUrl) {
                console.log('❌ 跳过：无用户URL');
                continue;
            }
            
            // 获取用户实际的粉丝数和关注数
            const userInfo = await getUserInfo(item.userUrl);
            
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
                    followers: userInfo.followers,
                    following: userInfo.following
                };
                result.push(filteredItem);
                console.log(`✅ 符合条件，已添加到结果`);
            }
            
            // 添加延迟，使用用户设置的间隔时间
            const delayMs = parseInt(delaySeconds) * 1000;
            console.log(`⏳ 等待 ${delaySeconds} 秒...`);
            await delay(delayMs);
        }
        
        // 关闭浏览器
        await browser.close();
        console.log('🌐 浏览器已关闭');
        
        // 保存结果
        fs.writeFileSync(resultFile, JSON.stringify(result, null, 2), 'utf8');
        console.log('已保存筛选结果到:', resultFile);
        
        // 更新状态
        filterStatus.resultCount = result.length;
        filterStatus.status = '已完成';
        filterStatus.currentAction = '过滤已完成';
        
        console.log('过滤完成，结果数量:', filterStatus.resultCount);
        
        res.json({
            success: true,
            message: '过滤功能已完成',
            data: {
                totalUsers: commentsData.length,
                resultCount: result.length
            }
        });
        
    } catch (error) {
        console.error('启动过滤失败:', error);
        filterStatus.status = '失败';
        filterStatus.currentAction = '过滤执行失败';
        res.json({ success: false, error: error.message });
    }
});

// 启动评论抓取工具路由
app.post("/start-capture", async (req, res) => {
    try {
        console.log('正在启动评论抓取工具...');
        
        const { exec } = require('child_process');
        const path = require('path');
        const fs = require('fs');
        
        // 使用应用根目录
        const currentDir = appRoot;
        
        // 构建c.js文件路径
        const cjsPath = path.join(currentDir, 'js', 'c.js');
        
        // 检查文件是否存在
        if (!fs.existsSync(cjsPath)) {
            console.error('评论抓取工具文件不存在:', cjsPath);
            res.json({ success: false, error: '评论抓取工具文件不存在，请确保js文件夹和c.js文件已存在' });
            return;
        }
        
        // 使用node来运行js文件
        const command = `powershell -Command "Start-Process powershell -ArgumentList '-NoExit', 'cd ${currentDir.replace(/\\/g, '\\\\')}; & node ${cjsPath.replace(/\\/g, '\\\\')}' -WindowStyle Normal"`;
        
        console.log('执行命令:', command);
        
        exec(command, {
            cwd: currentDir,
            detached: true,
            stdio: 'ignore'
        }, (error, stdout, stderr) => {
            if (error) {
                console.error('启动评论抓取工具失败:', error);
                res.json({ success: false, error: error.message });
                return;
            }
            
            console.log('评论抓取工具已启动');
            res.json({
                success: true,
                message: '评论抓取工具已启动，正在新窗口中运行'
            });
        });
        
    } catch (error) {
        console.error('启动评论抓取工具失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 清空过滤结果路由
app.post("/clear-filter-result", async (req, res) => {
    try {
        console.log('正在清空过滤结果...');
        
        const filterResultFile = path.join(userDataDir, "筛选结果.json");
        
        if (fs.existsSync(filterResultFile)) {
            fs.writeFileSync(filterResultFile, JSON.stringify([], null, 2), 'utf8');
            console.log(`已清空文件: ${filterResultFile}`);
        }
        
        // 更新过滤状态
        filterStatus.resultCount = 0;
        
        console.log('过滤结果清空完成');
        res.json({
            success: true,
            message: '过滤结果已清空'
        });
        
    } catch (error) {
        console.error('清空过滤结果失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 去重过滤结果路由
app.post("/deduplicate-filter-result", async (req, res) => {
    try {
        console.log('正在去重过滤结果...');
        
        const filterResultFile = path.join(userDataDir, "筛选结果.json");
        
        if (!fs.existsSync(filterResultFile)) {
            console.error('过滤结果文件不存在:', filterResultFile);
            res.json({ success: false, error: '过滤结果文件不存在' });
            return;
        }
        
        // 读取现有数据
        const existingData = JSON.parse(fs.readFileSync(filterResultFile, 'utf8'));
        const originalCount = existingData.length;
        
        // 使用Set去重，基于userUrl
        const uniqueUrls = new Set();
        const deduplicatedData = existingData.filter(item => {
            if (!item.userUrl || uniqueUrls.has(item.userUrl)) {
                return false;
            }
            uniqueUrls.add(item.userUrl);
            return true;
        });
        
        const deduplicatedCount = deduplicatedData.length;
        
        // 保存去重后的数据
        fs.writeFileSync(filterResultFile, JSON.stringify(deduplicatedData, null, 2), 'utf8');
        
        // 更新过滤状态
        filterStatus.resultCount = deduplicatedCount;
        
        console.log(`过滤结果去重完成，原数量: ${originalCount}, 去重后: ${deduplicatedCount}`);
        res.json({
            success: true,
            message: '过滤结果去重完成',
            data: {
                originalCount: originalCount,
                deduplicatedCount: deduplicatedCount
            }
        });
        
    } catch (error) {
        console.error('去重过滤结果失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 停止过滤路由
app.post("/stop-filter", async (req, res) => {
    try {
        console.log('正在停止过滤...');
        
        // 更新过滤状态为已停止
        filterStatus.status = '已停止';
        filterStatus.currentAction = '过滤已停止';
        
        console.log('过滤已停止');
        res.json({
            success: true,
            message: '过滤已停止'
        });
        
    } catch (error) {
        console.error('停止过滤失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 清空全部数据路由
app.post("/clear-all-data", async (req, res) => {
    try {
        console.log('正在清空全部数据...');
        
        const filesToClear = [
            path.join(userDataDir, "筛选结果.json"),
            path.join(userDataDir, "全部评论.json"),
            path.join(userDataDir, "follow-progress.json")
        ];
        
        filesToClear.forEach(filePath => {
            if (fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf8');
                console.log(`已清空文件: ${filePath}`);
            }
        });
        
        // 更新过滤状态
        filterStatus = {
            status: '未开始',
            currentAction: '等待开始',
            totalUsers: 0,
            resultCount: 0
        };
        
        console.log('数据清空完成');
        res.json({
            success: true,
            message: '全部数据已清空'
        });
        
    } catch (error) {
        console.error('清空数据失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 只有当文件被直接运行时才启动服务器
if (require.main === module) {
    // ✅ 打包环境不启动服务（解决一打包就启动）
    const isPackaged = process.mainModule.filename.includes('app.asar') || 
                       process.execPath.includes('electron-builder');
    
    if (!isPackaged) {
        // 启动服务器
        app.listen(PORT, async () => {
            console.log(`Instagram自动化工具服务器启动成功`);
            console.log(`访问地址: http://localhost:${PORT}`);
            console.log(`====================================`);
            
            // 使用系统已安装的Chrome浏览器，无需自动下载
            
            // 自动打开浏览器访问控制页面
            const { exec } = require('child_process');
            exec(`start http://localhost:${PORT}`, (error) => {
                if (error) {
                    console.log('无法自动打开浏览器，请手动访问 http://localhost:${PORT}');
                }
            });
        });
    } else {
        console.log('✅ 打包模式：不启动服务');
    }
}