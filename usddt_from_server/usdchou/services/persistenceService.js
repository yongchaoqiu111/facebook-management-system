const redisClient = require('../config/redis');
const Message = require('../models/Message');
const logger = require('../config/logger');

/**
 * 数据持久化服务
 * 定期将 Redis 缓存中的数据同步到 MongoDB
 */
class PersistenceService {
  constructor() {
    // 持久化间隔（毫秒）
    this.interval = 5 * 60 * 1000; // 5分钟
    
    // 是否正在运行
    this.isRunning = false;
    
    // 定时器引用
    this.timer = null;
    
    logger.info(`Persistence service initialized (interval: ${this.interval / 1000}s)`);
  }

  /**
   * 启动持久化服务
   */
  start() {
    if (this.isRunning) {
      logger.warn('Persistence service is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting persistence service...');

    // 立即执行一次
    this.persist();

    // 设置定时任务
    this.timer = setInterval(() => {
      this.persist();
    }, this.interval);
  }

  /**
   * 停止持久化服务
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    logger.info('Persistence service stopped');
  }

  /**
   * 执行持久化
   * 注意：聊天消息不再持久化到MongoDB，由前端IndexedDB存储
   * 只持久化红包、资金流水等关键数据
   */
  async persist() {
    try {
      logger.info('Starting data persistence...');

      // ⚠️ 聊天消息不再持久化，由前端IndexedDB管理
      // await this.persistPrivateMessages();
      // await this.persistGroupMessages();

      // ✅ 红包数据已由RedPacket模型直接写入MongoDB，无需额外持久化
      // ✅ 资金流水已由Transaction模型直接写入MongoDB
      
      logger.info('Data persistence completed (chat messages skipped, using IndexedDB)');
    } catch (error) {
      logger.error('Error during data persistence:', error);
    }
  }

  /**
   * 持久化私聊消息
   */
  async persistPrivateMessages() {
    try {
      const keys = await redisClient.keys('message:private:*');
      
      if (keys.length === 0) {
        logger.debug('No private messages to persist');
        return;
      }

      let persistedCount = 0;

      for (const key of keys) {
        const messages = await redisClient.lRange(key, 0, -1);
        
        if (messages.length === 0) continue;

        for (const msgStr of messages) {
          try {
            const message = JSON.parse(msgStr);
            
            // 检查消息是否已存在
            const exists = await Message.findById(message.id);
            if (!exists) {
              const newMessage = new Message({
                _id: message.id,
                sender: message.sender,
                receiver: message.receiver,
                content: message.content,
                type: message.type || 'text',
                timestamp: message.timestamp,
                read: message.read || false
              });
              
              await newMessage.save();
              persistedCount++;
            }
          } catch (err) {
            logger.error(`Error persisting message from ${key}:`, err);
          }
        }

        // 持久化后删除 Redis 中的消息
        await redisClient.del(key);
      }

      logger.info(`Persisted ${persistedCount} private messages`);
    } catch (error) {
      logger.error('Error persisting private messages:', error);
    }
  }

  /**
   * 持久化群聊消息
   */
  async persistGroupMessages() {
    try {
      const keys = await redisClient.keys('message:group:*');
      
      if (keys.length === 0) {
        logger.debug('No group messages to persist');
        return;
      }

      let persistedCount = 0;

      for (const key of keys) {
        const messages = await redisClient.lRange(key, 0, -1);
        
        if (messages.length === 0) continue;

        for (const msgStr of messages) {
          try {
            const message = JSON.parse(msgStr);
            
            // 检查消息是否已存在
            const exists = await Message.findById(message.id);
            if (!exists) {
              const newMessage = new Message({
                _id: message.id,
                sender: message.sender,
                groupId: message.groupId,
                content: message.content,
                type: message.type || 'text',
                timestamp: message.timestamp,
                read: message.read || false
              });
              
              await newMessage.save();
              persistedCount++;
            }
          } catch (err) {
            logger.error(`Error persisting group message from ${key}:`, err);
          }
        }

        // 持久化后删除 Redis 中的消息
        await redisClient.del(key);
      }

      logger.info(`Persisted ${persistedCount} group messages`);
    } catch (error) {
      logger.error('Error persisting group messages:', error);
    }
  }

  /**
   * 持久化在线状态（如果需要）
   */
  async persistOnlineStatus() {
    try {
      const keys = await redisClient.keys('user:online:*');
      
      if (keys.length === 0) {
        return;
      }

      logger.debug(`Found ${keys.length} online users`);
      // 这里可以根据需要持久化在线状态
    } catch (error) {
      logger.error('Error persisting online status:', error);
    }
  }

  /**
   * 手动触发持久化
   */
  async forcePersist() {
    logger.info('Manual persistence triggered');
    await this.persist();
  }
}

module.exports = new PersistenceService();
