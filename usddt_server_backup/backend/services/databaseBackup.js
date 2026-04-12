/**
 * 数据库自动备份脚本
 * 每天凌晨2点执行，备份到本地和云存储
 */
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

class DatabaseBackup {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    this.maxBackups = 30; // 保留30天备份
    this.dbName = process.env.MONGODB_DB || 'usdchou';
    this.dbHost = process.env.MONGODB_HOST || 'localhost';
    this.dbPort = process.env.MONGODB_PORT || '27017';
    
    // 确保备份目录存在
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  // 执行备份
  async backup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(this.backupDir, `backup-${timestamp}.gz`);
    
    return new Promise((resolve, reject) => {
      logger.info(`🔄 开始数据库备份: ${backupFile}`);
      
      // 使用 mongodump 命令备份
      const command = `mongodump --host ${this.dbHost}:${this.dbPort} --db ${this.dbName} --archive=${backupFile} --gzip`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          logger.error(`❌ 备份失败: ${error.message}`);
          reject(error);
          return;
        }
        
        logger.info(`✅ 备份成功: ${backupFile}`);
        
        // 清理旧备份
        this.cleanupOldBackups();
        
        resolve(backupFile);
      });
    });
  }

  // 清理旧备份（保留最近N天）
  cleanupOldBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(f => f.startsWith('backup-'))
        .sort()
        .reverse();
      
      // 删除超过最大数量的备份
      if (files.length > this.maxBackups) {
        const toDelete = files.slice(this.maxBackups);
        toDelete.forEach(file => {
          const filePath = path.join(this.backupDir, file);
          fs.unlinkSync(filePath);
          logger.info(`🗑️ 删除旧备份: ${file}`);
        });
      }
      
      logger.info(`📦 当前备份数量: ${Math.min(files.length, this.maxBackups)}/${this.maxBackups}`);
    } catch (err) {
      logger.error(`清理旧备份失败: ${err.message}`);
    }
  }

  // 启动定时备份（每天凌晨2点）
  startScheduledBackup() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);
    
    const msUntilNextBackup = tomorrow.getTime() - now.getTime();
    
    logger.info(`⏰ 下次备份时间: ${tomorrow.toLocaleString()}`);
    
    // 第一次备份
    setTimeout(() => {
      this.backup();
      
      // 之后每天执行
      setInterval(() => {
        this.backup();
      }, 24 * 60 * 60 * 1000);
    }, msUntilNextBackup);
  }
}

module.exports = new DatabaseBackup();
