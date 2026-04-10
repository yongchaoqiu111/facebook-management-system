const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// 启动HTTP代理服务器
function start(port, server, onMessageCallback) {
    server.on('request', (req, res) => {
        const { method, url, headers } = req;
        
        // 解析请求URL
        const urlObj = new URL(url, 'http://localhost');
        const host = urlObj.host;
        const path = urlObj.pathname + urlObj.search;
        
        // 检查是否允许的主机
        const config = require('../config');
        if (!config.proxy.allowedHosts.includes(host)) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Forbidden: Host not allowed');
            return;
        }
        
        // 创建代理请求
        const options = {
            hostname: host,
            port: 80,
            path: path,
            method: method,
            headers: headers
        };
        
        const proxyReq = http.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            
            // 监听数据
            proxyRes.on('data', (chunk) => {
                const data = chunk.toString();
                
                // 尝试解析弹幕数据
                try {
                    if (data.includes('webcast-chatroom')) {
                        // 这可能是弹幕数据，尝试提取
                        const message = parseDanmaku(data);
                        if (message) {
                            onMessageCallback(message);
                        }
                    }
                } catch (error) {
                    console.error('解析弹幕数据失败:', error);
                }
                
                res.write(chunk);
            });
            
            proxyRes.on('end', () => {
                res.end();
            });
        });
        
        proxyReq.on('error', (error) => {
            console.error('代理请求错误:', error);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Proxy error');
        });
        
        req.pipe(proxyReq);
    });
}

// 解析弹幕数据
function parseDanmaku(html) {
    // 简单的解析逻辑，实际项目中可能需要更复杂的解析
    const chatPattern = /webcast-chatroom___content-with-emoji-text">(.*?)<\/span>/g;
    const userPattern = /v8LY0gZF">(.*?):<\/span>/g;
    
    const users = [];
    const contents = [];
    
    let match;
    while ((match = userPattern.exec(html)) !== null) {
        users.push(match[1]);
    }
    
    while ((match = chatPattern.exec(html)) !== null) {
        contents.push(match[1]);
    }
    
    if (users.length > 0 && contents.length > 0) {
        return {
            type: 'chat',
            user_name: users[users.length - 1],
            content: contents[contents.length - 1],
            timestamp: Date.now()
        };
    }
    
    return null;
}

module.exports = {
    start
};