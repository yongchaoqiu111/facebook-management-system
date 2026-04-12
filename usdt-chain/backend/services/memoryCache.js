const logger = require('../config/logger');

/**
 * 内存缓存服务
 * 用于存储高频访问的数据，减少 Redis 访问压力
 * TTL: 5分钟
 */
class MemoryCache {
  constructor() {
    // 内存存储
    this.store = new Map();
    
    // 缓存配置
    this.config = {
      DEFAULT_TTL: 5 * 60 * 1000,  // 默认 5 分钟
      MAX_ENTRIES: 10000,           // 最大条目数
      CLEANUP_INTERVAL: 60 * 1000   // 清理间隔 1 分钟
    };

    // 启动定期清理过期缓存
    this.startCleanup();

    logger.info(`Memory cache initialized (TTL: ${this.config.DEFAULT_TTL / 1000}s, Max: ${this.config.MAX_ENTRIES})`);
  }

  /**
   * 获取缓存
   */
  get(key) {
    const item = this.store.get(key);
    
    if (!item) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > item.expiry) {
      this.store.delete(key);
      logger.debug(`Memory cache expired: ${key}`);
      return null;
    }

    logger.debug(`Memory cache hit: ${key}`);
    return item.value;
  }

  /**
   * 设置缓存
   */
  set(key, value, customTTL = null) {
    // 如果缓存已满，清理最旧的条目
    if (this.store.size >= this.config.MAX_ENTRIES) {
      this.evictOldest();
    }

    const ttl = customTTL || this.config.DEFAULT_TTL;
    
    this.store.set(key, {
      value,
      expiry: Date.now() + ttl,
      createdAt: Date.now()
    });

    logger.debug(`Memory cache set: ${key}, TTL: ${ttl / 1000}s`);
  }

  /**
   * 删除缓存
   */
  delete(key) {
    return this.store.delete(key);
  }

  /**
   * 批量删除（支持模式匹配）
   */
  deleteByPattern(pattern) {
    const regex = new RegExp(pattern.replace('*', '.*'));
    let count = 0;
    
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        count++;
      }
    }
    
    if (count > 0) {
      logger.debug(`Memory cache batch deleted: ${count} keys`);
    }
    
    return count;
  }

  /**
   * 清理过期缓存
   */
  cleanup() {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [key, item] of this.store.entries()) {
      if (now > item.expiry) {
        this.store.delete(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      logger.debug(`Memory cache cleanup: removed ${expiredCount} expired items`);
    }
  }

  /**
   * 清理最旧的条目
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, item] of this.store.entries()) {
      if (item.createdAt < oldestTime) {
        oldestTime = item.createdAt;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.store.delete(oldestKey);
      logger.debug(`Memory cache evicted oldest: ${oldestKey}`);
    }
  }

  /**
   * 启动定期清理
   */
  startCleanup() {
    setInterval(() => {
      this.cleanup();
    }, this.config.CLEANUP_INTERVAL);
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    const now = Date.now();
    let activeCount = 0;
    let expiredCount = 0;
    
    for (const item of this.store.values()) {
      if (now > item.expiry) {
        expiredCount++;
      } else {
        activeCount++;
      }
    }
    
    return {
      total: this.store.size,
      active: activeCount,
      expired: expiredCount,
      maxEntries: this.config.MAX_ENTRIES
    };
  }

  /**
   * 清空所有缓存
   */
  clear() {
    this.store.clear();
    logger.info('Memory cache cleared');
  }

  // ====== 用户信息缓存 ======
  
  getUserInfo(userId) {
    return this.get(`user:info:${userId}`);
  }

  setUserInfo(userId, userInfo, ttl = null) {
    return this.set(`user:info:${userId}`, userInfo, ttl);
  }

  deleteUserCache(userId) {
    this.deleteByPattern(`user:*:${userId}`);
  }

  // ====== 好友列表缓存 ======
  
  getFriendList(userId) {
    return this.get(`user:friends:${userId}`);
  }

  setFriendList(userId, friendList, ttl = null) {
    return this.set(`user:friends:${userId}`, friendList, ttl);
  }

  // ====== 群组列表缓存 ======
  
  getGroupList(userId) {
    return this.get(`user:groups:${userId}`);
  }

  setGroupList(userId, groupList, ttl = null) {
    return this.set(`user:groups:${userId}`, groupList, ttl);
  }

  // ====== 群组信息缓存 ======
  
  getGroupInfo(groupId) {
    return this.get(`group:info:${groupId}`);
  }

  setGroupInfo(groupId, groupInfo, ttl = null) {
    return this.set(`group:info:${groupId}`, groupInfo, ttl);
  }

  // ====== 消息缓存 ======
  
  getLastMessage(roomKey) {
    return this.get(`message:last:${roomKey}`);
  }

  setLastMessage(roomKey, message, ttl = null) {
    return this.set(`message:last:${roomKey}`, message, ttl);
  }

  // ====== 在线状态缓存 ======
  
  setOnlineUser(userId, socketId) {
    this.set(`user:online:${userId}`, { socketId, online: true, lastSeen: Date.now() }, 60 * 1000);
  }

  getOnlineUser(userId) {
    return this.get(`user:online:${userId}`);
  }

  removeOnlineUser(userId) {
    this.delete(`user:online:${userId}`);
  }
}

module.exports = new MemoryCache();
