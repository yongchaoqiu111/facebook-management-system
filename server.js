const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { chromium } = require('playwright');
const cheerio = require('cheerio');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');

// 全局初始化LLM客户端
let llmClient = null;
try {
    const { llmClient: client } = require('./core/llm/llm-client.js');
    llmClient = client;
    console.log('✅ LLM客户端初始化成功');
} catch (error) {
    console.error('❌ LLM客户端初始化失败:', error.message);
}

// 全局存储浏览器实例
const browserInstances = {};

const app = express();
const server = http.createServer(app);
const port = 3000;

// 静态文件服务
app.use(express.static('public'));

// 解析 JSON 请求体
app.use(express.json());

// CORS配置
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
});

// Instagram下载API路由
app.post('/api/instagram/download', async (req, res) => {
    try {
        console.log('接收到Instagram下载请求:', req.body);
        
        const { username } = req.body;
        
        if (!username) {
            return res.json({
                code: 400,
                data: {
                    message: '用户名不能为空'
                }
            });
        }
        
        // 导入Instagram下载功能
        const { downloadInstagramMedia } = require('./skills/instagram/instagram-download.js');
        
        // 执行下载
        const result = await downloadInstagramMedia({
            username: username,
            loginTimeoutSeconds: 60,
            downloadLimit: 50
        });
        
        res.json(result);
        
    } catch (error) {
        console.error('Instagram下载请求处理失败:', error);
        res.json({
            code: 500,
            data: {
                message: error.message
            }
        });
    }
});

// 任务存储文件
const tasksFile = path.join(__dirname, 'data', 'tasks.json');
// 任务执行状态文件
const taskStatusFile = path.join(__dirname, 'data', 'task-status.json');

// 确保数据目录存在
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// 初始化任务存储
if (!fs.existsSync(tasksFile)) {
    fs.writeFileSync(tasksFile, JSON.stringify([]), 'utf8');
}

