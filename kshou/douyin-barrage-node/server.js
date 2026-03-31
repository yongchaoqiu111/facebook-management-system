const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const config = require('./config');

// 创建Express应用
const app = express();

// 提供静态文件服务
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, '../html')));

// 解析JSON请求体
app.use(express.json());

// API路由
const DouyinBrowserAutomation = require('./browser-automation');
const automation = new DouyinBrowserAutomation();
let isCapturing = false;

// 已保存直播间数据文件
const liveRoomsFile = path.join(__dirname, '..', 'json', 'live-rooms.json');

// 确保json目录存在
const jsonDir = path.join(__dirname, '..', 'json');
if (!fs.existsSync(jsonDir)) {
    fs.mkdirSync(jsonDir, { recursive: true });
}

// 启动弹幕抓取
app.post('/api/danmaku/start', async (req, res) => {
    const { roomUrl } = req.body;
    log(`收到启动弹幕抓取请求，直播间链接: ${roomUrl}`);
    
    if (isCapturing) {
        res.json({ success: false, error: '抓取已在运行中' });
        return;
    }
    
    isCapturing = true;
    res.json({ success: true, message: '弹幕抓取功能已启动' });
    
    // 异步启动浏览器自动化
    try {
        await automation.start(roomUrl);
    } catch (error) {
        log(`弹幕抓取启动失败: ${error.message}`);
        isCapturing = false;
    }
});

// 停止弹幕抓取
app.post('/api/danmaku/stop', async (req, res) => {
    log('收到停止弹幕抓取请求');
    
    if (!isCapturing) {
        res.json({ success: false, error: '抓取未运行' });
        return;
    }
    
    try {
        await automation.stop();
        isCapturing = false;
        res.json({ success: true, message: '弹幕抓取已停止' });
    } catch (error) {
        res.json({ success: false, error: '停止抓取失败' });
    }
});

// 获取弹幕抓取状态
app.get('/api/danmaku/status', (req, res) => {
    res.json({ 
        success: true, 
        data: { 
            status: isCapturing ? 'running' : 'stopped', 
            danmakuCount: 0, 
            currentAction: isCapturing ? '正在抓取弹幕...' : '等待开始' 
        } 
    });
});

// 保存直播间
app.post('/api/save-live-room', (req, res) => {
    const { url } = req.body;
    log(`收到保存直播间请求，URL: ${url}`);
    
    try {
        // 读取现有数据
        let liveRooms = [];
        if (fs.existsSync(liveRoomsFile)) {
            const content = fs.readFileSync(liveRoomsFile, 'utf8');
            liveRooms = JSON.parse(content);
        }
        
        // 检查是否已存在
        const exists = liveRooms.some(room => room.url === url);
        if (!exists) {
            liveRooms.push({ url, savedAt: new Date().toISOString() });
            fs.writeFileSync(liveRoomsFile, JSON.stringify(liveRooms, null, 2));
        }
        
        res.json({ success: true, message: '直播间保存成功' });
    } catch (error) {
        log(`保存直播间失败: ${error.message}`);
        res.json({ success: false, error: '保存失败' });
    }
});

// 获取已保存的直播间
app.get('/api/get-saved-live-rooms', (req, res) => {
    try {
        let liveRooms = [];
        if (fs.existsSync(liveRoomsFile)) {
            const content = fs.readFileSync(liveRoomsFile, 'utf8');
            liveRooms = JSON.parse(content);
        }
        res.json({ success: true, data: liveRooms });
    } catch (error) {
        log(`读取已保存直播间失败: ${error.message}`);
        res.json({ success: false, error: '读取失败' });
    }
});

// 创建HTTP服务器
const httpServer = http.createServer(app);

// 启动HTTP代理服务器
const httpProxy = require('./proxy/httpProxy');
httpProxy.start(config.proxy.httpPort, httpServer, (message) => {
    log(`收到弹幕消息: ${JSON.stringify(message)}`);
    broadcastMessage(message);
});

// 创建日志目录
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// 日志函数
function log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    console.log(logMessage);
    
    if (config.logging.enabled) {
        fs.appendFileSync(config.logging.file, logMessage + '\n');
    }
}

// 消息存储
const connectedClients = new Set();

// 广播消息给所有客户端
function broadcastMessage(message) {
    connectedClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// 启动服务器
const PORT = config.proxy.httpPort;
httpServer.listen(PORT, () => {
    log(`服务器已启动，监听端口 ${PORT}`);
    log(`请将浏览器代理设置为 http://127.0.0.1:${PORT}`);
});

// 创建独立的WebSocket服务器
const wsServer = http.createServer();
const wss = new WebSocket.Server({ server: wsServer });

// WebSocket连接处理
wss.on('connection', (ws) => {
    console.log('新的WebSocket客户端连接');
    connectedClients.add(ws);
    
    ws.on('message', (message) => {
        console.log('收到客户端消息:', message);
    });
    
    ws.on('close', () => {
        console.log('WebSocket客户端断开连接');
        connectedClients.delete(ws);
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket错误:', error);
        connectedClients.delete(ws);
    });
});

// 启动WebSocket服务器
wsServer.listen(config.websocket.port, () => {
    log(`WebSocket服务已启动，监听端口 ${config.websocket.port}`);
});

// 优雅退出
process.on('SIGINT', () => {
    log('正在关闭服务器...');
    
    let closedServers = 0;
    const totalServers = 2;
    
    const checkExit = () => {
        closedServers++;
        if (closedServers === totalServers) {
            log('服务器已关闭');
            process.exit(0);
        }
    };
    
    httpServer.close(() => {
        log('HTTP代理服务器已关闭');
        checkExit();
    });
    
    wsServer.close(() => {
        log('WebSocket服务器已关闭');
        checkExit();
    });
});

module.exports = {
    httpServer,
    broadcastMessage,
    log
};