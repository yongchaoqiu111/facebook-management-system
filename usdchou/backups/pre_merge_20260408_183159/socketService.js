const { Server } = require('socket.io');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Friend = require('../models/Friend');
const Group = require('../models/Group');
const messageCache = require('./messageCache');
const redisClient = require('../config/redis');
const logger = require('../config/logger');
const { PrivateMessageHandler, GroupMessageHandler } = require('./socketHandlers');

class SocketService {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.SOCKET_ORIGIN || '*',
        methods: ['GET', 'POST']
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.onlineUsers = new Map(); // userId -> socketId
    this.socketToUser = new Map(); // socketId -> userId
    this.userSockets = new Map(); // userId -> Set of socketIds

    // 初始化事件处理器
    this.privateMessageHandler = new PrivateMessageHandler(this);
    this.groupMessageHandler = new GroupMessageHandler(this);

    this.initialize();
  }

  initialize() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.user.id;

        const user = await User.findById(socket.userId).select('-password');
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.user = user;
        next();
      } catch (err) {
        logger.error('Socket authentication error:', err);
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    logger.info('Socket service initialized');
  }

  handleConnection(socket) {
    const userId = socket.userId;

    // 🔍 调试日志：详细记录连接信息
    logger.info('🔌 New connection:', {
      socketId: socket.id,
      userId: userId,
      username: socket.user?.username,
      auth: socket.handshake.auth
    });

    // 存储用户连接信息
    this.onlineUsers.set(userId, socket.id);
    this.socketToUser.set(socket.id, userId);

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socket.id);

    logger.info(`User connected: ${userId}, socket: ${socket.id}`);

    // 广播用户上线状态
    this.broadcastUserStatus(userId, 'online');

    // 加入用户专属房间
    socket.join(`user:${userId}`);

    // 获取用户的好友列表并加入所有好友房间
    this.joinUserRooms(socket, userId);

    // 🔍 调试：监听所有事件
    socket.onAny((eventName, ...args) => {
      logger.info(`📨 Event received: ${eventName}`, args);
    });

    // 监听客户端事件
    this.setupEventListeners(socket, userId);
  }

  async joinUserRooms(socket, userId) {
    try {
      // 查找所有好友关系
      const friends = await Friend.find({
        $or: [
          { user1: userId, status: 'accepted' },
          { user2: userId, status: 'accepted' }
        ]
      });

      // 加入每个好友的私聊房间
      friends.forEach(friend => {
        const friendId = friend.user1.toString() === userId ? friend.user2.toString() : friend.user1.toString();
        const roomId = this.getPrivateRoomId(userId, friendId);
        socket.join(roomId);
      });

      // 查找用户所在的所有群组
      const groups = await Group.find({
        'members.userId': userId
      });

      // 加入每个群组房间
      groups.forEach(group => {
        socket.join(`group:${group._id}`);
      });

      logger.info(`User ${userId} joined ${friends.length} private rooms and ${groups.length} group rooms`);
    } catch (err) {
      logger.error('Error joining user rooms:', err);
    }
  }

  setupEventListeners(socket, userId) {
    // ========== 私聊相关 ==========
    
    // 发送私信（旧格式）
    socket.on('privateMessage', async (data) => {
      await this.privateMessageHandler.handlePrivateMessage(socket, userId, data);
    });

    // 发送私信（新格式 chat:privateMessage）
    socket.on('chat:privateMessage', async (data) => {
      await this.privateMessageHandler.handleChatPrivateMessage(socket, userId, data);
    });

    // 发送私聊红包
    socket.on('chat:sendPrivateRedPacket', async (data) => {
      await this.privateMessageHandler.handlePrivateRedPacket(socket, userId, data);
    });

    // ========== 群聊相关 ==========
    
    // 发送群组消息（旧格式）
    socket.on('groupMessage', async (data) => {
      await this.groupMessageHandler.handleGroupMessage(socket, userId, data);
    });

    // 发送群组消息（新格式 chat:groupMessage）
    socket.on('chat:groupMessage', async (data) => {
      await this.groupMessageHandler.handleChatGroupMessage(socket, userId, data);
    });

    // 发送群聊红包
    socket.on('chat:sendGroupRedPacket', async (data) => {
      await this.groupMessageHandler.handleGroupRedPacket(socket, userId, data);
    });

    // ========== 其他事件 ==========

    // 发送红包（旧格式）
    socket.on('sendRedPacket', async (data) => {
      await this.handleSendRedPacket(socket, userId, data);
    });

    // 抢红包
    socket.on('openRedPacket', async (data) => {
      await this.handleOpenRedPacket(socket, userId, data);
    });

    // 获取在线状态
    socket.on('getOnlineStatus', async (userIds) => {
      const statuses = {};
      userIds.forEach(id => {
        statuses[id] = this.onlineUsers.has(id);
      });
      socket.emit('onlineStatus', statuses);
    });

    // 输入中状态
    socket.on('typing', (data) => {
      this.io.to(`user:${data.receiverId}`).emit('userTyping', {
        userId,
        username: socket.user.username,
        roomId: data.roomId
      });
    });

    // 停止输入
    socket.on('stopTyping', (data) => {
      this.io.to(`user:${data.receiverId}`).emit('userStopTyping', {
        userId,
        roomId: data.roomId
      });
    });

    // 🚀 加入群组房间（用于动态进群）
    socket.on('joinGroup', (groupId) => {
      socket.join(`group:${groupId}`);
      logger.info(`User ${userId} manually joined group room: ${groupId}`);
    });

    // 消息已读
    socket.on('messageRead', (data) => {
      this.io.to(`user:${data.senderId}`).emit('messageReadReceipt', {
        messageId: data.messageId,
        readerId: userId
      });
    });

    // 断开连接
    socket.on('disconnect', () => {
      this.handleDisconnect(socket, userId);
    });
  }

  async handlePrivateMessage(socket, senderId, data) {
    try {
      const { receiverId, content, type = 'text', redPacketId = null } = data;

      // 验证接收者是否存在
      const receiver = await User.findById(receiverId);
      if (!receiver) {
        socket.emit('errorMessage', { msg: 'Receiver not found' });
        return;
      }

      // 验证是否是好友
      const friend = await Friend.findOne({
        $or: [
          { user1: senderId, user2: receiverId, status: 'accepted' },
          { user1: receiverId, user2: senderId, status: 'accepted' }
        ]
      });

      if (!friend) {
        socket.emit('errorMessage', { msg: 'Not friends with receiver' });
        return;
      }

      // 保存消息到缓存
      const messageData = {
        sender: senderId,
        receiver: receiverId,
        content,
        type,
        redPacket: redPacketId,
        createdAt: new Date()
      };

      await messageCache.addMessage(messageData);

      // 获取房间ID
      const roomId = this.getPrivateRoomId(senderId, receiverId);

      // 发送给双方
      const response = {
        ...messageData,
        _id: messageData._id || Date.now().toString(),
        sender: {
          _id: socket.user._id,
          userId: socket.user.userId,  // 🚀 添加业务 ID
          username: socket.user.username,
          avatar: socket.user.avatar
        },
        receiver: {
          _id: receiver._id,
          userId: receiver.userId,      // 🚀 添加业务 ID
          username: receiver.username,
          avatar: receiver.avatar
        }
      };

      // 🚀 发送给双方：房间 + 个人房间
      // 1. 发送到私聊房间（双方都在聊天页面时）
      this.io.to(roomId).emit('privateMessage', response);
      
      // 2. 发送到发送者的个人房间（确保发送者能收到）
      this.io.to(`user:${senderId}`).emit('privateMessage', response);
      
      // 3. 发送到接收者的个人房间（即使不在聊天页面也能收到）
      this.io.to(`user:${receiverId}`).emit('privateMessage', response);

      // 如果接收者不在线，可以发送推送通知
      if (!this.onlineUsers.has(receiverId)) {
        // TODO: 集成推送通知服务
        logger.info(`User ${receiverId} is offline, message will be delivered when they come online`);
      }

      logger.info(`Private message sent from ${senderId} to ${receiverId}`);
    } catch (err) {
      logger.error('Error handling private message:', err);
      socket.emit('errorMessage', { msg: 'Failed to send message' });
    }
  }

  async handleGroupMessage(socket, senderId, data) {
    try {
      const { groupId, content, type = 'text' } = data;

      // 验证群组是否存在
      const group = await Group.findById(groupId);
      if (!group) {
        socket.emit('errorMessage', { msg: 'Group not found' });
        return;
      }

      // 验证用户是否是群成员
      const isMember = group.members.some(m => m.userId.toString() === senderId);
      if (!isMember) {
        socket.emit('errorMessage', { msg: 'Not a member of this group' });
        return;
      }

      const messageData = {
        sender: senderId,
        groupId,
        content,
        type,
        createdAt: new Date()
      };

      // TODO: 保存群组消息到缓存/数据库
      // await groupMessageCache.addMessage(messageData);

      const response = {
        ...messageData,
        _id: messageData._id || Date.now().toString(),
        sender: {
          _id: socket.user._id,
          username: socket.user.username,
          avatar: socket.user.avatar
        }
      };

      // 发送给群组所有成员
      this.io.to(`group:${groupId}`).emit('groupMessage', response);

      logger.info(`Group message sent to ${groupId} by ${senderId}`);
    } catch (err) {
      logger.error('Error handling group message:', err);
      socket.emit('errorMessage', { msg: 'Failed to send group message' });
    }
  }

  async handleSendRedPacket(socket, senderId, data) {
    try {
      const { receiverId, groupId, amount, type = 'lucky', message = '恭喜发财，大吉大利' } = data;

      // 验证发送者
      const sender = await User.findById(senderId);
      if (!sender) {
        socket.emit('errorMessage', { msg: 'Sender not found' });
        return;
      }
      
      if (sender.balance < amount) {
        socket.emit('errorMessage', { msg: 'Insufficient balance' });
        return;
      }

      // 查询接收者信息（如果是私聊红包）
      let receiver = null;
      if (receiverId) {
        receiver = await User.findById(receiverId);
        if (!receiver) {
          socket.emit('errorMessage', { msg: 'Receiver not found' });
          return;
        }
      }

      // 💰 扣减发送者余额
      sender.balance -= amount;
      await sender.save();
      
      // 💰 增加接收者余额（如果是私聊红包）
      if (receiver) {
        receiver.balance += amount;
        await receiver.save();
      }

      // 生成红包数据（统一使用业务 ID）
      const redPacketData = {
        sender: {
          _id: sender._id,
          userId: sender.userId,
          username: sender.username,
          avatar: sender.avatar
        },
        receiver: receiver ? {
          _id: receiver._id,
          userId: receiver.userId  // 使用业务 ID
        } : null,
        groupId,
        amount,
        type,
        message,
        createdAt: new Date()
      };

      // 发送给接收者（使用 ObjectId 加入房间）
      if (receiverId) {
        this.io.to(`user:${receiverId}`).emit('receiveRedPacket', redPacketData);
      }

      // 如果是群组红包
      if (groupId) {
        this.io.to(`group:${groupId}`).emit('groupRedPacket', redPacketData);
      }

      logger.info(`Red packet sent by ${sender.userId} to ${receiver ? receiver.userId : 'group'}, amount: ${amount}`);
    } catch (err) {
      logger.error('Error handling red packet:', err);
      socket.emit('errorMessage', { msg: 'Failed to send red packet' });
    }
  }

  async handleOpenRedPacket(socket, userId, data) {
    try {
      const { redPacketId } = data;

      // TODO: 处理红包领取逻辑
      // 这里应该调用 redPackets 路由中的逻辑

      socket.emit('redPacketOpened', {
        redPacketId,
        amount: Math.random() * 10, // 示例金额
        userId
      });

      logger.info(`Red packet ${redPacketId} opened by ${userId}`);
    } catch (err) {
      logger.error('Error opening red packet:', err);
      socket.emit('errorMessage', { msg: 'Failed to open red packet' });
    }
  }

  handleDisconnect(socket, userId) {
    // 从映射中移除
    this.onlineUsers.delete(userId);
    this.socketToUser.delete(socket.id);

    if (this.userSockets.has(userId)) {
      this.userSockets.get(userId).delete(socket.id);
      if (this.userSockets.get(userId).size === 0) {
        this.userSockets.delete(userId);
        // 广播用户下线状态
        this.broadcastUserStatus(userId, 'offline');
      }
    }

    logger.info(`User disconnected: ${userId}, socket: ${socket.id}`);
  }

  broadcastUserStatus(userId, status) {
    // 通知所有关注该用户状态的人
    // 可以通过好友关系查找需要通知的人
    this.io.emit('userStatusChanged', {
      userId,
      status
    });
  }

  getPrivateRoomId(userId1, userId2) {
    const sortedIds = [userId1, userId2].sort();
    return `private:${sortedIds[0]}:${sortedIds[1]}`;
  }

  // 获取在线用户数
  getOnlineCount() {
    return this.onlineUsers.size;
  }

  // 检查用户是否在线
  isUserOnline(userId) {
    return this.onlineUsers.has(userId);
  }

  // 获取用户socket
  getUserSocket(userId) {
    const socketId = this.onlineUsers.get(userId);
    if (socketId) {
      return this.io.sockets.sockets.get(socketId);
    }
    return null;
  }

  // 📡 获取 IO 实例（供外部使用）
  getIO() {
    return this.io;
  }
}

module.exports = SocketService;