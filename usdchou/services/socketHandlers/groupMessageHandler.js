/**
 * Socket群聊消息处理�?
 */

const logger = require('../../config/logger');
const mongoose = require('mongoose');

class GroupMessageHandler {
  constructor(socketService) {
    this.socketService = socketService;
  }

  /**
   * 处理群聊消息（旧格式�?
   */
  async handleGroupMessage(socket, userId, data) {
    try {
      const { groupId, content } = data;
      
      logger.info(`Processing group message from ${userId} to group ${groupId}`);
      
      const broadcastData = {
        _id: new mongoose.Types.ObjectId(),
        groupId,
        content,
        sender: {
          _id: userId,
          userId: socket.user.userId,
          username: socket.user.username,
          avatar: socket.user.avatar
        },
        createdAt: new Date().toISOString()
      };

      // 广播给群组房间内的所有人
      this.socketService.io.to(`group:${groupId}`).emit('groupMessage', broadcastData);
      logger.info(`Broadcasted group message to group:${groupId}`);
    } catch (err) {
      logger.error('Error handling group message:', err);
    }
  }

  /**
   * 处理群聊消息（新格式 chat:groupMessage�?
   */
  async handleChatGroupMessage(socket, userId, data) {
    try {
      const { groupId, content, clientMsgId } = data;
      logger.info(`Received chat:groupMessage from ${userId} to group ${groupId}`);
      
      // 构造广播数�?
      const broadcastData = {
        _id: new mongoose.Types.ObjectId(),
        groupId,
        content,
        sender: {
          _id: userId,
          userId: socket.user.userId,
          username: socket.user.username,
          avatar: socket.user.avatar
        },
        clientMsgId,
        createdAt: new Date().toISOString()
      };

      // 广播给群组房间内的所有人
      this.socketService.io.to(`group:${groupId}`).emit('groupMessage', broadcastData);
      logger.info(`Broadcasted group message to group:${groupId}`);
    } catch (err) {
      logger.error('Error handling chat:groupMessage:', err);
    }
  }

  /**
   * 处理群聊红包
   */
  async handleGroupRedPacket(socket, userId, data) {
    try {
      const { groupId, redPacketId, type, amount, count, message, senderId } = data;
      logger.info(`🧧 Received chat:sendGroupRedPacket from ${userId} to group ${groupId}`, { redPacketId, amount, count });
      
      // 构造广播数�?
      const broadcastData = {
        redPacketId,
        type,
        amount,
        count,
        message,
        senderId,
        sender: {
          userId: socket.user.userId,
          username: socket.user.username,
          avatar: socket.user.avatar
        },
        groupId,
        createdAt: new Date().toISOString()
      };

      // 广播给群组房间内的所有人，统一使用 receiveMessage 事件
      this.socketService.io.to(`group:${groupId}`).emit('receiveMessage', {
        _id: redPacketId || `rp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'redpacket',
        sender: broadcastData.sender,
        data: {
          redPacketId,
          amount,
          count,
          type,
          message,
          createdAt: broadcastData.createdAt
        },
        groupId,
        timestamp: Date.now()
      });
      logger.info(`📢 Broadcasted group red packet to group:${groupId}`);
    } catch (err) {
      logger.error('Error handling group red packet:', err);
    }
  }
}

module.exports = GroupMessageHandler;