// 初始化任务执行状态存储
if (!fs.existsSync(taskStatusFile)) {
    fs.writeFileSync(taskStatusFile, JSON.stringify({}), 'utf8');
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

// 任务调度器
const taskJobs = new Map();

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
    console.log(`执行任务: ${task.time} - ${task.skill}`);
    
    // 更新任务执行状态为开始
    updateTaskStatus(task.id, {
        status: 'running',
        startTime: new Date().toISOString()
    });
    
    try {
        // 根据技能类型执行不同的任务
        switch (task.skill) {
            // Facebook 技能
            case 'facebook-login':
                // 执行 Facebook 登录任务
                const { loginToFacebook } = require('./dist/skills/facebook/facebook-skills');
                await loginToFacebook({ timeoutSeconds: 180 });
                break;
            case 'facebook-auto-post':
                // 执行 Facebook 自动发帖任务
                const { postToFacebookReal } = require('./skills/facebook/facebook-post-real.js');
                
                // 从文件读取文本内容（更新路径：从user-config/assets/facebook/tiezi读取）
                const facebookAssetsDir = path.join(__dirname, 'user-config', 'assets', 'facebook');
                const tieziDir = path.join(facebookAssetsDir, 'tiezi');
                let postText = '测试 Facebook 发帖功能';
                
                if (fs.existsSync(tieziDir)) {
                    // 读取所有文本文件（1.txt, 2.txt, 3.txt...）
                    const textFiles = fs.readdirSync(tieziDir).filter(file => {
                        return file.endsWith('.txt');
                    }).sort((a, b) => {
                        const aNum = parseInt(a.split('.')[0]);
                        const bNum = parseInt(b.split('.')[0]);
                        if (!isNaN(aNum) && !isNaN(bNum)) {
                            return aNum - bNum;
                        }
                        return a.localeCompare(b);
                    });
                    
                    if (textFiles.length > 0) {
                        // 加载并更新文本索引（新结构：放在user-config目录）
                        const textIndexFile = path.join(__dirname, 'user-config', 'text-index.json');
                        let lastIndex = 0;
                        if (fs.existsSync(textIndexFile)) {
                            try {
                                const content = fs.readFileSync(textIndexFile, 'utf8');
                                const data = JSON.parse(content);
                                lastIndex = data.lastIndex || 0;
                            } catch (error) {
                                console.error('加载文本索引失败:', error);
                            }
                        }
                        
                        // 轮回选择文本文件
                        const selectedTextFile = path.join(tieziDir, textFiles[lastIndex % textFiles.length]);
                        lastIndex++;
                        
                        // 保存文本索引
                        try {
                            const data = { lastIndex };
                            fs.writeFileSync(textIndexFile, JSON.stringify(data, null, 2), 'utf8');
                        } catch (error) {
                            console.error('保存文本索引失败:', error);
                        }
                        
                        // 读取选中的文本文件内容
                        try {
                            postText = fs.readFileSync(selectedTextFile, 'utf8').trim();
                            console.log('成功读取文本文件:', selectedTextFile);
                        } catch (error) {
                            console.error('读取文本文件失败:', error);
                        }
                    }
                }
                
                // 选择图片（更新路径：从user-config/assets/facebook/images读取）
                const imagesDir = path.join(facebookAssetsDir, 'images');
                let selectedImage = null;
                if (fs.existsSync(imagesDir)) {
                    const files = fs.readdirSync(imagesDir).filter(file => {
                        const ext = path.extname(file).toLowerCase();
                        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
                    }).sort((a, b) => {
                        const aName = path.basename(a, path.extname(a));
                        const bName = path.basename(b, path.extname(b));
                        const aNum = parseInt(aName);
                        const bNum = parseInt(bName);
                        if (!isNaN(aNum) && !isNaN(bNum)) {
                            return aNum - bNum;
                        }
                        return a.localeCompare(b);
                    });
                    
                    if (files.length > 0) {
                        // 加载并更新图片索引（新结构：放在user-config目录）
                        const imageIndexFile = path.join(__dirname, 'user-config', 'image-index.json');
                        let lastIndex = 0;
                        if (fs.existsSync(imageIndexFile)) {
                            try {
                                const content = fs.readFileSync(imageIndexFile, 'utf8');
                                const data = JSON.parse(content);
                                lastIndex = data.lastIndex || 0;
                            } catch (error) {
                                console.error('加载图片索引失败:', error);
                            }
                        }
                        
                        // 轮回选择图片
                        selectedImage = path.join(imagesDir, files[lastIndex % files.length]);
                        lastIndex++;
                        
                        // 保存图片索引
                        try {
                            const data = { lastIndex };
                            fs.writeFileSync(imageIndexFile, JSON.stringify(data, null, 2), 'utf8');
                        } catch (error) {
                            console.error('保存图片索引失败:', error);
                        }
                    }
                }
                
                // 发布到Facebook
                const postParams = {
                    text: postText,
                    publish: true
                };
                
                if (selectedImage) {
                    postParams.imagePaths = [selectedImage];
                }
                
                await postToFacebookReal(postParams);
                break;
            case 'instagram-auto-post':
                // 执行 Instagram 自动发帖任务
                const { postToInstagram } = require('./skills/instagram/instagram-post.js');
                
                // 从文件读取文本内容（从user-config/assets/instgram/tiezi读取）
                const instagramAssetsDir = path.join(__dirname, 'user-config', 'assets', 'instgram');
                const tieziDirIg = path.join(instagramAssetsDir, 'tiezi');
                let postTextIg = '测试 Instagram 发帖功能';
                
                if (fs.existsSync(tieziDirIg)) {
                    // 读取所有文本文件（1.txt, 2.txt, 3.txt...）
                    const textFilesIg = fs.readdirSync(tieziDirIg).filter(file => {
                        return file.endsWith('.txt');
                    }).sort((a, b) => {
                        const aNum = parseInt(a.split('.')[0]);
                        const bNum = parseInt(b.split('.')[0]);
                        if (!isNaN(aNum) && !isNaN(bNum)) {
                            return aNum - bNum;
                        }
                        return a.localeCompare(b);
                    });
                    
                    if (textFilesIg.length > 0) {
                        // 加载并更新文本索引（放在user-config目录）
                        const textIndexFileIg = path.join(__dirname, 'user-config', 'text-index-ig.json');
                        let lastIndexIg = 0;
                        if (fs.existsSync(textIndexFileIg)) {
                            try {
                                const content = fs.readFileSync(textIndexFileIg, 'utf8');
                                const data = JSON.parse(content);
                                lastIndexIg = data.lastIndex || 0;
                            } catch (error) {
                                console.error('加载Instagram文本索引失败:', error);
                            }
                        }
                        
                        // 轮回选择文本文件
                        const selectedTextFileIg = path.join(tieziDirIg, textFilesIg[lastIndexIg % textFilesIg.length]);
                        lastIndexIg++;
                        
                        // 保存文本索引
                        try {
                            const data = { lastIndex: lastIndexIg };
                            fs.writeFileSync(textIndexFileIg, JSON.stringify(data, null, 2), 'utf8');
                        } catch (error) {
                            console.error('保存Instagram文本索引失败:', error);
                        }
                        
                        // 读取选中的文本文件内容
                        try {
                            postTextIg = fs.readFileSync(selectedTextFileIg, 'utf8').trim();
                            console.log('成功读取Instagram文本文件:', selectedTextFileIg);
                        } catch (error) {
                            console.error('读取Instagram文本文件失败:', error);
                        }
                    }
                }
                
                // 选择图片（从user-config/assets/instgram/images读取）
                const imagesDirIg = path.join(instagramAssetsDir, 'images');
                let selectedImageIg = null;
                if (fs.existsSync(imagesDirIg)) {
                    const filesIg = fs.readdirSync(imagesDirIg).filter(file => {
                        const ext = path.extname(file).toLowerCase();
                        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
                    }).sort((a, b) => {
                        const aName = path.basename(a, path.extname(a));
                        const bName = path.basename(b, path.extname(b));
                        const aNum = parseInt(aName);
                        const bNum = parseInt(bName);
                        if (!isNaN(aNum) && !isNaN(bNum)) {
                            return aNum - bNum;
                        }
                        return a.localeCompare(b);
                    });
                    
                    if (filesIg.length > 0) {
                        // 加载并更新图片索引（放在user-config目录）
                        const imageIndexFileIg = path.join(__dirname, 'user-config', 'image-index-ig.json');
                        let lastIndexIg = 0;
                        if (fs.existsSync(imageIndexFileIg)) {
                            try {
                                const content = fs.readFileSync(imageIndexFileIg, 'utf8');
                                const data = JSON.parse(content);
                                lastIndexIg = data.lastIndex || 0;
                            } catch (error) {
                                console.error('加载Instagram图片索引失败:', error);
                            }
                        }
                        
                        // 轮回选择图片
                        selectedImageIg = path.join(imagesDirIg, filesIg[lastIndexIg % filesIg.length]);
                        lastIndexIg++;
                        
                        // 保存图片索引
                        try {
                            const data = { lastIndex: lastIndexIg };
                            fs.writeFileSync(imageIndexFileIg, JSON.stringify(data, null, 2), 'utf8');
                        } catch (error) {
                            console.error('保存Instagram图片索引失败:', error);
                        }
                    }
                }
                
                // 发布到Instagram
                const postParamsIg = {
                    text: postTextIg,
                    publish: true
                };
                
                if (selectedImageIg) {
                    postParamsIg.imagePaths = [selectedImageIg];
                }
                
                await postToInstagram(postParamsIg);
                break;
            case 'instagram-download-media':
                // 执行 Instagram 媒体下载任务
                const { downloadInstagramMedia } = require('./skills/instagram/instagram-download.js');
                
                // 获取用户名参数（从任务数据中提取）
                const username = task.data?.username || 'seeeeiiiiraaaa';
                
                await downloadInstagramMedia({
                    username: username,
                    loginTimeoutSeconds: 60,
                    downloadLimit: 50
                });
                break;
            case 'facebook-close-window':
                // 执行关闭浏览器窗口任务
                const { closeFacebookWindow } = require('./skills/facebook/facebook-close-window.js');
                await closeFacebookWindow();
                break;
            case 'hot-search-interact':
                // 执行热搜词二次交互任务
                console.log('=== 开始执行热搜词二次交互技能 ===');
                try {
                    console.log('正在加载热搜词二次交互技能模块...');
                    const { interactHotSearch } = require('./skills/hot-search/hot-search-interact.js');
                    console.log('技能模块加载成功');
                    
                    console.log('正在执行热搜词二次交互技能...');
                    const result = await interactHotSearch({
                        skillId: 'hot-search-interact',
                        traceId: `hot-search-interact-${Date.now()}`
                    });
                    console.log('热搜词二次交互技能执行完成，结果:', result);
                } catch (error) {
                    console.error('热搜词二次交互技能执行失败:', error);
                    console.error('错误堆栈:', error.stack);
                    throw error;
                }
                console.log('=== 热搜词二次交互技能执行完成 ===');
                break;
            case 'facebook-interact':
                // 执行 Facebook 互动任务
                const { interactFacebook } = require('./dist/skills/facebook/facebook-skills');
                await interactFacebook({ 
                    action: 'like', 
                    postId: 'test-post-id' 
                });
                break;
            case 'facebook-comment-intercept':
                // 执行 Facebook 评论截流任务
                const { searchFacebook } = require('./skills/facebook/facebook-search.js');
                await searchFacebook({ 
                    maxPosts: 10 
                });
                break;
            case 'facebook-join-groups':
                // 执行 Facebook 加入小组任务
                const { autoJoinFacebookGroups } = require('./skills/facebook/facebook-auto-join-groups.js');
                await autoJoinFacebookGroups({ maxGroups: 1 });
                break;
            case 'facebook-post-analysis':
                // 执行 Facebook 帖子分析任务
                const { analyzeFacebookPosts } = require('./skills/facebook/facebook-post-analysis.js');
                await analyzeFacebookPosts();
                break;
            case 'facebook-auto-comment':
                // 执行 Facebook 自动评论任务
                console.log('=== 开始执行 Facebook 自动评论技能 ===');
                try {
                    const skillPath = './skills/facebook/facebook-post-analyze-comment.js';
                    console.log('检查技能文件是否存在:', skillPath);
                    if (!fs.existsSync(path.join(__dirname, skillPath))) {
                        throw new Error('技能文件不存在');
                    }
                    console.log('技能文件存在');
                    
                    console.log('正在加载技能模块...');
                    delete require.cache[require.resolve(skillPath)];
                    const skillModule = require(skillPath);
                    console.log('技能模块加载成功，导出的函数:', Object.keys(skillModule));
                    
                    if (!skillModule.analyzeAndCommentFacebookPosts) {
                        throw new Error('技能模块没有导出 analyzeAndCommentFacebookPosts 函数');
                    }
                    console.log('确认函数存在');
                    
                    console.log('正在执行技能...');
                    const result = await skillModule.analyzeAndCommentFacebookPosts();
                    console.log('技能执行完成，结果:', result);
                    
                    if (result && result.code === 0) {
                        console.log('技能执行成功');
                    } else {
                        console.log('技能执行返回非成功状态:', result);
                    }
                } catch (error) {
                    console.error('技能执行失败:', error.message);
                    console.error('错误堆栈:', error.stack);
                    throw error;
                }
                console.log('=== Facebook 自动评论技能执行完成 ===');
                break;
                
            case 'facebook-auto-like':
                // 执行 Facebook 自动点赞任务
                console.log('=== 开始执行 Facebook 自动点赞技能 ===');
                try {
                    const { autoLikeFacebook } = require('./skills/facebook/facebook-auto-like.js');
                    await autoLikeFacebook();
                } catch (error) {
                    console.error('技能执行失败:', error);
                    console.error('错误堆栈:', error.stack);
                    throw error;
                }
                console.log('=== Facebook 自动点赞技能执行完成 ===');
                break;
            

            
            // 其他技能

            case 'hot-search-explorer':
                // 执行热搜词探索任务
                console.log('=== 开始执行热搜词探索技能 ===');
                try {
                    console.log('正在加载热搜词探索技能模块...');
                    const { exploreHotSearch } = require('./skills/hot-search/hot-search-explorer.js');
                    console.log('技能模块加载成功');
                    
                    console.log('正在执行热搜词探索技能...');
                    const result = await exploreHotSearch({ skillId: 'hot-search-explorer', traceId: `task-${Date.now()}` });
                    console.log('热搜词探索技能执行完成，结果:', result);
                } catch (error) {
                    console.error('热搜词探索技能执行失败:', error);
                    console.error('错误堆栈:', error.stack);
                    throw error;
                }
                console.log('=== 热搜词探索技能执行完成 ===');
                break;

            case 'facebook-auto-message':
                // 执行Facebook自动私信任务
                console.log('=== 开始执行Facebook自动私信技能 ===');
                try {
                    console.log('正在加载Facebook自动私信技能模块...');
                    const { maintainSixin } = require('./dist/skills/sixin/sixin-maintenance');
                    console.log('技能模块加载成功');
                    
                    console.log('正在执行Facebook自动私信技能...');
                    const result = await maintainSixin({
                        skillId: 'facebook-auto-message',
                        traceId: `task-${Date.now()}`
                    });
                    console.log('Facebook自动私信技能执行完成，结果:', result);
                    
                    // 更新统计数据
                    const stats = loadSixinStats();
                    stats.totalCount += result.data.processedCount;
                    stats.successCount += result.data.successCount;
                    
                    // 更新今日维护数
                    const today = new Date().toISOString().split('T')[0];
                    if (!stats.lastMaintenance || stats.lastMaintenance !== today) {
                        stats.todayCount = result.data.processedCount;
                        stats.lastMaintenance = today;
                    } else {
                        stats.todayCount += result.data.processedCount;
                    }
                    
                    // 更新待处理数
                    stats.pendingCount = Math.max(0, stats.pendingCount - result.data.processedCount);
                    
                    saveSixinStats(stats);
                } catch (error) {
                    console.error('Facebook自动私信技能执行失败:', error);
                    console.error('错误堆栈:', error.stack);
                    throw error;
                }
                console.log('=== Facebook自动私信技能执行完成 ===');
                break;
            case 'llm-document-analysis':
                // 执行 LLM 文档分析任务
                console.log('执行 LLM 文档分析任务');
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

// 配置 WebSocket 服务器
const wss = new WebSocket.Server({
  server,
  clientTracking: true
});

// 存储活跃连接
const activeConnections = new Set();

// WebSocket 核心逻辑
wss.on('connection', (ws) => {
  console.log('✅ 新客户端建立 WebSocket 连接');
  activeConnections.add(ws);

  // 心跳检测：定期发送 ping，检测客户端是否在线
  const pingInterval = setInterval(() => {
    if (ws.readyState !== WebSocket.OPEN) {
      clearInterval(pingInterval);
      activeConnections.delete(ws);
      return;
    }
    ws.ping(); // 发送 ping 包，客户端需响应 pong
  }, 30000); // 每 30 秒一次

  // 监听客户端消息
  ws.on('message', async (data) => {
    try {
      // 解析客户端请求
      const request = JSON.parse(data.toString());
      const { action, params, requestId } = request;

      // 根据 action 分发业务逻辑
      switch (action) {
        case 'call_llm': // 调用大模型（核心场景）
          await handleLLMCall(params, ws, requestId);
          break;
        case 'get_prompts': // 获取提示词
          await handleGetPrompts(params, ws, requestId);
          break;
        case 'create_task': // 创建任务
          await handleCreateTask(params, ws, requestId);
          break;
        default:
          sendResponse(ws, requestId, 400, '未知操作类型');
      }
    } catch (err) {
      console.error('处理客户端消息失败：', err);
      sendResponse(ws, '', 500, '服务器解析请求失败：' + err.message);
    }
  });

  // 监听连接关闭
  ws.on('close', (code, reason) => {
    console.log(`❌ 客户端断开连接：${code} - ${reason}`);
    clearInterval(pingInterval);
    activeConnections.delete(ws);
  });

  // 监听连接错误
  ws.on('error', (err) => {
    console.error('WebSocket 连接错误：', err);
    activeConnections.delete(ws);
  });
});

// 通用响应发送函数
function sendResponse(ws, requestId, code, msg, data = null) {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({
    requestId,
    code,
    msg,
    data
  }));
}

// 处理大模型调用
async function handleLLMCall(params, ws, requestId) {
  try {
    // 1. 先发送"受理中"状态，避免客户端等待无反馈
    sendResponse(ws, requestId, 202, '正在调用大模型，请勿断开连接');

    // 2. 调用大模型 API（添加超时和重试）
    const llmResult = await callLLMApi(params, {
      timeout: 600000, // 单次请求超时 10 分钟
      retry: 5        // 最多重试 5 次
    });

    // 3. 发送成功响应
    sendResponse(ws, requestId, 200, '大模型调用成功', llmResult);
  } catch (err) {
    // 4. 发送失败响应
    sendResponse(ws, requestId, 500, '大模型调用失败：' + err.message);
  }
}

// 处理获取提示词
async function handleGetPrompts(params, ws, requestId) {
  try {
    const prompts = loadPrompts();
    sendResponse(ws, requestId, 200, '获取提示词成功', prompts);
  } catch (err) {
    sendResponse(ws, requestId, 500, '获取提示词失败：' + err.message);
  }
}

// 处理创建任务
async function handleCreateTask(params, ws, requestId) {
  try {
    const { time, skill } = params;
    if (!time || !skill) {
      sendResponse(ws, requestId, 400, '请提供执行时间和技能');
      return;
    }

    const tasks = loadTasks();
    const newTask = {
      id: `task-${Date.now()}`,
      time,
      skill
    };

    tasks.push(newTask);
    saveTasks(tasks);
    scheduleTask(newTask);

    sendResponse(ws, requestId, 200, '任务创建成功', { taskId: newTask.id });
  } catch (err) {
    sendResponse(ws, requestId, 500, '创建任务失败：' + err.message);
  }
}

// 真实大模型 API 调用（直接调用大模型API，避免循环调用）
async function callLLMApi(params, { timeout = 30000, retry = 3 } = {}) {
  // 1. 核心参数校验，提前暴露错误
  if (!params || !params.prompt) {
    throw new Error('参数错误：必须提供有效的 prompt');
  }

  let attempt = 0;
  // 2. 优化重试循环逻辑，更直观
  while (attempt< retry) {
    try {
      console.log(`第 ${attempt + 1} 次调用大模型：`, params.prompt);
      
      // 直接调用大模型API，避免通过WebSocket循环调用
      const axios = require('axios');
      const config = require('./core/config.js').config;
      
      const requestData = {
        model: config.llm.model || 'qwen3.5-plus',
        messages: [{ role: 'user', content: params.prompt }],
        temperature: params.temperature || 0.7,
        max_tokens: params.maxTokens || 800,
        top_p: params.topP || 0.95
      };
      
      // 3. 封装超时逻辑，让 timeout 参数生效
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`请求超时：超过 ${timeout} 毫秒未响应`));
        }, timeout);
      });
      // 竞态：要么请求完成，要么超时
      const response = await Promise.race([
        axios.post(`${config.llm.baseUrl}/chat/completions`, requestData, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.llm.apiKey}`
          }
        }),
        timeoutPromise
      ]);
      
      // 4. 处理响应
      const data = response.data;
      if (!data || !data.choices) {
        throw new Error('大模型返回空响应');
      }
      
      const content = data.choices[0].message.content;
      const tokens = data.usage;
      
      return {
        content: content,
        model: params.model,
        tokens: tokens
      };
    } catch (err) {
      attempt++;
      // 5. 最后一次重试失败，抛出包含上下文的错误
      if (attempt >= retry) {
        throw new Error(`大模型调用失败（已重试 ${retry} 次）：${err.message}，请求参数：${JSON.stringify(params)}`);
      }
      // 6. 优化重试间隔，采用指数增长：3秒、6秒、12秒、24秒、48秒
      const delay = 3000 * Math.pow(2, attempt - 1);
      console.log(`第 ${attempt} 次调用失败，${delay} 毫秒后重试：`, err.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  // 理论上不会走到这里，兜底抛出错误
  throw new Error(`大模型调用失败：已达到最大重试次数 ${retry} 次`);
}

// 启动任务调度器
startTaskScheduler();

// 搜索 API
app.post('/api/search', async (req, res) => {
    try {
        console.log('收到搜索请求:', req.body);
        const { keywords, platforms } = req.body;
        
        if (!keywords || !platforms || platforms.length === 0) {
            console.log('参数错误:', { keywords, platforms });
            return res.json({ success: false, message: '请提供搜索关键词和平台' });
        }
        
        console.log('开始搜索:', { keywords, platforms });
        const results = [];
        
        // 对每个平台执行搜索
        for (const platform of platforms) {
            try {
                console.log(`搜索平台: ${platform}`);
                const platformResults = await searchPlatform(platform, keywords);
                console.log(`平台 ${platform} 搜索结果数量: ${platformResults.length}`);
                results.push(...platformResults);
            } catch (error) {
                console.error(`搜索 ${platform} 失败:`, error);
                // 继续搜索其他平台
            }
        }
        
        console.log('搜索完成，总结果数量:', results.length);
        res.json({ success: true, results });
    } catch (error) {
        console.error('搜索失败:', error);
        res.json({ success: false, message: '搜索失败，请稍后重试' });
    }
});

// 搜索单个平台
async function searchPlatform(platform, keywords) {
    console.log(`开始搜索平台 ${platform}，关键词: ${keywords}`);
    
    // 处理新闻 API 平台
    if (platform === 'newsapi' || platform === 'gnews') {
        return await searchNewsAPI(platform, keywords);
    }
    
    // 处理其他平台（使用浏览器）
    let browser;
    
    try {
        console.log('启动浏览器...');
        browser = await chromium.launch({ headless: true });
        console.log('浏览器启动成功');
        
        const page = await browser.newPage();
        console.log('新页面创建成功');
        
        let url = '';
        
        // 根据平台构建搜索 URL
        switch (platform) {
            case 'google':
                url = `https://www.google.com/search?q=${encodeURIComponent(keywords)}&tbm=nws`;
                break;
            case 'bing':
                url = `https://www.bing.com/news/search?q=${encodeURIComponent(keywords)}`;
                break;
            case 'baidu':
                url = `https://www.baidu.com/s?wd=${encodeURIComponent(keywords)}&tn=news`;
                break;
            default:
                await browser.close();
                return [];
        }
        
        console.log(`访问 URL: ${url}`);
        // 访问搜索页面
        await page.goto(url, { timeout: 30000 });
        console.log('页面访问成功');
        
        // 等待页面加载完成
        console.log('等待页面加载完成...');
        await page.waitForLoadState('networkidle');
        console.log('页面加载完成');
        
        // 获取页面内容
        console.log('获取页面内容...');
        const html = await page.content();
        console.log('页面内容获取成功，长度:', html.length);
        
        const $ = cheerio.load(html);
        console.log('页面解析成功');
        
        // 解析搜索结果
        const results = [];
        
        switch (platform) {
            case 'google':
                console.log('开始解析 Google 搜索结果');
                // 尝试使用更通用的选择器
                $('.g').each((index, element) => {
                    const title = $(element).find('h3').text().trim();
                    const url = $(element).find('a').attr('href');
                    const content = $(element).find('.VwiC3b').text().trim();
                    
                    if (title && url) {
                        results.push({ title, url, content, platform });
                    }
                });
                console.log('Google 搜索结果解析完成，数量:', results.length);
                break;
                
            case 'bing':
                console.log('开始解析 Bing 搜索结果');
                $('.news-card').each((index, element) => {
                    const title = $(element).find('.title').text().trim();
                    const url = $(element).find('a').attr('href');
                    const content = $(element).find('.snippet').text().trim();
                    
                    if (title && url) {
                        results.push({ title, url, content, platform });
                    }
                });
                console.log('Bing 搜索结果解析完成，数量:', results.length);
                break;
                
            case 'baidu':
                console.log('开始解析百度搜索结果');
                $('.result').each((index, element) => {
                    const title = $(element).find('.t a').text().trim();
                    const url = $(element).find('.t a').attr('href');
                    const content = $(element).find('.c-summary').text().trim();
                    
                    if (title && url) {
                        results.push({ title, url, content, platform });
                    }
                });
                console.log('百度搜索结果解析完成，数量:', results.length);
                break;
        }
        
        console.log(`平台 ${platform} 搜索完成，结果数量: ${results.length}`);
        return results;
    } catch (error) {
        console.error(`搜索平台 ${platform} 失败:`, error);
        return [];
    } finally {
        if (browser) {
            try {
                console.log('关闭浏览器...');
                await browser.close();
                console.log('浏览器关闭成功');
            } catch (error) {
                console.error('关闭浏览器失败:', error);
            }
        }
    }
}

