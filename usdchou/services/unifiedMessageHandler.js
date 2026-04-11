/**
 * 统一消息处理器
 * 消息分类：1=聊天, 2=红包, 3=系统
 */

const logger = require('../config/logger');
const mongoose = require('mongoose');
const GroupMessage = require('../models/GroupMessage');
const Message = require('../models/Message');

class UnifiedMessageHandler {
  constructor(socketService) {
    this.socketService = socketService;
  }

  /**
   * 处理统一消息格式
   */
  async handleUnifiedMessage(socket, userId, data) {
    const { msgType, msgId, senderId, receiverId, groupId, content, timestamp } = data;
    
    logger.info(`📨 [统一消息] type=${msgType}, from=${senderId}, group=${groupId}`);

    try {
      switch (msgType) {
        case 1: // 聊天消息
          await this.handleChatMessage(socket, userId, data);
          break;
          
        case 2: // 红包消息
          await this.handleRedPacketMessage(socket, userId, data);
          break;
          
        case 3: // 系统消息
          await this.handleSystemMessage(socket, userId, data);
          break;
          
        default:
          logger.warn(`⚠️ 未知消息类型: ${msgType}`);
          socket.emit('errorMessage', { msg: '未知消息类型' });
      }
    } catch (err) {
      logger.error('[统一消息] 处理错误:', err);
      socket.emit('errorMessage', { msg: '消息处理失败' });
    }
  }

  /**
   * 处理聊天消息（type=1）- 直接广播
   */
  async handleChatMessage(socket, userId, data) {
    const { msgId, senderId, receiverId, groupId, content } = data;
    
    // 构建广播数据
    const broadcastData = {
      _id: msgId,
      type: content.type || 'text',
      sender: {
        _id: senderId,
        userId: socket.user.userId,
        username: socket.user.username,
        avatar: socket.user.avatar
      },
      content: content.text || content,
      groupId,
      timestamp: Date.now()
    };

    if (groupId) {
      // 群聊消息 - 保存到数据库 + 广播
      try {
        const groupMsg = new GroupMessage({
          groupId,
          sender: senderId,
          type: content.type || 'text',
          content: content.text || content,
          clientMsgId: msgId
        });
        await groupMsg.save();
      } catch (err) {
        logger.error('保存群消息失败:', err);
      }
      
      // 广播给群组
      this.socketService.io.to(`group:${groupId}`).emit('receiveMessage', broadcastData);
      logger.info(`📢 [聊天] 群消息已广播到 ${groupId}`);
      
    } else if (receiverId) {
      // 私聊消息 - 保存到数据库 + 发送给接收者
      try {
        const privateMsg = new Message({
          sender: senderId,
          receiver: receiverId,
          type: content.type || 'text',
          content: content.text || content,
          clientMsgId: msgId
        });
        await privateMsg.save();
      } catch (err) {
        logger.error('保存私聊消息失败:', err);
      }
      
      // 发送给接收者
      this.socketService.io.to(`user:${receiverId}`).emit('receiveMessage', broadcastData);
      logger.info(`📢 [聊天] 私聊消息已发送给 ${receiverId}`);
    }
  }

  /**
   * 处理红包消息（type=2）- 存数据库 + 广播
   */
  async handleRedPacketMessage(socket, userId, data) {
    const { msgId, senderId, groupId, content } = data;
    
    // 🔥 如果是接龙红包且没有 redPacketId，需要创建红包记录
    let redPacketId = content.redPacketId;
    if (!redPacketId && content.type === 'chainRedpacket') {
      try {
        const Group = require('../models/Group');
        const RedPacket = require('../models/RedPacket');
        const IdGenerator = require('./idGenerator');
        
        const group = await Group.findById(groupId);
        if (group && group.settings.isChainRedPacket) {
          // 生成红包ID
          const newRedPacketId = await IdGenerator.generateRedPacketId();
          redPacketId = newRedPacketId.toString();
          
          // 创建红包记录
          const redPacketCount = group.settings.redPacketCount || 30;
          const perAmount = group.settings.redPacketPerAmount || 10;
          const totalAmount = redPacketCount * perAmount;
          const amounts = Array(redPacketCount).fill(perAmount);
          
          const redPacket = new RedPacket({
            _id: redPacketId,
            sender: userId,
            type: 'normal',
            totalAmount: totalAmount,
            count: redPacketCount,
            message: content.message || '接龙红包',
            roomId: groupId,
            amounts,
            isChainRedPacket: true,
            chainGroupId: groupId,
            remainAmount: totalAmount,
            remainCount: redPacketCount
          });
          
          await redPacket.save();
          logger.info(`✅ [接龙红包] 创建成功: ${redPacketId}`);
        }
      } catch (err) {
        logger.error('❌ [接龙红包] 创建失败:', err.message);
      }
    }
    
    logger.info(`🧧 [红包] 收到红包消息, redPacketId=${redPacketId}`);
    
    // 构建红包广播数据（统一格式）
    const broadcastData = {
      msgType: 2,  // 🔥 红包消息
      msgId: msgId,
      senderId: senderId,
      receiverId: null,
      groupId: groupId,
      content: {
        type: 'redpacket',
        redPacketId: redPacketId || '',
        redPacketType: content.redPacketType || (content.type === 'chainRedpacket' ? 'chain' : 'normal'),
        totalAmount: content.amount || 0,
        count: content.count || 0,
        remainCount: content.count || 0,
        message: content.message || '红包',
        createdAt: new Date().toISOString()
      },
      timestamp: Date.now()
    };
    
    logger.info(`📢 [红包] 广播数据:`, JSON.stringify(broadcastData));

    if (groupId) {
      // ✅ 公开群不保存到数据库（只在 IndexedDB 存储）
      const Group = require('../models/Group');
      const group = await Group.findById(groupId);
      const isPublicGroup = group?.isPublic;
      
      if (!isPublicGroup) {
        // 保存到 GroupMessage
        try {
          const groupMsg = new GroupMessage({
            groupId,
            sender: senderId,
            type: 'redpacket',
            content: content.message || '红包',
            redPacketId: redPacketId,
            clientMsgId: msgId,
            metadata: {
              amount: content.amount,
              count: content.count
            }
          });
          await groupMsg.save();
          logger.info(`✅ [红包] 已保存到数据库`);
        } catch (err) {
          logger.error('保存红包消息失败:', err);
        }
      } else {
        logger.info(`ℹ️ [红包] 公开群，跳过数据库保存`);
      }
      
      // 广播给群组
      this.socketService.io.to(`group:${groupId}`).emit('receiveMessage', broadcastData);
      logger.info(`📢 [红包] 已广播到群组 ${groupId}`);
    }
  }

  /**
   * 处理系统消息（type=3）- 直接广播
   */
  async handleSystemMessage(socket, userId, data) {
    const { msgId, senderId, groupId, content } = data;
    
    const broadcastData = {
      _id: msgId,
      type: 'system',
      sender: {
        _id: senderId,
        username: '系统'
      },
      content: content.text || content,
      groupId,
      timestamp: Date.now()
    };

    if (groupId) {
      this.socketService.io.to(`group:${groupId}`).emit('receiveMessage', broadcastData);
      logger.info(`📢 [系统] 消息已广播到 ${groupId}`);
    }
  }
}

module.exports = UnifiedMessageHandler;
