/**
 * Socket私聊消息处理�?
 */

const logger = require('../../config/logger');
const mongoose = require('mongoose');

class PrivateMessageHandler {
  constructor(socketService) {
    this.socketService = socketService;
  }

  /**
   * 处理私聊消息（旧格式�?
   */
  async handlePrivateMessage(socket, userId, data) {
    try {
      const { receiverId, content, type = 'text' } = data;
      
      logger.info(`Processing private message from ${userId} to ${receiverId}`);
      
      // 查找接收�?
      const receiverSocketId = this.socketService.onlineUsers.get(receiverId);
      
      if (receiverSocketId) {
        const messageData = {
          _id: new mongoose.Types.ObjectId(),
          content,
          type,
          sender: {
            _id: userId,
            userId: socket.user.userId,
            username: socket.user.username,
            avatar: socket.user.avatar
          },
          receiver: {
            _id: receiverId
          },
          createdAt: new Date().toISOString()
        };

        // 发送给接收�?
        this.socketService.io.to(receiverSocketId).emit('privateMessage', messageData);
        logger.info(`�?Private message delivered to ${receiverId}`);
      } else {
        logger.warn(`�?Receiver ${receiverId} is offline`);
      }
    } catch (err) {
      logger.error('Error handling private message:', err);
    }
  }

  /**
   * 处理私聊消息（新格式 chat:privateMessage�?
   */
  async handleChatPrivateMessage(socket, userId, data) {
    try {
      const { receiverId, content, clientMsgId, type = 'text' } = data;
      logger.info(`Received chat:privateMessage from ${userId} to ${receiverId}`);
      
      // 查找接收者的 socket
      const receiverSocketId = this.socketService.onlineUsers.get(receiverId);
      
      if (receiverSocketId) {
        // 构造转发数�?
        const forwardData = {
          _id: new mongoose.Types.ObjectId(),
          content,
          type,
          sender: {
            _id: userId,
            userId: socket.user.userId,
            username: socket.user.username,
            avatar: socket.user.avatar
          },
          receiver: {
            _id: receiverId
          },
          clientMsgId,
          createdAt: new Date().toISOString()
        };

        // 转发给接收�?
        this.socketService.io.to(receiverSocketId).emit('privateMessage', forwardData);
        logger.info(`�?Forwarded private message to ${receiverId}`);
      } else {
        logger.warn(`�?Receiver ${receiverId} is offline, message not delivered`);
      }
    } catch (err) {
      logger.error('Error handling chat:privateMessage:', err);
    }
  }

  /**
   * 处理私聊红包
   */
  async handlePrivateRedPacket(socket, userId, data) {
    try {
      const { receiverId, type, amount, count, message, senderId } = data;
      logger.info(`🧧 Received chat:sendPrivateRedPacket from ${userId} to ${receiverId}`, { amount });
      
      // 🔥 扣除发送者余额
      const User = require('../../models/User');
      const RedPacket = require('../../models/RedPacket');
      const IdGenerator = require('../idGenerator');
      
      const sender = await User.findById(userId);
      if (!sender || sender.balance < amount) {
        return socket.emit('errorMessage', { msg: '余额不足' });
      }
      
      sender.balance -= amount;
      await sender.save();
      
      // 🔥 生成红包ID并保存记录
      const redPacketId = await IdGenerator.generateRedPacketId();
      const redPacket = new RedPacket({
        _id: redPacketId.toString(),
        sender: userId,
        type: 'normal',
        totalAmount: amount,
        count: 1,
        message: message || '',
        roomId: '0',
        amounts: [amount],
        isChainRedPacket: false,
        remainAmount: amount,
        remainCount: 1,
        receiverId: receiverId  // 私聊红包接收者
      });
      await redPacket.save();
      
      // 广播发送者余额更新
      this.socketService.io.to(`user:${userId}`).emit('balanceUpdated', {
        type: 6,  // 私聊红包转出
        amount: -amount,
        newBalance: sender.balance,
        receiverId: receiverId,
        timestamp: Date.now()
      });
      
      // 返回发送成功确认给发送方
      socket.emit('redPacketSent', {
        success: true,
        redPacketId: redPacketId.toString(),
        amount: amount,
        receiverId: receiverId,
        message: message || '恭喜发财，大吉大利',
        timestamp: Date.now()
      });
      
      // 查找接收者的 socket
      const receiverSocketId = this.socketService.onlineUsers.get(receiverId);
      
      if (receiverSocketId) {
        // 构造转发数�?
        const forwardData = {
          redPacketId: redPacketId.toString(),
          type,
          amount,
          count,
          message,
          sender: {
            userId: socket.user.userId,
            username: socket.user.username,
            avatar: socket.user.avatar
          },
          receiver: {
            userId: receiverId
          },
          createdAt: new Date().toISOString()
        };

        // 转发给接收�?
        this.socketService.io.to(receiverSocketId).emit('receiveRedPacket', forwardData);
        logger.info(`�?Forwarded private red packet to ${receiverId}`);
      } else {
        logger.warn(`�?Receiver ${receiverId} is offline, red packet not delivered`);
        // 可选：发送失败通知给发送�?
        socket.emit('redPacketDeliveryFailed', {
          redPacketId: redPacketId.toString(),
          reason: 'Receiver is offline'
        });
      }
    } catch (err) {
      logger.error('Error handling private red packet:', err);
    }
  }
}

module.exports = PrivateMessageHandler;