// 搜索新闻 API
async function searchNewsAPI(platform, keywords) {
    try {
        console.log(`开始搜索 ${platform} API，关键词: ${keywords}`);
        
        let url = '';
        let apiKey = '';
        
        switch (platform) {
            case 'newsapi':
                apiKey = '05a90af01d3040b793f74d6e41c5ea72';
                url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(keywords)}&language=zh&sortBy=publishedAt&apiKey=${apiKey}`;
                break;
            case 'gnews':
                apiKey = 'ef01dbeea077f62ff84ad01421baf4af';
                url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(keywords)}&lang=zh&max=10&apikey=${apiKey}`;
                break;
            default:
                return [];
        }
        
        console.log(`访问 API URL: ${url}`);
        const response = await axios.get(url);
        console.log(`${platform} API 响应状态:`, response.status);
        
        const results = [];
        
        if (platform === 'newsapi') {
            // 处理 NewsAPI 响应
            if (response.data.articles && response.data.articles.length > 0) {
                response.data.articles.forEach(article => {
                    if (article.title && article.url) {
                        results.push({
                            title: article.title,
                            url: article.url,
                            content: article.description || '',
                            platform: 'newsapi'
                        });
                    }
                });
            }
        } else if (platform === 'gnews') {
            // 处理 GNews API 响应
            if (response.data.articles && response.data.articles.length > 0) {
                response.data.articles.forEach(article => {
                    if (article.title && article.url) {
                        results.push({
                            title: article.title,
                            url: article.url,
                            content: article.description || '',
                            platform: 'gnews'
                        });
                    }
                });
            }
        }
        
        console.log(`${platform} API 搜索完成，结果数量: ${results.length}`);
        return results;
    } catch (error) {
        console.error(`搜索 ${platform} API 失败:`, error);
        return [];
    }
}

