const http = require('http');
const https = require('https');
const url = require('url');
const net = require('net');
const fs = require('fs');
const path = require('path');
const forge = require('node-forge');

const config = require('../config');
const messageHandler = require('../parser/messageHandler');

class HttpProxy {
    constructor() {
        this.server = null;
        this.httpsServer = null;
        this.certificateCache = new Map();
    }

    start(httpPort, httpServer, messageCallback) {
        this.messageCallback = messageCallback;
        
        // 创建HTTP代理服务器
        this.server = httpServer;
        
        // 只处理特定路径的请求，避免与静态文件服务冲突
        this.server.on('request', (req, res) => {
            // 检查是否是API或代理请求
            if (req.url.startsWith('/api/') || req.url.startsWith('/proxy/')) {
                this.handleHttpRequest(req, res);
            }
            // 其他请求由Express静态文件服务处理
        });
        
        this.server.on('connect', (req, socket, head) => {
            this.handleHttpsConnect(req, socket, head);
        });
        
        console.log(`HTTP代理服务器已启动，监听端口 ${httpPort}`);
    }

    handleHttpRequest(req, res) {
        const parsedUrl = url.parse(req.url);
        
        // API请求不进行主机检查，交给Express处理
        if (req.url.startsWith('/api/')) {
            return;
        }
        
        // 检查是否允许的主机
        if (!this.isAllowedHost(parsedUrl.hostname)) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Forbidden');
            return;
        }

        // 创建代理请求
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 80,
            path: parsedUrl.path,
            method: req.method,
            headers: req.headers
        };

        const proxyReq = http.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });

        req.pipe(proxyReq);

        proxyReq.on('error', (err) => {
            console.error('HTTP代理请求错误:', err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Proxy Error');
        });
    }

    handleHttpsConnect(req, socket, head) {
        const parsedUrl = url.parse(`http://${req.url}`);
        const hostname = parsedUrl.hostname;
        const port = parsedUrl.port || 443;

        // 检查是否允许的主机
        if (!this.isAllowedHost(hostname)) {
            socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
            socket.destroy();
            return;
        }

        // 创建到目标服务器的连接
        const serverSocket = net.createConnection({
            host: hostname,
            port: port
        }, () => {
            socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
            serverSocket.write(head);
            
            // 双向数据传输
            socket.pipe(serverSocket);
            serverSocket.pipe(socket);
        });

        serverSocket.on('error', (err) => {
            console.error('HTTPS代理连接错误:', err);
            socket.destroy();
        });

        socket.on('error', (err) => {
            console.error('客户端连接错误:', err);
            serverSocket.destroy();
        });
    }

    isAllowedHost(hostname) {
        if (!hostname) return false;
        return config.proxy.allowedHosts.some(host => hostname.includes(host));
    }

    generateCertificate(hostname) {
        if (this.certificateCache.has(hostname)) {
            return this.certificateCache.get(hostname);
        }

        const pki = forge.pki;
        const keys = pki.rsa.generateKeyPair(2048);
        const cert = pki.createCertificate();

        cert.publicKey = keys.publicKey;
        cert.serialNumber = '01';
        cert.validity.notBefore = new Date();
        cert.validity.notAfter = new Date();
        cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

        const attrs = [{
            name: 'commonName',
            value: hostname
        }, {
            name: 'organizationName',
            value: config.certificate.organization
        }, {
            name: 'countryName',
            value: config.certificate.country
        }, {
            shortName: 'ST',
            value: config.certificate.state
        }, {
            shortName: 'L',
            value: config.certificate.locality
        }];

        cert.setSubject(attrs);
        cert.setIssuer(attrs);
        cert.sign(keys.privateKey, forge.md.sha256.create());

        const certificate = {
            key: pki.privateKeyToPem(keys.privateKey),
            cert: pki.certificateToPem(cert)
        };

        this.certificateCache.set(hostname, certificate);
        return certificate;
    }
}

// 导出单例
const httpProxy = new HttpProxy();

module.exports = httpProxy;