const redisClient = require('../config/redis');
const Message = require('../models/Message');
const logger = require('../config/logger');

class MessageCache {
  constructor() {
    this.cacheKeyPrefix = 'message:';
    this.roomKeyPrefix = 'room:';
    this.expireTime = 3600;
  }

  async getRoomKey(userId1, userId2) {
    const sortedIds = [userId1, userId2].sort();
    return `${this.roomKeyPrefix}${sortedIds.join(':')}`;
  }

  async addMessage(message) {
    try {
      // 确保 sender 和 receiver 是字符串
      const senderId = typeof message.sender === 'object' ? message.sender.toString() : message.sender.toString();
      const receiverId = typeof message.receiver === 'object' ? message.receiver.toString() : message.receiver.toString();
      
      const roomKey = await this.getRoomKey(senderId, receiverId);
      
      // 生成临时 ID（如果没有 _id）
      const messageId = message._id || `temp_${Date.now()}`;
      const messageKey = `${this.cacheKeyPrefix}${messageId}`;
      
      await redisClient.set(messageKey, JSON.stringify(message), {
        EX: this.expireTime
      });
      
      await redisClient.lPush(roomKey, messageId.toString());
      await redisClient.expire(roomKey, this.expireTime);
      
      logger.info(`Message cached: ${messageId}`);
      return true;
    } catch (error) {
      logger.error('Error adding message to cache:', error);
      return false;
    }
  }

  async getMessages(userId1, userId2, limit = 50) {
    try {
      const roomKey = await this.getRoomKey(userId1, userId2);
      const messageIds = await redisClient.lRange(roomKey, 0, limit - 1);
      
      if (messageIds.length === 0) {
        return [];
      }
      
      const messages = [];
      for (const id of messageIds) {
        const messageStr = await redisClient.get(`${this.cacheKeyPrefix}${id}`);
        if (messageStr) {
          messages.push(JSON.parse(messageStr));
        }
      }
      
      return messages.reverse();
    } catch (error) {
      logger.error('Error getting messages from cache:', error);
      return [];
    }
  }

  async persistMessages() {
    try {
      const allMessageKeys = await redisClient.keys(`${this.cacheKeyPrefix}*`);
      logger.info(`Found ${allMessageKeys.length} messages in cache to persist`);
      
      for (const key of allMessageKeys) {
        const messageStr = await redisClient.get(key);
        if (messageStr) {
          const message = JSON.parse(messageStr);
          await Message.create(message);
          await redisClient.del(key);
          logger.info(`Message persisted to database: ${message._id}`);
        }
      }
      
      await redisClient.flushAll();
      logger.info('All messages persisted successfully');
    } catch (error) {
      logger.error('Error persisting messages:', error);
    }
  }

  async clearRoomCache(userId1, userId2) {
    try {
      const roomKey = await this.getRoomKey(userId1, userId2);
      const messageIds = await redisClient.lRange(roomKey, 0, -1);
      
      for (const id of messageIds) {
        await redisClient.del(`${this.cacheKeyPrefix}${id}`);
      }
      
      await redisClient.del(roomKey);
      logger.info(`Room cache cleared: ${roomKey}`);
    } catch (error) {
      logger.error('Error clearing room cache:', error);
    }
  }
}

module.exports = new MessageCache();