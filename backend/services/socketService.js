const { Server } = require('socket.io');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const UserFriends = require('../models/UserFriends');
const Group = require('../models/Group');
const messageCache = require('./messageCache');
const redisClient = require('../config/redis');
const logger = require('../config/logger');
const { PrivateMessageHandler, GroupMessageHandler, CallHandler } = require('./socketHandlers');
const UnifiedMessageHandler = require('./unifiedMessageHandler');

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
    this.unifiedMessageHandler = new UnifiedMessageHandler(this);
    this.callHandler = new CallHandler(this);

    this.initialize();
  }

  initialize() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        console.log('🔑 [Socket Auth] Token:', token ? token.substring(0, 20) + '...' : '无');
        
        if (!token) {
          console.error('❌ [Socket Auth] Token 不存在');
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('✅ [Socket Auth] Token 解码成功, userId:', decoded.user.id);
        socket.userId = decoded.user.id;

        const user = await User.findById(socket.userId).select('-password');
        if (!user) {
          console.error('❌ [Socket Auth] 用户不存在:', socket.userId);
          return next(new Error('User not found'));
        }

        socket.user = user;
        console.log('✅ [Socket Auth] 认证成功:', user.username);
        next();
      } catch (err) {
        console.error('❌ [Socket Auth] 认证错误:', err.message);
        logger.error('Socket authentication error:', err);
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log('🔌 [Socket] connection 事件触发, socketId:', socket.id);
      this.handleConnection(socket);
    });

    logger.info('Socket service initialized');
  }

  handleConnection(socket) {
    const userId = socket.userId;

    console.log('\n========== [Socket 连接] ==========');
    console.log('Socket ID:', socket.id);
    console.log('User ID:', userId);
    console.log('Username:', socket.user?.username);
    console.log('================================\n');

    // 存储用户连接信息
    this.onlineUsers.set(userId, socket.id);
    this.socketToUser.set(socket.id, userId);

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socket.id);

    console.log('✅ 用户已连接:', userId);

    // 广播用户上线状态
    this.broadcastUserStatus(userId, 'online');

    // 加入用户专属房间
    const userRoom = `user:${userId}`;
    socket.join(userRoom);
    console.log('✅ 用户已加入房间:', userRoom);

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
      // 获取用户的好友ID数组
      const userFriends = await UserFriends.findOne({ userId });
      const friendIds = userFriends ? userFriends.friendIds : [];

      // 加入每个好友的私聊房间
      friendIds.forEach(friendId => {
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

      // 🔥 前端已写死公开群，不再广播群组列表
      // 只广播好友列表（动态数据）
      this.broadcastFriendListUpdate(userId, friends);
      
      // 🔥 广播用户完整持仓数据（登录时一次性返回）
      this.broadcastUserHoldings(socket, userId);
    } catch (err) {
      logger.error('Error joining user rooms:', err);
    }
  }

  setupEventListeners(socket, userId) {
    // 🔥 统一消息协议
    socket.on('chat:message', async (data) => {
      await this.unifiedMessageHandler.handleUnifiedMessage(socket, userId, data);
    });

    // 🔥 加好友请求
    socket.on('chat:addFriend', async (data) => {
      await this.handleAddFriend(socket, userId, data);
    });

    // 🔥 接受好友请求
    socket.on('chat:acceptFriend', async (data) => {
      await this.handleAcceptFriend(socket, userId, data);
    });

    // 🔥 拒绝好友请求
    socket.on('chat:rejectFriend', async (data) => {
      await this.handleRejectFriend(socket, userId, data);
    });

    // 🔥 删除好友
    socket.on('chat:deleteFriend', async (data) => {
      await this.handleDeleteFriend(socket, userId, data);
    });

    // 🔥 加入接龙群
    socket.on('chat:joinChainGroup', async (data) => {
      await this.handleJoinChainGroup(socket, userId, data);
    });

    // 🔥 领取红包
    socket.on('chat:redPacketOpen', async (data) => {
      await this.handleRedPacketOpen(socket, userId, data);
    });

    // 🔥 检查接龙群状态
    socket.on('chat:checkChainStatus', async (data) => {
      await this.handleCheckChainStatus(socket, userId, data);
    });

    // 🔥 获取好友列表
    socket.on('getFriendList', async () => {
      try {
        const friends = await this.getUserFriends(userId);
        this.broadcastFriendListUpdate(userId, friends);
        logger.info(`📤 已推送好友列表给用户 ${userId}: ${friends.length} 个`);
      } catch (err) {
        logger.error('❌ 获取好友列表失败:', err);
        socket.emit('errorMessage', { msg: '获取好友列表失败' });
      }
    });

    // 📞 WebRTC 通话信令
    socket.on('call:start', async (data) => {
      await this.callHandler.handleCallStart(socket, userId, data);
    });

    socket.on('call:accept', async (data) => {
      await this.callHandler.handleCallAccept(socket, userId, data);
    });

    socket.on('call:reject', async (data) => {
      await this.callHandler.handleCallReject(socket, userId, data);
    });

    socket.on('call:hangup', async (data) => {
      await this.callHandler.handleCallHangup(socket, userId, data);
    });

    socket.on('call:ice-candidate', async (data) => {
      await this.callHandler.handleIceCandidate(socket, userId, data);
    });

    // 🔥 创建六合红包
    socket.on('chat:createLiuheRedPacket', async (data) => {
      await this.handleCreateLiuheRedPacket(socket, userId, data);
    });

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

    // 领取私聊红包
    socket.on('chat:openPrivateRedPacket', async (data) => {
      await this.handleOpenPrivateRedPacket(socket, userId, data);
    });

    // 🔥 检查充值状态
    socket.on('wallet:checkDeposit', async (data) => {
      await this.handleCheckDeposit(socket, userId, data);
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

    // 🔥 发送接龙红包（自动读取群组配置）
    socket.on('sendChainRedPacket', async (data) => {
      await this.handleSendChainRedPacket(socket, userId, data);
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

      // 🆕 验证是否是好友
      const senderFriends = await UserFriends.findOne({ userId: senderId });
      const isFriend = senderFriends && senderFriends.friendIds.includes(receiverId);
      
      if (!isFriend) {
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

      // 如果是群组红包，统一使用 receiveMessage 事件
      if (groupId) {
        this.io.to(`group:${groupId}`).emit('receiveMessage', {
          _id: redPacketId || `rp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'redpacket',
          sender: redPacketData.sender,
          data: {
            redPacketId: redPacketId || `rp_${Date.now()}`,
            amount: redPacketData.amount,
            type: redPacketData.type,
            message: redPacketData.message,
            createdAt: redPacketData.createdAt
          },
          groupId,
          timestamp: Date.now()
        });
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

  // 🔥 发送接龙红包（自动读取群组配置）
  async handleSendChainRedPacket(socket, senderId, data) {
    try {
      const { groupId, message } = data;
      const Group = require('../models/Group');
      const RedPacket = require('../models/RedPacket');
      const User = require('../models/User');
      const Transaction = require('../models/Transaction');
      const GroupMessage = require('../models/GroupMessage');

      // 验证群组
      const group = await Group.findById(groupId);
      if (!group) {
        socket.emit('errorMessage', { msg: 'Group not found' });
        return;
      }

      if (!group.settings.isChainRedPacket) {
        socket.emit('errorMessage', { msg: 'This is not a chain red packet group' });
        return;
      }

      // 检查是否是群成员
      const isMember = group.members.some(m => m.userId.toString() === senderId && !m.kickedOut);
      if (!isMember) {
        socket.emit('errorMessage', { msg: 'Not a member of this group' });
        return;
      }

      // 从群组配置读取固定参数
      const perAmount = group.settings.redPacketPerAmount || 10;
      const count = group.settings.redPacketCount || 30;
      const totalAmount = perAmount * count;

      // 验证余额
      const sender = await User.findById(senderId);
      if (sender.balance < totalAmount) {
        socket.emit('errorMessage', { msg: 'Insufficient balance' });
        return;
      }

      // 扣款
      sender.balance -= totalAmount;
      await sender.save();

      // 生成固定金额数组
      const amounts = Array(count).fill(perAmount);

      // 创建红包
      const redPacket = new RedPacket({
        sender: senderId,
        type: 'normal',
        totalAmount,
        count,
        message: message || '接龙红包',
        roomId: groupId,
        amounts,
        isChainRedPacket: true,
        chainGroupId: groupId,
        remainAmount: totalAmount,
        remainCount: count
      });

      await redPacket.save();

      // 记录交易
      const transaction = new Transaction({
        userId: senderId,
        type: 'redPacketSend',
        amount: totalAmount,
        status: 'completed',
        description: '接龙红包'
      });
      await transaction.save();

      // 保存为群组消息
      const groupMessage = new GroupMessage({
        groupId: groupId,
        sender: senderId,
        type: 'redpacket',
        content: message || '接龙红包',
        redPacketId: redPacket._id,
        clientMsgId: `rp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        metadata: {
          totalAmount,
          count,
          perAmount,
          isChainRedPacket: true
        }
      });
      await groupMessage.save();

      await redPacket.populate('sender', 'username avatar');

      // 广播到群组
      this.io.to(`group:${groupId}`).emit('receiveMessage', {
        id: redPacket._id,
        type: 'redpacket',
        sender: {
          _id: redPacket.sender._id,
          username: redPacket.sender.username,
          avatar: redPacket.sender.avatar
        },
        data: {
          redPacketId: redPacket._id,
          totalAmount: redPacket.totalAmount,
          count: redPacket.count,
          perAmount: perAmount,
          message: redPacket.message,
          createdAt: redPacket.createdAt
        },
        groupId: groupId,
        timestamp: Date.now()
      });

      // 通知发送者成功
      socket.emit('redPacketSent', {
        success: true,
        redPacketId: redPacket._id,
        totalAmount,
        config: { perAmount, count }
      });

    } catch (err) {
      console.error('Send chain red packet error:', err);
      socket.emit('errorMessage', { msg: err.message });
    }
  }

  /**
   * 🔥 广播群组列表更新（新增群、加入群等）
   */
  broadcastGroupListUpdate(userId, groups) {
    this.io.to(`user:${userId}`).emit('groupListUpdated', {
      groups: groups.map(g => ({
        _id: g._id.toString(),
        name: g.name,
        avatar: g.avatar || '',
        description: g.description || '',
        memberCount: g.memberCount,
        isPublic: g.isPublic,
        settings: g.settings
      })),
      timestamp: Date.now()
    });
  }

  /**
   * 🔥 广播好友列表更新（新增好友、删除好友等）
   */
  broadcastFriendListUpdate(userId, friends) {
    this.io.to(`user:${userId}`).emit('friendListUpdated', {
      friends: friends.map(f => ({
        userId: f.userId.toString(),
        username: f.username,
        avatar: f.avatar || '',
        online: this.onlineUsers.has(f.userId.toString())
      })),
      timestamp: Date.now()
    });
  }

  /**
   * 🔥 广播用户完整持仓数据（登录时调用）
   */
  async broadcastUserHoldings(socket, userId) {
    try {
      const User = require('../models/User');
      const TradeRecord = require('../models/TradeRecord');
      
      // 重新查询用户，确保获取最新持仓
      const user = await User.findById(userId);
      if (!user) {
        logger.error(`❌ 用户 ${userId} 不存在`);
        return;
      }
      
      // 将 Map 转换为普通对象
      const holdings = {};
      if (user.cryptoHoldings) {
        for (const [symbol, amount] of user.cryptoHoldings.entries()) {
          holdings[symbol] = parseFloat(amount.toFixed(8));
        }
      }
      
      // 获取交易记录（最多 100 条）
      const tradeRecords = await TradeRecord.find({ userId })
        .sort({ timestamp: -1 })
        .limit(100)
        .lean();
      
      logger.info(`📊 [持仓广播] 用户 ${userId} 持仓:`, holdings);
      
      // 广播给前端
      socket.emit('balanceUpdated', {
        balance: parseFloat(user.balance.toFixed(2)),
        holdings,  // 🔥 所有币种持仓
        tradeRecords  // 🔥 交易记录
      });
    } catch (error) {
      logger.error(`❌ [持仓广播失败] ${error.message}`);
    }
  }

  /**
   * 🔥 广播用户在线状态变化
   */
  broadcastUserStatus(userId, isOnline) {
    this.io.emit('userStatusChanged', {
      userId,
      online: isOnline,
      timestamp: Date.now()
    });
  }

  /**
   * 🔥 处理加好友请求
   */
  async handleAddFriend(socket, senderId, data) {
    try {
      const { userId } = data;
      
      console.log('\n========== [好友请求] ==========');
      console.log('发送方:', senderId);
      console.log('接收方:', userId);
      
      if (!userId || userId === senderId) {
        console.log('❌ 验证失败');
        return socket.emit('errorMessage', { code: 'SELF_ADD', msg: '不能添加自己为好友' });
      }
      
      const FriendRequest = require('../models/FriendRequest');
      const User = require('../models/User');
      const UserFriends = require('../models/UserFriends');
      
      // 1. 检查用户
      const targetUser = await User.findOne({ userId });
      if (!targetUser) {
        console.log('❌ 用户不存在');
        return socket.emit('errorMessage', { code: 'USER_NOT_FOUND', msg: '用户不存在' });
      }
      console.log('✅ 步骤1: 用户存在');
      
      // 2. 检查是否已是好友
      const senderFriends = await UserFriends.findOne({ userId: senderId });
      if (senderFriends && senderFriends.friendIds.includes(userId)) {
        console.log('❌ 已是好友');
        return socket.emit('errorMessage', { code: 'ALREADY_FRIENDS', msg: '你们已经是好友了' });
      }
      console.log('✅ 步骤2: 不是好友');
      
      // 3. 删除旧请求
      await FriendRequest.deleteMany({
        $or: [
          { sender: senderId, receiver: userId },
          { sender: userId, receiver: senderId }
        ]
      });
      console.log('✅ 步骤3: 已清理旧请求');
      
      // 4. 创建新请求
      const friendRequest = new FriendRequest({
        sender: senderId,
        receiver: userId,
        message: '你好，我想加你好友'
      });
      await friendRequest.save();
      console.log('✅ 步骤4: 请求已创建', friendRequest._id);
      
      // 5. 获取发送方信息
      const sender = await User.findOne({ userId: senderId }).select('userId username avatar');
      console.log('✅ 步骤5: 获取发送方信息', sender.username);
      
      // 6. 广播
      const requestData = {
        id: friendRequest._id.toString(),
        fromUser: {
          userId: sender.userId,
          username: sender.username,
          avatar: sender.avatar || '👤'
        },
        message: friendRequest.message,
        createdAt: friendRequest.createdAt
      };
      
      console.log('📢 步骤6: 广播到 user:' + userId);
      this.io.to(`user:${userId}`).emit('friendRequestReceived', requestData);
      console.log('✅ 步骤6: 广播完成');
      
      // 7. 通知发送方
      socket.emit('friendRequestSent', {
        success: true,
        requestId: friendRequest._id.toString()
      });
      console.log('✅ 步骤7: 通知发送方');
      console.log('========== [完成] ==========\n');
      
    } catch (err) {
      console.error('❌ 错误:', err.message);
      console.error(err.stack);
      socket.emit('errorMessage', { code: 'SERVER_ERROR', msg: err.message });
    }
  }

  /**
   * 🔥 处理接受好友请求
   */
  async handleAcceptFriend(socket, userId, data) {
    try {
      const { requestId } = data;
      const FriendRequest = require('../models/FriendRequest');
      
      // 查找请求
      const friendRequest = await FriendRequest.findById(requestId);
      if (!friendRequest) {
        return socket.emit('errorMessage', { msg: '好友请求不存在' });
      }
      
      // 验证是否是接收者
      if (friendRequest.receiver !== userId) {
        return socket.emit('errorMessage', { msg: '无权限操作' });
      }
      
      // 更新请求状态
      friendRequest.status = 'accepted';
      await friendRequest.save();
      
      const senderId = friendRequest.sender;
      
      // 🆕 双向添加好友
      let [userFriends, senderFriends] = await Promise.all([
        UserFriends.findOne({ userId }),
        UserFriends.findOne({ userId: senderId })
      ]);
      
      if (!userFriends) {
        userFriends = new UserFriends({ userId, friendIds: [] });
      }
      if (!senderFriends) {
        senderFriends = new UserFriends({ userId: senderId, friendIds: [] });
      }
      
      // 检查是否已经是好友
      if (userFriends.friendIds.includes(senderId)) {
        return socket.emit('errorMessage', { msg: '你们已经是好友了' });
      }
      
      // 双向添加
      userFriends.friendIds.push(senderId);
      senderFriends.friendIds.push(userId);
      
      await Promise.all([
        userFriends.save(),
        senderFriends.save()
      ]);
      
      logger.info(`✅ Friends added via accept: ${userId} <-> ${senderId}`);
      
      // 📢 通知双方更新好友列表
      this.io.to(`user:${userId}`).emit('friendListUpdated', {
        friendIds: userFriends.friendIds
      });
      this.io.to(`user:${senderId}`).emit('friendListUpdated', {
        friendIds: senderFriends.friendIds
      });
      
      // 通知发送者请求被接受
      this.io.to(`user:${senderId}`).emit('friendRequestAccepted', {
        friendId: userId,
        timestamp: Date.now()
      });
      
      socket.emit('friendRequestAccepted', {
        friendId: senderId,
        timestamp: Date.now()
      });

    } catch (err) {
      console.error('Accept friend error:', err);
      socket.emit('errorMessage', { msg: err.message });
    }
  }

  /**
   * 🔥 处理拒绝好友请求 - 已废弃
   */
  async handleRejectFriend(socket, userId, data) {
    try {
      // 🆕 直接返回成功（不需要拒绝逻辑）
      socket.emit('friendRequestRejected', {
        requestId: data.requestId || 'deprecated',
        timestamp: Date.now()
      });
    } catch (err) {
      console.error('Reject friend error:', err);
      socket.emit('errorMessage', { msg: err.message });
    }
  }

  /**
   * 🔥 处理删除好友
   */
  async handleDeleteFriend(socket, userId, data) {
    try {
      const { friendId } = data;
      
      // 🆕 获取双方的好友记录
      let [userFriends, friendFriends] = await Promise.all([
        UserFriends.findOne({ userId }),
        UserFriends.findOne({ userId: friendId })
      ]);
      
      if (!userFriends || !userFriends.friendIds.includes(friendId)) {
        return socket.emit('errorMessage', { msg: '好友关系不存在' });
      }
      
      // 🆕 双向删除
      userFriends.friendIds = userFriends.friendIds.filter(id => id !== friendId);
      if (friendFriends) {
        friendFriends.friendIds = friendFriends.friendIds.filter(id => id !== userId);
        await friendFriends.save();
      }
      await userFriends.save();
      
      logger.info(`User ${userId} deleted friend ${friendId}`);
      
      // 🆕 通知双方更新
      this.io.to(`user:${userId}`).emit('friendListUpdated', {
        friendIds: userFriends.friendIds
      });
      if (friendFriends) {
        this.io.to(`user:${friendId}`).emit('friendListUpdated', {
          friendIds: friendFriends.friendIds
        });
      }
      
      socket.emit('friendDeleted', {
        success: true,
        friendId,
        timestamp: Date.now()
      });
      
    } catch (err) {
      console.error('Delete friend error:', err);
      socket.emit('errorMessage', { msg: err.message });
    }
  }

  /**
   * 🔥 获取用户的好友列表 - 返回ID数组
   */
  async getUserFriends(userId) {
    const userFriends = await UserFriends.findOne({ userId });
    return userFriends ? userFriends.friendIds : [];
  }

  /**
   * 🔥 处理加入接龙群（WebSocket 方式）
   */
  async handleJoinChainGroup(socket, userId, data) {
    try {
      const { groupId, testMode } = data;
      const ChainRedPacketService = require('./chainRedPacketService');

      // 调用接龙群服务
      const options = {};
      if (testMode) {
        options.waitSeconds = 3; // 测试模式：3秒冷却
      }

      const result = await ChainRedPacketService.joinChainGroup(groupId, userId, options);

      // 返回成功结果给当前用户
      socket.emit('chainGroupJoined', {
        success: true,
        group: {
          _id: result.group._id.toString(),
          name: result.group.name,
          avatar: result.group.avatar || '',
          description: result.group.description || '',
          memberCount: result.group.memberCount,
          isPublic: result.group.isPublic,
          settings: result.group.settings
        },
        redPacket: {
          redPacketId: result.redPacket._id.toString(),
          totalAmount: result.redPacket.totalAmount,
          count: result.redPacket.count,
          message: result.redPacket.message,
          createdAt: result.redPacket.createdAt
        },
        canGrabAfter: result.canGrabAfter,
        remainingBalance: result.remainingBalance,
        message: testMode 
          ? '加入接龙群成功，3秒后可领取红包' 
          : '加入接龙群成功，3小时后可领取红包',
        timestamp: Date.now()
      });

      // 🔥 前端已写死公开群，不再广播群组列表
      // 只让当前用户加入群组房间

      // 让当前用户加入群组房间
      socket.join(`group:${groupId}`);

      logger.info(`User ${userId} joined chain group ${groupId} via WebSocket`);

    } catch (err) {
      logger.error('Join chain group error:', err);
      socket.emit('errorMessage', { msg: err.message });
    }
  }

  /**
   * 🔥 处理领取红包
   */
  async handleRedPacketOpen(socket, userId, data) {
    try {
      const { redPacketId } = data;
      const ChainRedPacketService = require('./chainRedPacketService');

      // 调用接龙红包服务
      const result = await ChainRedPacketService.openChainRedPacket(redPacketId, userId);

      // 返回结果给当前用户
      socket.emit('redPacketReceived', {
        redPacketId: result.redPacket._id,
        senderId: result.redPacket.sender,
        receiverId: userId,
        amount: result.amount,
        newBalance: result.newBalance,
        totalReceived: result.totalReceived,
        wasKicked: result.wasKicked || false,
        kickReason: result.kickReason || '',
        timestamp: Date.now()
      });
      
      // 🔥 广播余额更新（抢红包）
      socket.emit('balanceUpdated', {
        type: 3,  // 抢红包收入
        amount: result.amount,
        newBalance: result.newBalance,
        groupId: result.redPacket.chainGroupId,
        timestamp: Date.now()
      });
      
      // 🔥 如果红包已领完，广播给群组
      if (result.redPacket.remainCount === 0) {
        const io = this.io;
        if (io && result.redPacket.chainGroupId) {
          io.to(`group:${result.redPacket.chainGroupId}`).emit('redPacketExhausted', {
            redPacketId: result.redPacket._id,
            timestamp: Date.now()
          });
        }
      }

      // 🔥 广播累计领取金额给群组所有人
      const io = this.io;
      if (io && result.redPacket.chainGroupId) {
        io.to(`group:${result.redPacket.chainGroupId}`).emit('memberTotalReceivedUpdated', {
          userId: userId,
          groupId: result.redPacket.chainGroupId,  // 🔥 添加群组ID
          totalReceived: result.totalReceived,
          wasKicked: result.wasKicked || false,
          timestamp: Date.now()
        });
        
        // 🔥 广播有人领取红包
        io.to(`group:${result.redPacket.chainGroupId}`).emit('redPacketClaimed', {
          redPacketId: result.redPacket._id,
          userId: userId,
          amount: result.amount,
          timestamp: Date.now()
        });
        
        // 🔥 如果被踢出，广播 memberKicked 事件
        if (result.wasKicked) {
          io.to(`group:${result.redPacket.chainGroupId}`).emit('memberKicked', {
            userId: userId,
            reason: result.kickReason,
            timestamp: Date.now()
          });
          logger.info(`🚫 User ${userId} kicked from group ${result.redPacket.chainGroupId}: ${result.kickReason}`);
          
          // 🔥 重新查询用户所在的群组列表并广播更新
          const Group = require('../models/Group');
          const userGroups = await Group.find({
            'members.userId': userId
          });
          
          this.broadcastGroupListUpdate(userId, userGroups);
          logger.info(`📢 Broadcasted updated group list to user ${userId} after kick`);
        }
      }

      logger.info(`User ${userId} opened red packet ${redPacketId}, amount: ${result.amount}`);

    } catch (err) {
      logger.error('Open red packet error:', err);
      socket.emit('errorMessage', { msg: err.message });
    }
  }

  /**
   * 🔥 处理检查接龙群状态
   */
  async handleCheckChainStatus(socket, userId, data) {
    try {
      const { groupId } = data;
      
      console.log('🔍 WebSocket 检查用户状态:', { groupId, userId });
      
      const Group = require('../models/Group');
      const group = await Group.findById(groupId);
      
      if (!group) {
        socket.emit('chainStatusResponse', {
          success: false,
          message: '群组不存在'
        });
        return;
      }
      
      const member = group.members.find(m => m.userId.toString() === userId);
      
      if (!member) {
        // 用户不在群组中
        socket.emit('chainStatusResponse', {
          success: true,
          status: 'not_member'
        });
        return;
      }
      
      if (member.kickedOut) {
        // 用户已被踢出
        socket.emit('chainStatusResponse', {
          success: true,
          status: 'kicked',
          totalReceived: member.totalReceived || 0,
          kickThreshold: group.settings.kickThreshold || 380,
          kickReason: member.kickReason || ''
        });
        return;
      }
      
      // 正常状态
      socket.emit('chainStatusResponse', {
        success: true,
        status: 'normal',
        totalReceived: member.totalReceived || 0,
        kickThreshold: group.settings.kickThreshold || 380
      });
      
    } catch (err) {
      logger.error('Check chain status error:', err);
      socket.emit('chainStatusResponse', {
        success: false,
        message: err.message
      });
    }
  }

  /**
   * 🔥 处理创建六合红包
   */
  async handleCreateLiuheRedPacket(socket, userId, data) {
    try {
      const { prizePool, groupId, bettingDuration } = data;
      const LiuheRedPacket = require('../models/LiuheRedPacket');
      const Group = require('../models/Group');
      const User = require('../models/User');
      const { LIUHE_CONFIG, LIUHE_GROUP_NAME } = require('../utils/liuheConfig');

      // 1. 验证群组
      const group = await Group.findById(groupId);
      if (!group) {
        return socket.emit('errorMessage', { msg: '群组不存在' });
      }
      
      if (group.name !== LIUHE_GROUP_NAME) {
        return socket.emit('errorMessage', { 
          msg: `六合红包只能在「${LIUHE_GROUP_NAME}」群发送`,
          allowedGroup: {
            _id: group._id,
            name: LIUHE_GROUP_NAME
          }
        });
      }

      // 2. 检查用户余额
      const user = await User.findById(userId);
      if (user.balance < prizePool) {
        return socket.emit('errorMessage', { msg: '余额不足' });
      }

      // 3. 计算投注截止时间
      const bettingDeadline = new Date(Date.now() + bettingDuration * 60 * 1000);

      // 4. 扣款
      user.balance -= prizePool;
      await user.save();

      // 5. 创建红包
      const redPacket = new LiuheRedPacket({
        banker: userId,
        prizePool,
        groupId,
        bettingDeadline,
        status: 'open',
        betsByNumber: new Map()
      });

      await redPacket.save();

      logger.info(`User ${userId} created liuhe red packet ${redPacket._id}, pool: ${prizePool}`);

      // 6. 重新查询并填充 banker 信息
      const populatedRedPacket = await LiuheRedPacket.findById(redPacket._id)
        .populate('banker', 'userId username avatar');
      
      // 7. 推送到群组房间
      const io = this.io;
      if (io) {
        io.to(`group:${groupId}`).emit('newLiuheRedPacket', {
          success: true,
          data: populatedRedPacket,
          message: '六合红包创建成功'
        });
        
        logger.info(`Liuhe red packet ${redPacket._id} pushed to group ${groupId}`);
      }

      // 8. 返回给创建者
      socket.emit('liuheRedPacketCreated', {
        success: true,
        data: populatedRedPacket,
        message: '六合红包创建成功'
      });

    } catch (err) {
      logger.error('Create liuhe red packet error:', err);
      socket.emit('errorMessage', { msg: err.message || '创建失败' });
    }
  }

  /**
   * 🔥 处理领取私聊红包
   */
  async handleOpenPrivateRedPacket(socket, userId, data) {
    try {
      const { redPacketId } = data;
      logger.info(`🔍 尝试领取私聊红包: redPacketId=${redPacketId}, userId=${userId}`);
      
      const User = require('../models/User');
      const RedPacket = require('../models/RedPacket');
      
      // 查询红包记录
      const redPacket = await RedPacket.findById(redPacketId);
      logger.info(`🔍 查询结果: redPacket=${!!redPacket}, type=${redPacket?.type}, receiverId=${redPacket?.receiverId}`);
      
      if (!redPacket || !redPacket.receiverId) {
        logger.warn(`❌ 红包不存在或不是私聊红包: redPacketId=${redPacketId}`);
        return socket.emit('errorMessage', { msg: '红包不存在' });
      }
      
      // 验证接收者
      if (redPacket.receiverId !== userId) {
        return socket.emit('errorMessage', { msg: '不是接收者' });
      }
      
      // 检查是否已领取
      if (redPacket.remainCount === 0) {
        return socket.emit('errorMessage', { msg: '红包已领取' });
      }
      
      const amount = redPacket.amounts[0];
      
      // 给接收者加钱
      const receiver = await User.findById(userId);
      if (!receiver) {
        return socket.emit('errorMessage', { msg: '用户不存在' });
      }
      
      receiver.balance += amount;
      await receiver.save();
      
      // 更新红包状态
      redPacket.remainAmount = 0;
      redPacket.remainCount = 0;
      redPacket.openedBy = [{ userId, amount, openedAt: new Date() }];
      await redPacket.save();
      
      // 广播余额更新
      socket.emit('balanceUpdated', {
        type: 7,  // 私聊红包收入
        amount: amount,
        newBalance: receiver.balance,
        senderId: redPacket.sender,
        timestamp: Date.now()
      });
      
      // 🔥 广播红包已领完
      socket.emit('redPacketExhausted', {
        redPacketId: redPacketId,
        timestamp: Date.now()
      });
      
      // 🔥 广播给发送者
      this.io.to(`user:${redPacket.sender}`).emit('redPacketExhausted', {
        redPacketId: redPacketId,
        timestamp: Date.now()
      });
      
      logger.info(`User ${userId} received private red packet ${redPacketId}, amount: ${amount}`);
      
    } catch (err) {
      logger.error('Open private red packet error:', err);
      socket.emit('errorMessage', { msg: err.message });
    }
  }

  /**
   * 🔥 处理检查充值状态
   */
  async handleCheckDeposit(socket, userId, data) {
    try {
      const { requestId } = data;
      const redisClient = require('../config/redis');
      const User = require('../models/User');
      const tronWalletService = require('./tronWalletService');
      
      if (!requestId) {
        return socket.emit('errorMessage', { msg: '缺少 requestId' });
      }
      
      // 1. 防重提交：requestId 3秒内有效
      const requestKey = `scan:request:${requestId}`;
      const isDuplicate = await redisClient.set(requestKey, '1', { NX: true, EX: 3 });
      if (!isDuplicate) {
        return socket.emit('depositCheckResult', { success: false, msg: '请勿重复提交' });
      }
      
      // 2. 限流：同一用户5秒内只能请求1次
      const limitKey = `scan:limit:${userId}`;
      const exists = await redisClient.exists(limitKey);
      if (exists) {
        return socket.emit('depositCheckResult', { success: false, msg: '操作频繁，请稍后再试' });
      }
      await redisClient.set(limitKey, '1', { EX: 5 });
      
      const user = await User.findById(userId);
      if (!user || !user.depositAddress) {
        return socket.emit('depositCheckResult', { success: false, msg: '未找到充值地址' });
      }
      
      // 3. 查询区块链
      const transactions = await tronWalletService.getAddressTransactions(user.depositAddress, 5);
      
      if (!transactions || transactions.length === 0) {
        return socket.emit('depositCheckResult', {
          success: true,
          hasPending: false,
          transactions: []
        });
      }
      
      // 过滤出 USDT 充值
      const pendingDeposits = [];
      for (const tx of transactions) {
        if (tx.contractRet !== 'SUCCESS') continue;
        
        const DepositListener = require('./depositListener');
        const listener = new DepositListener();
        
        const isDeposit = await listener.isUSDTDepositToPlatform(
          tx, 
          process.env.PLATFORM_DEPOSIT_ADDRESS || user.depositAddress
        );
        
        if (isDeposit) {
          const amount = listener.parseUSDTAmount(tx);
          pendingDeposits.push({
            txId: tx.txID,
            amount: amount,
            fromAddress: tronWalletService.tronWeb.address.fromHex(tx.raw_data.contract[0].parameter.value.owner_address),
            timestamp: tx.block_timestamp
          });
        }
      }
      
      socket.emit('depositCheckResult', {
        success: true,
        hasPending: pendingDeposits.length > 0,
        transactions: pendingDeposits
      });
      
    } catch (err) {
      logger.error('Check deposit error:', err);
      socket.emit('errorMessage', { msg: err.message });
    }
  }
}

module.exports = SocketService;