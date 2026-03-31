const psList = require('ps-list');
const config = require('../config');

class ProcessFilter {
    constructor() {
        this.enabled = config.processFilter.enabled;
        this.allowedProcesses = config.processFilter.allowedProcesses;
        this.processCache = new Map();
        this.cacheTimeout = 30000; // 30秒缓存
    }
    
    async isAllowedProcess(processId) {
        if (!this.enabled) {
            return true;
        }
        
        // 检查缓存
        const cached = this.processCache.get(processId);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.allowed;
        }
        
        try {
            // 获取进程列表
            const processes = await psList();
            const process = processes.find(p => p.pid === parseInt(processId));
            
            if (!process) {
                this.processCache.set(processId, { allowed: false, timestamp: Date.now() });
                return false;
            }
            
            // 检查进程名称
            const processName = process.name.toLowerCase();
            const allowed = this.allowedProcesses.some(allowedName => 
                processName.includes(allowedName.toLowerCase())
            );
            
            // 更新缓存
            this.processCache.set(processId, { allowed, timestamp: Date.now() });
            
            return allowed;
            
        } catch (error) {
            console.error('获取进程信息失败:', error);
            // 出错时默认允许
            return true;
        }
    }
    
    async getAllowedProcesses() {
        try {
            const processes = await psList();
            return processes.filter(process => {
                const processName = process.name.toLowerCase();
                return this.allowedProcesses.some(allowedName => 
                    processName.includes(allowedName.toLowerCase())
                );
            });
            
        } catch (error) {
            console.error('获取允许的进程失败:', error);
            return [];
        }
    }
    
    async getProcessInfo(processId) {
        try {
            const processes = await psList();
            return processes.find(p => p.pid === parseInt(processId));
            
        } catch (error) {
            console.error('获取进程信息失败:', error);
            return null;
        }
    }
    
    // 清理过期缓存
    cleanupCache() {
        const now = Date.now();
        for (const [pid, cache] of this.processCache.entries()) {
            if (now - cache.timestamp > this.cacheTimeout) {
                this.processCache.delete(pid);
            }
        }
    }
    
    // 启动定期清理
    startCleanupInterval() {
        setInterval(() => {
            this.cleanupCache();
        }, this.cacheTimeout);
    }
}

// 导出单例
const processFilter = new ProcessFilter();

// 启动定期清理
processFilter.startCleanupInterval();

module.exports = processFilter;