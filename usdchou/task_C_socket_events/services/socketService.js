const logger = require('../config/logger');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map();
  }

  initialize(io) {
    this.io = io;
    this.setupEventListeners();
    logger.info('✅ SocketService initialized');
  }

  setupEventListeners() {
    this.io.on('connection', (socket) => {
      logger.info(`Socket connected: ${socket.id}`);

      socket.on('joinGroup', (data) => {
        const { userId, groupId } = data;
        socket.join(`group:${groupId}`);
        socket.join(`user:${userId}`);
        this.connectedUsers.set(userId, socket.id);
        logger.info(`User ${userId} joined group:${groupId}`);
      });

      socket.on('leaveGroup', (data) => {
        const { userId, groupId } = data;
        socket.leave(`group:${groupId}`);
        logger.info(`User ${userId} left group:${groupId}`);
      });

      socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.id}`);
        for (const [userId, socketId] of this.connectedUsers.entries()) {
          if (socketId === socket.id) {
            this.connectedUsers.delete(userId);
            break;
          }
        }
      });
    });
  }

  getIO() {
    return this.io;
  }

  emitToGroup(groupId, event, data) {
    if (!this.io) {
      logger.warn('Socket.IO not initialized');
      return;
    }
    try {
      this.io.to(`group:${groupId}`).emit(event, data);
    } catch (error) {
      logger.error(`Failed to emit to group:${groupId}`, error);
    }
  }

  emitToUser(userId, event, data) {
    if (!this.io) {
      logger.warn('Socket.IO not initialized');
      return;
    }
    try {
      this.io.to(`user:${userId}`).emit(event, data);
    } catch (error) {
      logger.error(`Failed to emit to user:${userId}`, error);
    }
  }

  getUserSocket(userId) {
    return this.connectedUsers.get(userId);
  }

  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }
}

const socketService = new SocketService();
global.socketService = socketService;

module.exports = socketService;