const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const schedule = require("node-schedule");

const COOKIE_FILE = path.join(path.dirname(__dirname), "cookie.txt");
const CHROME_PROFILE = path.join(path.dirname(__dirname), "chrome-profile-1774327512015");
const app = express();
const PORT = 3002;

let browserInstance = null;

const tasksFile = path.join(path.dirname(__dirname), "json", "tasks.json");
const taskStatusFile = path.join(path.dirname(__dirname), "json", "task-status.json");

if (!fs.existsSync(path.join(path.dirname(__dirname), "json"))) {
    fs.mkdirSync(path.join(path.dirname(__dirname), "json"), { recursive: true });
}

if (!fs.existsSync(tasksFile)) {
    fs.writeFileSync(tasksFile, JSON.stringify([]), 'utf8');
}

if (!fs.existsSync(taskStatusFile)) {
    fs.writeFileSync(taskStatusFile, JSON.stringify({}), 'utf8');
}

const taskJobs = new Map();

let executionStatus = {
    status: 'idle',
    totalUsers: 0,
    currentCount: 0,
    progress: 0,
    currentAction: '等待开始'
};

function loadTasks() {
    try {
        const content = fs.readFileSync(tasksFile, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error('加载任务失败:', error);
        return [];
    }
}

function saveTasks(tasks) {
    try {
        fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2), 'utf8');
    } catch (error) {
        console.error('保存任务失败:', error);
    }
}

function loadTaskStatus() {
    try {
        const content = fs.readFileSync(taskStatusFile, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error('加载任务执行状态失败:', error);
        return {};
    }
}

function saveTaskStatus(status) {
    try {
        fs.writeFileSync(taskStatusFile, JSON.stringify(status, null, 2), 'utf8');
    } catch (error) {
        console.error('保存任务执行状态失败:', error);
    }
}

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

function startTaskScheduler() {
    const tasks = loadTasks();
    tasks.forEach(task => {
        scheduleTask(task);
    });
}

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
app.use(express.static(path.join(path.dirname(__dirname), "html"), {
    setHeaders: function(res, path) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
}));

// 根路径重定向到登录页面
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

async function openTiktok() {
    console.log("正在打开TikTok...");
    
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ["--start-maximized"]
    });
    
    const page = await browser.newPage();
    
    try {
        await page.goto("https://www.tiktok.com", {
            waitUntil: "networkidle2",
            timeout: 60000
        });
        
        console.log("TikTok已打开，请在浏览器中登录");
        
        browserInstance = { browser, page };
        
        return true;
    } catch (error) {
        console.error("打开TikTok失败:", error);
        await browser.close();
        throw error;
    }
}

async function saveCookie() {
    console.log("正在保存Cookie...");
    
    if (!browserInstance) {
        console.error("请先打开TikTok登录页面");
        throw new Error("请先打开TikTok登录页面");
    }
    
    const { browser, page } = browserInstance;
    
    try {
        console.log("请确保已登录TikTok...");
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
    
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ["--start-maximized"]
    });
    
    const page = await browser.newPage();
    
    try {
        const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, "utf8"));
        
        await page.setCookie(...cookies);
        
        await page.goto("https://www.tiktok.com", {
            waitUntil: "networkidle2",
            timeout: 60000
        });
        
        console.log("已携带Cookie登录TikTok");
        
        return true;
    } catch (error) {
        console.error("携带Cookie登录失败:", error);
        await browser.close();
        throw error;
    }
}

