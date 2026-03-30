const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const config = require('./config');

// 创建HTTP服务器
const httpServer = http.createServer();

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