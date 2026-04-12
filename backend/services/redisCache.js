const redisClient = require('../config/redis');
const logger = require('../config/logger');

/**
 * Redis 缓存服务
 * 用于缓存用户信息、好友列表、消息等热点数据
 */
class RedisCache {
  constructor() {
    // 缓存键前缀
    this.prefixes = {
      USER_INFO: 'user:info:',
      USER_BALANCE: 'user:balance:',
      FRIEND_LIST: 'user:friends:',
      GROUP_LIST: 'user:groups:',
      GROUP_INFO: 'group:info:',
      GROUP_MEMBERS: 'group:members:',
      PRIVATE_MESSAGE: 'message:private:',
      GROUP_MESSAGE: 'message:group:',
      ONLINE_STATUS: 'user:online:',
      USER_SETTINGS: 'user:settings:'
    };

    // TTL 配置（秒）
    this.ttl = {
      USER_INFO: 3600,        // 用户信息：1小时
      USER_BALANCE: 300,      // 用户余额：5分钟
      FRIEND_LIST: 1800,      // 好友列表：30分钟
      GROUP_LIST: 1800,       // 群组列表：30分钟
      GROUP_INFO: 3600,       // 群组信息：1小时
      GROUP_MEMBERS: 1800,    // 群组成员：30分钟
      PRIVATE_MESSAGE: 86400, // 私聊消息：24小时
      GROUP_MESSAGE: 86400,   // 群聊消息：24小时
      ONLINE_STATUS: 300,     // 在线状态：5分钟
      USER_SETTINGS: 3600     // 用户设置：1小时
    };

    logger.info('Redis cache service initialized');
  }

  /**
   * 获取缓存
   */
  async get(prefixKey, id) {
    try {
      const key = `${this.prefixes[prefixKey]}${id}`;
      const data = await redisClient.get(key);
      
      if (data) {
        logger.debug(`Cache hit: ${key}`);
        return JSON.parse(data);
      }
      
      logger.debug(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  /**
   * 设置缓存
   */
  async set(prefixKey, id, data, customTTL = null) {
    try {
      const key = `${this.prefixes[prefixKey]}${id}`;
      const ttl = customTTL || this.ttl[prefixKey] || 3600;
      
      await redisClient.set(key, JSON.stringify(data), {
        EX: ttl
      });
      
      logger.debug(`Cache set: ${key}, TTL: ${ttl}s`);
      return true;
    } catch (error) {
      logger.error('Redis set error:', error);
      return false;
    }
  }

  /**
   * 删除缓存
   */
  async delete(prefixKey, id) {
    try {
      const key = `${this.prefixes[prefixKey]}${id}`;
      await redisClient.del(key);
      logger.debug(`Cache deleted: ${key}`);
      return true;
    } catch (error) {
      logger.error('Redis delete error:', error);
      return false;
    }
  }

  /**
   * 批量删除缓存（支持通配符）
   */
  async deleteByPattern(pattern) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        logger.debug(`Batch deleted ${keys.length} keys matching: ${pattern}`);
      }
      return keys.length;
    } catch (error) {
      logger.error('Redis delete by pattern error:', error);
      return 0;
    }
  }

  /**
   * 用户信息缓存
   */
  async getUserInfo(userId) {
    return this.get('USER_INFO', userId);
  }

  async setUserInfo(userId, userInfo) {
    return this.set('USER_INFO', userId, userInfo);
  }

  async deleteUserCache(userId) {
    await this.delete('USER_INFO', userId);
    await this.delete('USER_BALANCE', userId);
    await this.delete('FRIEND_LIST', userId);
    await this.delete('GROUP_LIST', userId);
    await this.delete('USER_SETTINGS', userId);
  }

  /**
   * 用户余额缓存
   */
  async getUserBalance(userId) {
    return this.get('USER_BALANCE', userId);
  }

  async setUserBalance(userId, balance) {
    return this.set('USER_BALANCE', userId, { balance });
  }

  /**
   * 好友列表缓存
   */
  async getFriendList(userId) {
    return this.get('FRIEND_LIST', userId);
  }

  async setFriendList(userId, friendList) {
    return this.set('FRIEND_LIST', userId, friendList);
  }

  /**
   * 群组列表缓存
   */
  async getGroupList(userId) {
    return this.get('GROUP_LIST', userId);
  }

  async setGroupList(userId, groupList) {
    return this.set('GROUP_LIST', userId, groupList);
  }

  /**
   * 群组信息缓存
   */
  async getGroupInfo(groupId) {
    return this.get('GROUP_INFO', groupId);
  }

  async setGroupInfo(groupId, groupInfo) {
    return this.set('GROUP_INFO', groupId, groupInfo);
  }

  /**
   * 在线状态缓存
   */
  async setOnlineStatus(userId, socketId) {
    try {
      await this.set('ONLINE_STATUS', userId, { socketId, online: true, lastSeen: Date.now() }, 300);
      return true;
    } catch (error) {
      logger.error('Set online status error:', error);
      return false;
    }
  }

  async getOnlineStatus(userId) {
    return this.get('ONLINE_STATUS', userId);
  }

  async setOfflineStatus(userId) {
    try {
      const key = `${this.prefixes.ONLINE_STATUS}${userId}`;
      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.error('Set offline status error:', error);
      return false;
    }
  }

  /**
   * 检查用户是否在线
   */
  async isUserOnline(userId) {
    const status = await this.getOnlineStatus(userId);
    return status && status.online;
  }

  /**
   * 消息缓存
   */
  async cachePrivateMessage(roomKey, message) {
    try {
      const key = `${this.prefixes.PRIVATE_MESSAGE}${roomKey}`;
      await redisClient.lPush(key, JSON.stringify(message));
      await redisClient.expire(key, this.ttl.PRIVATE_MESSAGE);
      return true;
    } catch (error) {
      logger.error('Cache private message error:', error);
      return false;
    }
  }

  async getPrivateMessages(roomKey, limit = 50) {
    try {
      const key = `${this.prefixes.PRIVATE_MESSAGE}${roomKey}`;
      const messages = await redisClient.lRange(key, 0, limit - 1);
      return messages.map(msg => JSON.parse(msg));
    } catch (error) {
      logger.error('Get private messages error:', error);
      return [];
    }
  }
}

module.exports = new RedisCache();