app.get("/open-tiktok", async (req, res) => {
    try {
        await openTiktok();
        res.json({ success: true, message: "TikTok已打开，请在新窗口中登录" });
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
        res.json({ success: true, message: "已携带Cookie登录TikTok" });
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
    
    const filterResultFile = path.join(path.dirname(__dirname), "json", "筛选结果.json");
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
    
    const progressFile = path.join(path.dirname(__dirname), "json", "follow-progress.json");
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
                        "button[class*='关闭']",
                        ".close-btn",
                        ".btn-close",
                        "[aria-label*='关闭']",
                        ".x1yx2hs2",
                        ".x1xmf6yo",
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
                    "[data-e2e='user-info-follow-btn']",
                    "[data-e2e='user-info-follow-button']", 
                    "[data-e2e='follow-button']", 
                    "button[data-e2e='user-info-follow-btn']",
                    ".semi-button.semi-button-primary",
                    ".semi-button-primary",
                    ".tIwhKJF7",
                    ".dGq2GnTL",
                    "button:has-text('Follow')", 
                    "button:contains('Follow')", 
                    ".semi-button-primary:has-text('Follow')", 
                    "div[role='button']:has-text('Follow')", 
                    "button[type='button']:has(span:contains('Follow'))",
                    "[class*='follow']",
                    "[class*='Follow']"
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
                
                if (buttonText === 'Following' || buttonText === '已关注') {
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
            message: `自动关注完成，共关注 ${result.attemptCount} 个用户，下次从第 ${result.progress + 1} 个开始`,
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
        const keywordsConfigPath = path.join(path.dirname(__dirname), "json", "keywords.json");
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
        
        const keywordsConfigPath = path.join(path.dirname(__dirname), "json", "keywords.json");
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
        
        const keywordsConfigPath = path.join(path.dirname(__dirname), "json", "keywords.json");
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
        const keywordsConfigPath = path.join(path.dirname(__dirname), "json", "keywords.json");
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

app.get("/start-filter", async (req, res) => {
    try {
        const { exec } = require('child_process');
        
        console.log('正在启动过滤功能...');
        
        filterStatus.status = '运行中';
        filterStatus.currentAction = '正在执行过滤...';
        
        const child = exec('node js/gl.js', {
            cwd: path.dirname(__dirname),
            detached: true,
            stdio: 'ignore'
        });
        
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

app.get("/get-filter-status", async (req, res) => {
    try {
        console.log('开始获取过滤状态...');
        
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
        
        const resultFile = path.join(path.dirname(__dirname), "json", "筛选结果.json");
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
        res.json({ success: false, error: error.message });
    }
});

app.get("/get-initial-status", async (req, res) => {
    try {
        const filterResultFile = path.join(path.dirname(__dirname), "json", "筛选结果.json");
        if (!fs.existsSync(filterResultFile)) {
            throw new Error("筛选结果.json 文件不存在");
        }
        
        const filterResult = JSON.parse(fs.readFileSync(filterResultFile, "utf8"));
        if (!filterResult || !Array.isArray(filterResult)) {
            throw new Error("筛选结果.json 文件格式错误");
        }
        
        const progressFile = path.join(path.dirname(__dirname), "json", "follow-progress.json");
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

app.post("/start-capture", async (req, res) => {
    try {
        console.log('正在启动评论抓取工具...');
        
        const { exec } = require('child_process');
        
        const command = 'powershell -Command "Start-Process powershell -ArgumentList \'-NoExit -Command \"d:; cd \\weibo\\tiktok\\js; node c.js\"\' -WindowStyle Normal"';
        
        console.log('执行命令:', command);
        
        exec(command, {
            cwd: __dirname,
            detached: true,
            stdio: 'ignore'
        }, (error, stdout, stderr) => {
            if (error) {
                console.error('启动评论抓取工具失败:', error);
                res.json({ success: false, error: error.message });
            } else {
                console.log('评论抓取工具已启动');
                res.json({ success: true, message: '评论抓取工具已启动，请在新窗口中操作' });
            }
        });
        
    } catch (error) {
        console.error('启动评论抓取工具失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 清空全部评论
app.post('/clear-all-comments', async (req, res) => {
    try {
        const commentsFile = path.join(path.dirname(__dirname), "json", "全部评论.json");
        
        if (fs.existsSync(commentsFile)) {
            fs.writeFileSync(commentsFile, '[]');
            res.json({ success: true, message: '全部评论已清空' });
        } else {
            res.json({ success: true, message: '评论文件不存在，无需清空' });
        }
        
    } catch (error) {
        console.error('清空全部评论失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 清空筛选评论
app.post('/clear-filter-results', async (req, res) => {
    try {
        const filterResultFile = path.join(path.dirname(__dirname), "json", "筛选结果.json");
        
        if (fs.existsSync(filterResultFile)) {
            fs.writeFileSync(filterResultFile, '[]');
            res.json({ success: true, message: '筛选评论已清空' });
        } else {
            res.json({ success: true, message: '筛选结果文件不存在，无需清空' });
        }
        
    } catch (error) {
        console.error('清空筛选评论失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 获取任务列表
app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = loadTasks();
        res.json({
            success: true,
            data: tasks
        });
    } catch (error) {
        console.error('获取任务失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 添加定时任务
app.post('/api/tasks', async (req, res) => {
    try {
        const { time } = req.body;
        if (!time) {
            return res.json({ success: false, error: '请提供执行时间' });
        }

        const tasks = loadTasks();
        const newTask = {
            id: `task-${Date.now()}`,
            time,
            skill: 'autoFollow' // 固定为自动关注技能
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
        console.error('添加定时任务失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 删除定时任务
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tasks = loadTasks();
        
        const taskIndex = tasks.findIndex(task => task.id === id);
        if (taskIndex !== -1) {
            const taskToDelete = tasks[taskIndex];
            
            // 取消任务调度
            if (taskJobs.has(taskToDelete.id)) {
                taskJobs.get(taskToDelete.id).cancel();
                taskJobs.delete(taskToDelete.id);
            }
            
            // 删除任务
            tasks.splice(taskIndex, 1);
            saveTasks(tasks);
            
            res.json({
                success: true,
                message: '任务删除成功'
            });
        } else {
            res.json({ success: false, error: '任务不存在' });
        }
    } catch (error) {
        console.error('删除定时任务失败:', error);
        res.json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`服务器启动成功，端口: ${PORT}`);
    console.log(`访问地址: http://localhost:${PORT}/login.html`);
    startTaskScheduler();
});