// API Key管理 API
app.get('/api/api-key/status', (req, res) => {
    try {
        const apiKeyFile = path.join(__dirname, 'user-config', 'credentials', 'llm-api-key2.txt');
        const hasApiKey = fs.existsSync(apiKeyFile);
        let lastModified = null;
        
        if (hasApiKey) {
            const stats = fs.statSync(apiKeyFile);
            lastModified = stats.mtime.toISOString();
        }
        
        res.json({
            success: true,
            data: {
                hasApiKey,
                apiKeyFile: hasApiKey ? apiKeyFile : null,
                lastModified
            }
        });
    } catch (error) {
        console.error('获取API Key状态失败:', error);
        res.json({ success: false, message: '获取API Key状态失败' });
    }
});

app.post('/api/api-key', (req, res) => {
    try {
        const { apiKey } = req.body;
        
        if (!apiKey || apiKey.trim() === '') {
            return res.json({ success: false, message: '请输入有效的API Key' });
        }
        
        const apiKeyFile = path.join(__dirname, 'user-config', 'credentials', 'llm-api-key2.txt');
        fs.writeFileSync(apiKeyFile, apiKey.trim(), 'utf8');
        
        console.log('API Key保存成功');
        res.json({ success: true, message: 'API Key保存成功' });
    } catch (error) {
        console.error('保存API Key失败:', error);
        res.json({ success: false, message: '保存API Key失败' });
    }
});

