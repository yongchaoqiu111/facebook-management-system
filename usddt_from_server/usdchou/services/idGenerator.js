/**
 * ID 生成器服务
 * 使用 MongoDB 计数器实现原子性自增
 */

const mongoose = require('mongoose');

// 计数器 Schema
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // userId, groupId, redPacketId
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema, 'counters');

class IdGenerator {
  /**
   * 生成下一个 ID
   * @param {string} counterName - 计数器名称
   * @param {number} startFrom - 起始值
   * @returns {Promise<number>}
   */
  static async getNextId(counterName, startFrom = 1) {
    const counter = await Counter.findByIdAndUpdate(
      counterName,
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    
    // 如果是第一次创建，设置起始值
    if (counter.seq === 1 && startFrom > 1) {
      await Counter.findByIdAndUpdate(counterName, { seq: startFrom });
      return startFrom;
    }
    
    return counter.seq;
  }

  /**
   * 生成用户 ID（8位，从 10000000 开始）
   */
  static async generateUserId() {
    return await this.getNextId('userId', 10000000);
  }

  /**
   * 生成群组 ID（7位，从 1000000 开始）
   */
  static async generateGroupId() {
    return await this.getNextId('groupId', 1000000);
  }

  /**
   * 生成红包 ID（11位，从 10000000000 开始）
   */
  static async generateRedPacketId() {
    return await this.getNextId('redPacketId', 10000000000);
  }

  /**
   * 生成消息 ID（12位，从 100000000000 开始）
   */
  static async generateMessageId() {
    return await this.getNextId('messageId', 100000000000);
  }
}

module.exports = IdGenerator;
