const redis = require('redis');
const logger = require('./logger');

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 5000)
  }
});

redisClient.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

redisClient.on('connect', () => {
  logger.info('Connected to Redis');
});

redisClient.connect().catch((err) => {
  logger.error('Failed to connect to Redis:', err);
});

module.exports = redisClient;