// 提示词管理 API
const promptsFile = path.join(__dirname, 'user-config', 'data', 'prompts.json');

function loadPrompts() {
    try {
        if (!fs.existsSync(promptsFile)) {
            // 创建默认提示词
            const defaultPrompts = {
                explorerPrompt: `你是一名资深AI领域专家，现在需要基于以下新闻内容创建一篇适合在Facebook上发布的帖子。
严格要求：
1. 只输出最终的Facebook帖子内容，绝对不要包含任何思考过程、草稿或分析步骤
2. 语言自然流畅，符合Facebook的社交风格，可适当添加emoji增强趣味性
3. 内容简洁易懂，控制在300字以内

新闻内容：AI领域最新行业动态`,
                interactPrompt: `你是一名资深AI技术博主，拥有多年的AI开发经验和实战经历。现在请基于以下新闻内容，创作一篇Facebook风格的感悟文章。
严格要求：
1. 以资深AI技术博主人设写作，要有真实的开发经历和实战经验分享，避免空泛的理论
2. 语言自然接地气，符合Facebook社交风格，可适当添加话题标签（如#AI开发）
3. 内容控制在400字以内，只输出最终文章内容，不包含任何思考过程
4. 结合新闻内容给出具体的实战感悟，而非单纯复述新闻

新闻内容：AI大模型最新商用动态`
            };
            fs.writeFileSync(promptsFile, JSON.stringify(defaultPrompts, null, 2), 'utf8');
            return defaultPrompts;
        }
        const content = fs.readFileSync(promptsFile, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error('读取提示词失败:', error);
        return {
            explorerPrompt: '',
            interactPrompt: ''
        };
    }
}

function savePrompts(prompts) {
    try {
        fs.writeFileSync(promptsFile, JSON.stringify(prompts, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('保存提示词失败:', error);
        return false;
    }
}

app.get('/api/prompts', (req, res) => {
    try {
        const prompts = loadPrompts();
        res.json({
            success: true,
            data: prompts
        });
    } catch (error) {
        console.error('获取提示词失败:', error);
        res.json({ success: false, message: '获取提示词失败' });
    }
});

app.post('/api/prompts/explorer', (req, res) => {
    try {
        const { prompt } = req.body;
        
        if (!prompt || prompt.trim() === '') {
            return res.json({ success: false, message: '请输入有效的提示词' });
        }
        
        const prompts = loadPrompts();
        prompts.explorerPrompt = prompt;
        
        if (savePrompts(prompts)) {
            console.log('第一次探索提示词保存成功');
            res.json({ success: true, message: '第一次探索提示词保存成功' });
        } else {
            res.json({ success: false, message: '保存提示词失败' });
        }
    } catch (error) {
        console.error('保存第一次探索提示词失败:', error);
        res.json({ success: false, message: '保存提示词失败' });
    }
});

app.post('/api/prompts/interact', (req, res) => {
    try {
        const { prompt } = req.body;
        
        if (!prompt || prompt.trim() === '') {
            return res.json({ success: false, message: '请输入有效的提示词' });
        }
        
        const prompts = loadPrompts();
        prompts.interactPrompt = prompt;
        
        if (savePrompts(prompts)) {
            console.log('第二次探索提示词保存成功');
            res.json({ success: true, message: '第二次探索提示词保存成功' });
        } else {
            res.json({ success: false, message: '保存提示词失败' });
        }
    } catch (error) {
        console.error('保存第二次探索提示词失败:', error);
        res.json({ success: false, message: '保存提示词失败' });
    }
});



// 获取提示词文件状态
app.get('/api/prompts/status', (req, res) => {
    try {
        if (!fs.existsSync(promptsFile)) {
            return res.json({ success: false, message: '提示词文件不存在' });
        }
        
        const stats = fs.statSync(promptsFile);
        const lastModified = stats.mtime.toLocaleString('zh-CN');
        
        res.json({
            success: true,
            data: {
                filePath: promptsFile,
                lastModified: lastModified
            }
        });
    } catch (error) {
        console.error('获取文件状态失败:', error);
        res.json({ success: false, message: '获取文件状态失败' });
    }
});

// Facebook关键词管理 API
const facebookKeywordsFile = path.join(__dirname, 'user-config', 'data', 'facebook_keywords.txt');

function loadFacebookKeywords() {
    try {
        if (!fs.existsSync(facebookKeywordsFile)) {
            // 创建默认关键词
            const defaultKeywords = ['AI技术', '人工智能', '机器学习', '深度学习', '大模型', 'AI应用', '技术创新', '科技创业'];
            fs.writeFileSync(facebookKeywordsFile, defaultKeywords.join('\n'), 'utf8');
            return defaultKeywords;
        }
        const content = fs.readFileSync(facebookKeywordsFile, 'utf8');
        return content.split('\n').filter(line => line.trim().length > 0);
    } catch (error) {
        console.error('读取Facebook关键词失败:', error);
        return [];
    }
}

function saveFacebookKeywords(keywords) {
    try {
        fs.writeFileSync(facebookKeywordsFile, keywords.join('\n'), 'utf8');
        return true;
    } catch (error) {
        console.error('保存Facebook关键词失败:', error);
        return false;
    }
}

app.get('/api/facebook/keywords', (req, res) => {
    try {
        const keywords = loadFacebookKeywords();
        res.json({
            success: true,
            data: { keywords }
        });
    } catch (error) {
        console.error('获取Facebook关键词失败:', error);
        res.json({ success: false, message: '获取Facebook关键词失败' });
    }
});

app.post('/api/facebook/keywords', (req, res) => {
    try {
        const { keyword } = req.body;
        
        if (!keyword || keyword.trim() === '') {
            return res.json({ success: false, message: '请输入有效的关键词' });
        }
        
        const keywords = loadFacebookKeywords();
        
        if (keywords.includes(keyword.trim())) {
            return res.json({ success: false, message: '关键词已存在' });
        }
        
        keywords.push(keyword.trim());
        
        if (saveFacebookKeywords(keywords)) {
            console.log('Facebook关键词添加成功:', keyword);
            res.json({ success: true, message: '关键词添加成功' });
        } else {
            res.json({ success: false, message: '保存关键词失败' });
        }
    } catch (error) {
        console.error('添加Facebook关键词失败:', error);
        res.json({ success: false, message: '添加关键词失败' });
    }
});

app.put('/api/facebook/keywords', (req, res) => {
    try {
        const { oldKeyword, newKeyword } = req.body;
        
        if (!oldKeyword || !newKeyword || oldKeyword.trim() === '' || newKeyword.trim() === '') {
            return res.json({ success: false, message: '请输入有效的关键词' });
        }
        
        const keywords = loadFacebookKeywords();
        const index = keywords.indexOf(oldKeyword);
        
        if (index === -1) {
            return res.json({ success: false, message: '原关键词不存在' });
        }
        
        if (keywords.includes(newKeyword.trim()) && oldKeyword !== newKeyword.trim()) {
            return res.json({ success: false, message: '新关键词已存在' });
        }
        
        keywords[index] = newKeyword.trim();
        
        if (saveFacebookKeywords(keywords)) {
            console.log('Facebook关键词更新成功:', oldKeyword, '→', newKeyword);
            res.json({ success: true, message: '关键词更新成功' });
        } else {
            res.json({ success: false, message: '保存关键词失败' });
        }
    } catch (error) {
        console.error('更新Facebook关键词失败:', error);
        res.json({ success: false, message: '更新关键词失败' });
    }
});

app.delete('/api/facebook/keywords/:keyword', (req, res) => {
    try {
        const keyword = decodeURIComponent(req.params.keyword);
        
        if (!keyword || keyword.trim() === '') {
            return res.json({ success: false, message: '请输入有效的关键词' });
        }
        
        const keywords = loadFacebookKeywords();
        const updatedKeywords = keywords.filter(k => k !== keyword);
        
        if (updatedKeywords.length === keywords.length) {
            return res.json({ success: false, message: '关键词不存在' });
        }
        
        if (saveFacebookKeywords(updatedKeywords)) {
            console.log('Facebook关键词删除成功:', keyword);
            res.json({ success: true, message: '关键词删除成功' });
        } else {
            res.json({ success: false, message: '保存关键词失败' });
        }
    } catch (error) {
        console.error('删除Facebook关键词失败:', error);
        res.json({ success: false, message: '删除关键词失败' });
    }
});

// 获取Facebook关键词文件状态
app.get('/api/facebook/keywords/status', (req, res) => {
    try {
        if (!fs.existsSync(facebookKeywordsFile)) {
            return res.json({ success: false, message: '关键词文件不存在' });
        }
        
        const stats = fs.statSync(facebookKeywordsFile);
        const lastModified = stats.mtime.toLocaleString('zh-CN');
        
        res.json({
            success: true,
            data: {
                filePath: facebookKeywordsFile,
                lastModified: lastModified
            }
        });
    } catch (error) {
        console.error('获取文件状态失败:', error);
        res.json({ success: false, message: '获取文件状态失败' });
    }
});

// 私信维护管理 API
const sixinStatsFile = path.join(__dirname, 'data', 'sixin_stats.json');

function loadSixinStats() {
    try {
        if (!fs.existsSync(sixinStatsFile)) {
            const defaultStats = {
                pendingCount: 10,
                todayCount: 0,
                totalCount: 0,
                successCount: 0,
                lastMaintenance: null
            };
            fs.writeFileSync(sixinStatsFile, JSON.stringify(defaultStats, null, 2), 'utf8');
            return defaultStats;
        }
        const content = fs.readFileSync(sixinStatsFile, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error('读取私信维护统计失败:', error);
        return {
            pendingCount: 0,
            todayCount: 0,
            totalCount: 0,
            successCount: 0,
            lastMaintenance: null
        };
    }
}

function saveSixinStats(stats) {
    try {
        fs.writeFileSync(sixinStatsFile, JSON.stringify(stats, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('保存私信维护统计失败:', error);
        return false;
    }
}

app.get('/api/sixin/status', (req, res) => {
    try {
        const stats = loadSixinStats();
        const successRate = stats.totalCount > 0 ? Math.round((stats.successCount / stats.totalCount) * 100) + '%' : '0%';
        
        res.json({
            success: true,
            data: {
                pendingCount: stats.pendingCount,
                todayCount: stats.todayCount,
                totalCount: stats.totalCount,
                successRate: successRate
            }
        });
    } catch (error) {
        console.error('获取私信维护状态失败:', error);
        res.json({ success: false, message: '获取私信维护状态失败' });
    }
});

app.post('/api/sixin/maintain', async (req, res) => {
    try {
        console.log('开始执行私信维护任务');
        
        // 动态导入私信维护技能
        const { maintainSixin } = await import('./skills/sixin/sixin-maintenance.ts');
        
        const input = {
            skillId: 'sixin-maintenance',
            traceId: `sixin-maintenance-${Date.now()}`
        };
        
        const result = await maintainSixin(input);
        
        // 更新统计数据
        const stats = loadSixinStats();
        stats.totalCount += result.data.processedCount;
        stats.successCount += result.data.successCount;
        
        // 更新今日维护数（简单实现，实际应该按日期统计）
        const today = new Date().toISOString().split('T')[0];
        if (!stats.lastMaintenance || stats.lastMaintenance !== today) {
            stats.todayCount = result.data.processedCount;
            stats.lastMaintenance = today;
        } else {
            stats.todayCount += result.data.processedCount;
        }
        
        // 更新待处理数
        stats.pendingCount = Math.max(0, stats.pendingCount - result.data.processedCount);
        
        saveSixinStats(stats);
        
        console.log('私信维护任务执行完成');
        res.json({
            success: true,
            data: {
                results: result.data.results
            }
        });
    } catch (error) {
        console.error('执行私信维护任务失败:', error);
        res.json({ success: false, message: '执行私信维护任务失败' });
    }
});

// 文生图管理 API
const imageApiKeyFile = path.join(__dirname, 'user-config', 'assets', 'qwen-image-2.0key.txt');

app.get('/api/image/api-key', (req, res) => {
    try {
        let apiKey = '';
        let lastModified = '';
        
        if (fs.existsSync(imageApiKeyFile)) {
            apiKey = fs.readFileSync(imageApiKeyFile, 'utf8').trim();
            
            // 获取文件最后修改时间
            const stats = fs.statSync(imageApiKeyFile);
            const mtime = stats.mtime;
            // 格式化时间为 YYYY/MM/DD HH:mm:ss
            lastModified = `${mtime.getFullYear()}/${(mtime.getMonth() + 1)}/${mtime.getDate()} ${mtime.getHours().toString().padStart(2, '0')}:${mtime.getMinutes().toString().padStart(2, '0')}:${mtime.getSeconds().toString().padStart(2, '0')}`;
        }
        
        res.json({
            success: true,
            data: {
                apiKey: apiKey,
                lastModified: lastModified
            }
        });
    } catch (error) {
        console.error('读取文生图API Key失败:', error);
        res.json({ success: false, message: '读取API Key失败' });
    }
});

app.post('/api/image/api-key', (req, res) => {
    try {
        const { apiKey } = req.body;
        
        if (!apiKey || apiKey.trim() === '') {
            return res.json({ success: false, message: 'API Key不能为空' });
        }
        
        // 确保data目录存在
        const dataDir = path.dirname(imageApiKeyFile);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        fs.writeFileSync(imageApiKeyFile, apiKey.trim(), 'utf8');
        console.log('文生图API Key保存成功');
        res.json({ success: true, message: 'API Key保存成功' });
    } catch (error) {
        console.error('保存文生图API Key失败:', error);
        res.json({ success: false, message: '保存API Key失败' });
    }
});

app.post('/api/image/generate', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        if (!prompt || prompt.trim() === '') {
            return res.json({ success: false, message: '提示词不能为空' });
        }
        
        console.log('开始执行文生图任务');
        
        // 动态导入文生图技能
        const { generateImageSkill } = await import('./skills/image/image-generation.ts');
        
        const input = {
            skillId: 'image-generation',
            traceId: `image-generation-${Date.now()}`,
            prompt: prompt.trim()
        };
        
        const result = await generateImageSkill(input);
        
        if (result.code === 0) {
            console.log('文生图任务执行完成');
            res.json({
                success: true,
                data: {
                    imagePath: result.data.imagePath,
                    imageUrl: result.data.imageUrl
                }
            });
        } else {
            console.error('文生图任务执行失败');
            res.json({ success: false, message: '生成图片失败' });
        }
    } catch (error) {
        console.error('执行文生图任务失败:', error);
        res.json({ success: false, message: '执行文生图任务失败' });
    }
});

// 评论区截留管理 API
const pinglunciDir = path.join(__dirname, 'user-config', 'assets', 'pinglunci');

// 确保pinglunci目录存在
if (!fs.existsSync(pinglunciDir)) {
    fs.mkdirSync(pinglunciDir, { recursive: true });
}

const searchKeywordsFile = path.join(pinglunciDir, 'ss.txt');
const targetKeywordsFile = path.join(pinglunciDir, 'pinlunci.txt');
const replyContentsFile = path.join(pinglunciDir, 'huifu.txt');

// 读取搜索关键词列表
app.get('/api/comment/search-keywords/list', (req, res) => {
    try {
        let keywords = [];
        if (fs.existsSync(searchKeywordsFile)) {
            const content = fs.readFileSync(searchKeywordsFile, 'utf8');
            keywords = content.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
        }
        res.json({
            success: true,
            data: {
                keywords: keywords
            }
        });
    } catch (error) {
        console.error('读取搜索关键词失败:', error);
        res.json({ success: false, message: '读取文件失败' });
    }
});

// 添加搜索关键词
app.post('/api/comment/search-keywords', (req, res) => {
    try {
        const { keyword } = req.body;
        
        if (!keyword) {
            return res.json({ success: false, message: '关键词不能为空' });
        }
        
        let keywords = [];
        if (fs.existsSync(searchKeywordsFile)) {
            const content = fs.readFileSync(searchKeywordsFile, 'utf8');
            keywords = content.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
        }
        
        // 检查关键词是否已存在
        if (keywords.includes(keyword.trim())) {
            return res.json({ success: false, message: '关键词已存在' });
        }
        
        keywords.push(keyword.trim());
        fs.writeFileSync(searchKeywordsFile, keywords.join('\n'), 'utf8');
        console.log('搜索关键词添加成功:', keyword);
        res.json({ success: true, message: '关键词添加成功' });
    } catch (error) {
        console.error('添加搜索关键词失败:', error);
        res.json({ success: false, message: '添加失败' });
    }
});

// 删除搜索关键词
app.delete('/api/comment/search-keywords/:keyword', (req, res) => {
    try {
        const keyword = decodeURIComponent(req.params.keyword);
        
        if (!fs.existsSync(searchKeywordsFile)) {
            return res.json({ success: false, message: '文件不存在' });
        }
        
        const content = fs.readFileSync(searchKeywordsFile, 'utf8');
        let keywords = content.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        
        const initialLength = keywords.length;
        keywords = keywords.filter(k => k !== keyword);
        
        if (keywords.length === initialLength) {
            return res.json({ success: false, message: '关键词不存在' });
        }
        
        fs.writeFileSync(searchKeywordsFile, keywords.join('\n'), 'utf8');
        console.log('搜索关键词删除成功:', keyword);
        res.json({ success: true, message: '关键词删除成功' });
    } catch (error) {
        console.error('删除搜索关键词失败:', error);
        res.json({ success: false, message: '删除失败' });
    }
});

// 更新搜索关键词
app.put('/api/comment/search-keywords', (req, res) => {
    try {
        const { oldKeyword, newKeyword } = req.body;
        
        if (!oldKeyword || !newKeyword) {
            return res.json({ success: false, message: '关键词不能为空' });
        }
        
        if (!fs.existsSync(searchKeywordsFile)) {
            return res.json({ success: false, message: '文件不存在' });
        }
        
        const content = fs.readFileSync(searchKeywordsFile, 'utf8');
        let keywords = content.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        
        const index = keywords.indexOf(oldKeyword);
        if (index === -1) {
            return res.json({ success: false, message: '原关键词不存在' });
        }
        
        // 检查新关键词是否已存在（除了当前位置）
        if (keywords.includes(newKeyword) && keywords.indexOf(newKeyword) !== index) {
            return res.json({ success: false, message: '新关键词已存在' });
        }
        
        keywords[index] = newKeyword;
        fs.writeFileSync(searchKeywordsFile, keywords.join('\n'), 'utf8');
        console.log('搜索关键词更新成功:', oldKeyword, '→', newKeyword);
        res.json({ success: true, message: '关键词更新成功' });
    } catch (error) {
        console.error('更新搜索关键词失败:', error);
        res.json({ success: false, message: '更新失败' });
    }
});

// 获取文件状态
app.get('/api/comment/search-keywords/status', (req, res) => {
    try {
        if (fs.existsSync(searchKeywordsFile)) {
            const stats = fs.statSync(searchKeywordsFile);
            res.json({
                success: true,
                data: {
                    filePath: searchKeywordsFile,
                    lastModified: stats.mtime.toLocaleString()
                }
            });
        } else {
            res.json({
                success: false,
                message: '文件不存在'
            });
        }
    } catch (error) {
        console.error('获取文件状态失败:', error);
        res.json({ success: false, message: '获取文件状态失败' });
    }
});

// 读取搜索关键词（旧API，保持兼容）
app.get('/api/comment/search-keywords', (req, res) => {
    try {
        let content = '';
        if (fs.existsSync(searchKeywordsFile)) {
            content = fs.readFileSync(searchKeywordsFile, 'utf8');
        }
        res.json({
            success: true,
            data: {
                content: content
            }
        });
    } catch (error) {
        console.error('读取搜索关键词失败:', error);
        res.json({ success: false, message: '读取文件失败' });
    }
});

// 保存搜索关键词（旧API，保持兼容）
app.post('/api/comment/search-keywords/batch', (req, res) => {
    try {
        const { content } = req.body;
        
        fs.writeFileSync(searchKeywordsFile, content || '', 'utf8');
        console.log('搜索关键词批量保存成功');
        res.json({ success: true, message: '保存成功' });
    } catch (error) {
        console.error('保存搜索关键词失败:', error);
        res.json({ success: false, message: '保存失败' });
    }
});

// 读取目标关键词
app.get('/api/comment/target-keywords', (req, res) => {
    try {
        let content = '';
        if (fs.existsSync(targetKeywordsFile)) {
            content = fs.readFileSync(targetKeywordsFile, 'utf8');
        }
        res.json({
            success: true,
            data: {
                content: content
            }
        });
    } catch (error) {
        console.error('读取目标关键词失败:', error);
        res.json({ success: false, message: '读取文件失败' });
    }
});

// 保存目标关键词
app.post('/api/comment/target-keywords', (req, res) => {
    try {
        const { content } = req.body;
        
        fs.writeFileSync(targetKeywordsFile, content || '', 'utf8');
        console.log('目标关键词保存成功');
        res.json({ success: true, message: '保存成功' });
    } catch (error) {
        console.error('保存目标关键词失败:', error);
        res.json({ success: false, message: '保存失败' });
    }
});

// 读取回复内容
app.get('/api/comment/reply-contents', (req, res) => {
    try {
        let content = '';
        if (fs.existsSync(replyContentsFile)) {
            content = fs.readFileSync(replyContentsFile, 'utf8');
        }
        res.json({
            success: true,
            data: {
                content: content
            }
        });
    } catch (error) {
        console.error('读取回复内容失败:', error);
        res.json({ success: false, message: '读取文件失败' });
    }
});

// 保存回复内容
app.post('/api/comment/reply-contents', (req, res) => {
    try {
        const { content } = req.body;
        
        fs.writeFileSync(replyContentsFile, content || '', 'utf8');
        console.log('回复内容保存成功');
        res.json({ success: true, message: '保存成功' });
    } catch (error) {
        console.error('保存回复内容失败:', error);
        res.json({ success: false, message: '保存失败' });
    }
});

// 登录管理 API
app.post('/api/login', async (req, res) => {
    try {
        const { platform, action } = req.body;
        
        if (!platform || !action) {
            return res.json({ success: false, message: '参数不能为空' });
        }
        
        console.log(`开始执行${platform}登录任务，操作: ${action}`);
        
        // 打开登录页面
        if (action === 'login') {
            // 启动浏览器
            const browser = await chromium.launch({
                headless: false,
                defaultViewport: null,
                args: ['--start-maximized']
            });
            
            const page = await browser.newPage();
            
            // 导航到登录页面
            let url;
            if (platform === 'facebook') {
                url = 'https://www.facebook.com/login';
            } else if (platform === 'instagram') {
                url = 'https://www.instagram.com/accounts/login/';
            } else {
                url = 'https://www.tiktok.com/login';
            }
            await page.goto(url);
            
            // 保存浏览器实例
            browserInstances[platform] = { browser, page };
            
            console.log(`${platform}登录页面已打开`);
            res.json({
                success: true,
                message: `${platform}登录页面已打开，请在浏览器中输入账号密码`
            });
        } 
        // 保存Cookie
        else if (action === 'saveCookie') {
            if (!browserInstances[platform]) {
                return res.json({ success: false, message: `请先打开${platform}登录页面` });
            }
            
            const { browser, page } = browserInstances[platform];
            
            // 获取cookie
            const cookies = await page.context().cookies();
            
            // 确保cookie目录存在
            const cookieDir = path.join(__dirname, 'user-config', 'accounts');
            if (!fs.existsSync(cookieDir)) {
                fs.mkdirSync(cookieDir, { recursive: true });
            }
            
            // 生成cookie文件名（固定文件名）
            const cookieFileName = `${platform}.txt`;
            const cookieFilePath = path.join(cookieDir, cookieFileName);
            
            // 保存cookie到文件（文本格式）
            const cookieContent = cookies.map(cookie => {
                return `${cookie.name}\t${cookie.value}\t${cookie.domain}\t${cookie.path}\t${cookie.expires || ''}\t${cookie.httpOnly ? '✓' : ''}\t${cookie.secure ? '✓' : ''}`;
            }).join('\n');
            
            fs.writeFileSync(cookieFilePath, cookieContent, 'utf8');
            
            console.log(`Cookie保存成功: ${cookieFilePath}`);
            
            // 关闭浏览器
            await browser.close();
            
            // 清除浏览器实例
            delete browserInstances[platform];
            
            res.json({
                success: true,
                message: `${platform} Cookie保存成功`,
                data: { cookiePath: cookieFilePath }
            });
        }
        // 携带Cookie登录
        else if (action === 'loginWithCookie') {
            // 确保cookie目录存在
            const cookieDir = path.join(__dirname, 'user-config', 'accounts');
            if (!fs.existsSync(cookieDir)) {
                return res.json({ success: false, message: 'Cookie目录不存在' });
            }
            
            // 查找最新的cookie文件
            const cookieFiles = fs.readdirSync(cookieDir).filter(file => file.startsWith(platform));
            if (cookieFiles.length === 0) {
                return res.json({ success: false, message: `没有找到${platform}的Cookie文件，请先保存Cookie` });
            }
            
            // 按修改时间排序，获取最新的cookie文件
            cookieFiles.sort((a, b) => {
                const aTime = fs.statSync(path.join(cookieDir, a)).mtime.getTime();
                const bTime = fs.statSync(path.join(cookieDir, b)).mtime.getTime();
                return bTime - aTime;
            });
            
            const latestCookieFile = path.join(cookieDir, cookieFiles[0]);
            console.log(`使用Cookie文件: ${latestCookieFile}`);
            
            // 读取cookie
            const cookieContent = fs.readFileSync(latestCookieFile, 'utf8');
            const cookies = cookieContent.split('\n').map(line => {
                const parts = line.split('\t');
                if (parts.length >= 7) {
                    return {
                        name: parts[0],
                        value: parts[1],
                        domain: parts[2],
                        path: parts[3],
                        httpOnly: parts[5] === '✓',
                        secure: parts[6] === '✓'
                    };
                }
                return null;
            }).filter(Boolean);
            
            // 启动浏览器
            const browser = await chromium.launch({
                headless: false,
                defaultViewport: null,
                args: ['--start-maximized']
            });
            
            const page = await browser.newPage();
            
            // 设置cookie
            await page.context().addCookies(cookies);
            
            // 导航到平台主页
            let url;
            if (platform === 'facebook') {
                url = 'https://www.facebook.com';
            } else if (platform === 'instagram') {
                url = 'https://www.instagram.com';
            } else {
                url = 'https://www.tiktok.com';
            }
            await page.goto(url);
            
            console.log(`${platform}携带Cookie登录成功`);
            
            // 保存浏览器实例
            browserInstances[platform] = { browser, page };
            
            res.json({
                success: true,
                message: `${platform}已携带Cookie登录`
            });
        } else {
            res.json({ success: false, message: '不支持的操作类型' });
        }
    } catch (error) {
        console.error('登录任务执行失败:', error.message);
        res.json({
            success: false,
            message: error.message || '登录失败'
        });
    }
});

// 任务管理 API
app.get('/api/tasks', (req, res) => {
    try {
        const tasks = loadTasks();
        const taskStatus = loadTaskStatus();
        
        // 合并任务和执行状态
        const tasksWithStatus = tasks.map(task => ({
            ...task,
            status: taskStatus[task.id] || { status: 'scheduled' }
        }));
        
        res.json({ success: true, tasks: tasksWithStatus });
    } catch (error) {
        console.error('获取任务失败:', error);
        res.json({ success: false, message: '获取任务失败' });
    }
});

app.post('/api/tasks', (req, res) => {
    try {
        const { time, skill } = req.body;
        
        if (!time || !skill) {
            return res.json({ success: false, message: '请提供执行时间和技能' });
        }
        
        const tasks = loadTasks();
        const newTask = {
            id: `task-${Date.now()}`,
            time,
            skill
        };
        
        tasks.push(newTask);
        saveTasks(tasks);
        scheduleTask(newTask);
        
        res.json({ success: true, task: newTask });
    } catch (error) {
        console.error('添加任务失败:', error);
        res.json({ success: false, message: '添加任务失败' });
    }
});

app.delete('/api/tasks/:id', (req, res) => {
    try {
        const taskId = req.params.id;
        const tasks = loadTasks();
        
        const updatedTasks = tasks.filter(task => task.id !== taskId);
        
        if (updatedTasks.length === tasks.length) {
            return res.json({ success: false, message: '任务不存在' });
        }
        
        // 取消任务调度
        if (taskJobs.has(taskId)) {
            taskJobs.get(taskId).cancel();
            taskJobs.delete(taskId);
        }
        
        saveTasks(updatedTasks);
        res.json({ success: true });
    } catch (error) {
        console.error('删除任务失败:', error);
        res.json({ success: false, message: '删除任务失败' });
    }
});

// 执行任务 API
app.post('/api/execute-task', async (req, res) => {
    try {
        const { skill } = req.body;
        
        if (!skill) {
            return res.json({ success: false, message: '技能名称不能为空' });
        }
        
        console.log(`立即执行任务: ${skill}`);
        
        const task = {
            id: 'task-' + Date.now(),
            time: 'now',
            skill: skill
        };
        
        await executeTask(task);
        
        res.json({ success: true, message: `${skill} 技能执行成功` });
    } catch (error) {
        console.error('技能执行失败:', error.message);
        res.json({ success: false, message: error.message || '技能执行失败' });
    }
});

// 大模型交互 API
app.post('/api/llm/chat', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        if (!prompt || prompt.trim() === '') {
            return res.json({ success: false, message: '问题不能为空' });
        }
        
        // 调用大模型进行交互
        const response = await llmClient.generate({
            prompt: prompt,
            skillId: 'llm-chat',
            traceId: `llm-chat-${Date.now()}`
        });
        
        if (response.ok) {
            res.json({
                success: true,
                data: {
                    response: response.data.content
                }
            });
        } else {
            res.json({ success: false, message: response.message || '大模型交互失败' });
        }
    } catch (error) {
        console.error('大模型交互失败:', error);
        res.json({ success: false, message: '大模型交互失败' });
    }
});

// 保存大模型交互结果 API
app.post('/api/llm/save', (req, res) => {
    try {
        const { content, fileNumber } = req.body;
        
        if (!content || !fileNumber) {
            return res.json({ success: false, message: '内容和文件编号不能为空' });
        }
        
        // 确保文件编号在1-7之间
        if (fileNumber< 1 || fileNumber >7) {
            return res.json({ success: false, message: '文件编号必须在1-7之间' });
        }
        
        // 创建保存目录
        const saveDir = path.join(__dirname, 'user-config', 'assets', 'tiezi');
        if (!fs.existsSync(saveDir)) {
            fs.mkdirSync(saveDir, { recursive: true });
        }
        
        // 生成文件路径
        const filePath = path.join(saveDir, `${fileNumber}.txt`);
        
        // 保存文件
        fs.writeFileSync(filePath, content, 'utf8');
        
        console.log(`大模型交互结果已保存到: ${filePath}`);
        res.json({ success: true, message: '保存成功' });
    } catch (error) {
        console.error('保存文件失败:', error);
        res.json({ success: false, message: '保存失败' });
    }
});

// 启动服务器
server.listen(port, '0.0.0.0', () => {
    console.log(`🚀 服务器运行在 http://0.0.0.0:${port}`);
    console.log(`🔌 WebSocket 服务已启用，监听 ws://localhost:${port}`);
});
