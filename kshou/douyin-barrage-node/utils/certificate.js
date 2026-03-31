const forge = require('node-forge');
const fs = require('fs');
const path = require('path');
const config = require('../config');

class CertificateManager {
    constructor() {
        this.certDir = path.join(__dirname, '../certs');
        this.keyPath = path.join(this.certDir, 'server.key');
        this.certPath = path.join(this.certDir, 'server.crt');
    }
    
    init() {
        try {
            // 创建证书目录
            if (!fs.existsSync(this.certDir)) {
                fs.mkdirSync(this.certDir, { recursive: true });
            }
            
            // 检查证书是否存在
            if (!fs.existsSync(this.keyPath) || !fs.existsSync(this.certPath)) {
                console.log('证书不存在，正在生成...');
                this.generateCertificate();
            }
            
            console.log('证书初始化完成');
            return true;
            
        } catch (error) {
            console.error('证书初始化失败:', error);
            return false;
        }
    }
    
    generateCertificate() {
        try {
            // 生成RSA密钥对
            const keys = forge.pki.rsa.generateKeyPair(2048);
            
            // 创建证书
            const cert = forge.pki.createCertificate();
            
            // 设置证书属性
            cert.publicKey = keys.publicKey;
            cert.serialNumber = Date.now().toString();
            
            const certConfig = config.certificate;
            cert.validity.notBefore = new Date();
            cert.validity.notAfter = new Date();
            cert.validity.notAfter.setDate(cert.validity.notBefore.getDate() + certConfig.validityDays);
            
            // 设置主题和颁发者
            const attrs = [
                { name: 'commonName', value: certConfig.commonName },
                { name: 'organizationName', value: certConfig.organization },
                { name: 'countryName', value: certConfig.country },
                { name: 'stateOrProvinceName', value: certConfig.state },
                { name: 'localityName', value: certConfig.locality }
            ];
            
            cert.setSubject(attrs);
            cert.setIssuer(attrs);
            
            // 添加扩展
            cert.setExtensions([
                {
                    name: 'basicConstraints',
                    cA: true
                },
                {
                    name: 'keyUsage',
                    digitalSignature: true,
                    keyEncipherment: true,
                    keyCertSign: true
                },
                {
                    name: 'extKeyUsage',
                    serverAuth: true,
                    clientAuth: true
                },
                {
                    name: 'subjectAltName',
                    altNames: [
                        { type: 2, value: 'webcast.douyin.com' },
                        { type: 2, value: 'aweme.snssdk.com' },
                        { type: 2, value: 'live.douyin.com' },
                        { type: 7, ip: '127.0.0.1' }
                    ]
                }
            ]);
            
            // 自签名证书
            cert.sign(keys.privateKey, forge.md.sha256.create());
            
            // 保存证书和私钥
            fs.writeFileSync(this.keyPath, forge.pki.privateKeyToPem(keys.privateKey));
            fs.writeFileSync(this.certPath, forge.pki.certificateToPem(cert));
            
            console.log('证书生成成功');
            
            // 尝试安装证书到系统
            this.installCertificate();
            
        } catch (error) {
            console.error('生成证书失败:', error);
            throw error;
        }
    }
    
    installCertificate() {
        try {
            // 在Windows系统上安装证书
            if (process.platform === 'win32') {
                const exec = require('child_process').execSync;
                
                // 使用certutil命令安装证书
                exec(`certutil -addstore -user root "${this.certPath}"`, { stdio: 'ignore' });
                
                console.log('证书已安装到系统信任存储');
            } else {
                console.log('非Windows系统，请手动安装证书');
            }
            
        } catch (error) {
            console.warn('自动安装证书失败，请手动安装:', error.message);
            console.log(`证书位置: ${this.certPath}`);
        }
    }
    
    getCertificate() {
        try {
            const key = fs.readFileSync(this.keyPath, 'utf8');
            const cert = fs.readFileSync(this.certPath, 'utf8');
            
            return {
                key: key,
                cert: cert
            };
            
        } catch (error) {
            console.error('读取证书失败:', error);
            return null;
        }
    }
    
    validateCertificate() {
        try {
            if (!fs.existsSync(this.keyPath) || !fs.existsSync(this.certPath)) {
                return false;
            }
            
            const cert = fs.readFileSync(this.certPath, 'utf8');
            const parsedCert = forge.pki.certificateFromPem(cert);
            
            // 检查证书是否过期
            const now = new Date();
            if (now < parsedCert.validity.notBefore || now > parsedCert.validity.notAfter) {
                return false;
            }
            
            return true;
            
        } catch (error) {
            console.error('验证证书失败:', error);
            return false;
        }
    }
    
    renewCertificate() {
        try {
            // 删除旧证书
            if (fs.existsSync(this.keyPath)) fs.unlinkSync(this.keyPath);
            if (fs.existsSync(this.certPath)) fs.unlinkSync(this.certPath);
            
            // 生成新证书
            this.generateCertificate();
            
            console.log('证书已更新');
            return true;
            
        } catch (error) {
            console.error('更新证书失败:', error);
            return false;
        }
    }
}

// 导出单例
const certificateManager = new CertificateManager();

module.exports = certificateManager;