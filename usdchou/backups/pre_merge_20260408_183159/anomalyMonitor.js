/**
 * 异常交易监控系统
 * 检测可疑行为并自动告警
 */
const redisClient = require('../config/redis');
const logger = require('../config/logger');

class AnomalyMonitor {
  constructor() {
    this.alertThresholds = {
      redPacketGrabPerMinute: 50,  // 1分钟抢红包超过50次
      withdrawAmount: 10000,        // 单笔提现超过1万
      balanceChangePercent: 50,     // 余额变动超过50%
      loginAttemptsPerHour: 10      // 1小时登录失败超过10次
    };
  }

  // 监控抢红包频率
  async monitorRedPacketGrab(userId, redPacketId) {
    const key = `monitor:redpacket:${userId}`;
    
    // 记录本次操作
    await redisClient.zadd(key, Date.now(), `${redPacketId}:${Date.now()}`);
    
    // 删除1分钟前的记录
    const oneMinuteAgo = Date.now() - 60000;
    await redisClient.zremrangebyscore(key, 0, oneMinuteAgo);
    
    // 获取1分钟内的次数
    const count = await redisClient.zcard(key);
    
    // 设置过期时间（5分钟）
    await redisClient.expire(key, 300);
    
    // 检查是否超过阈值
    if (count > this.alertThresholds.redPacketGrabPerMinute) {
      await this.sendAlert('RED_PACKET_SPAM', {
        userId,
        count,
        threshold: this.alertThresholds.redPacketGrabPerMinute,
        message: `用户 ${userId} 1分钟内抢红包 ${count} 次，超过阈值 ${this.alertThresholds.redPacketGrabPerMinute}`
      });
      
      return true; // 触发告警
    }
    
    return false;
  }

  // 监控大额提现
  async monitorWithdraw(userId, amount, balanceBefore) {
    if (amount > this.alertThresholds.withdrawAmount) {
      await this.sendAlert('LARGE_WITHDRAW', {
        userId,
        amount,
        balanceBefore,
        threshold: this.alertThresholds.withdrawAmount,
        message: `用户 ${userId} 提现 ${amount} USDT，超过阈值 ${this.alertThresholds.withdrawAmount}`
      });
      
      return true;
    }
    
    return false;
  }

  // 监控余额异常变动
  async monitorBalanceChange(userId, balanceBefore, balanceAfter) {
    if (balanceBefore > 0) {
      const changePercent = Math.abs(balanceAfter - balanceBefore) / balanceBefore * 100;
      
      if (changePercent > this.alertThresholds.balanceChangePercent) {
        await this.sendAlert('BALANCE_ANOMALY', {
          userId,
          balanceBefore,
          balanceAfter,
          changePercent: changePercent.toFixed(2),
          threshold: this.alertThresholds.balanceChangePercent,
          message: `用户 ${userId} 余额变动 ${changePercent.toFixed(2)}% (${balanceBefore} → ${balanceAfter})`
        });
        
        return true;
      }
    }
    
    return false;
  }

  // 监控登录失败
  async monitorLoginFailure(userId, ip) {
    const key = `monitor:login:${ip}`;
    
    await redisClient.incr(key);
    await redisClient.expire(key, 3600); // 1小时过期
    
    const count = await redisClient.get(key);
    
    if (parseInt(count) > this.alertThresholds.loginAttemptsPerHour) {
      await this.sendAlert('LOGIN_BRUTE_FORCE', {
        userId,
        ip,
        count,
        threshold: this.alertThresholds.loginAttemptsPerHour,
        message: `IP ${ip} 1小时内登录失败 ${count} 次，疑似暴力破解`
      });
      
      return true;
    }
    
    return false;
  }

  // 发送告警（可以扩展为短信、邮件、钉钉等）
  async sendAlert(type, data) {
    const alertData = {
      type,
      timestamp: new Date().toISOString(),
      ...data
    };
    
    // 1. 记录到日志
    logger.warn(`🚨 安全告警 [${type}]:`, JSON.stringify(alertData));
    
    // 2. 存储到Redis（供管理后台查询）
    await redisClient.lpush('alerts:recent', JSON.stringify(alertData));
    await redisClient.ltrim('alerts:recent', 0, 99); // 保留最近100条
    
    // 3. TODO: 可以扩展发送到钉钉/企业微信/短信
    // await this.sendToDingTalk(alertData);
    // await this.sendSMS(alertData);
    
    logger.info(`✅ 告警已记录: ${type}`);
  }

  // 获取最近的告警（供管理后台使用）
  async getRecentAlerts(limit = 20) {
    const alerts = await redisClient.lrange('alerts:recent', 0, limit - 1);
    return alerts.map(a => JSON.parse(a));
  }

  // 清除告警记录
  async clearAlerts() {
    await redisClient.del('alerts:recent');
  }
}

module.exports = new AnomalyMonitor();
