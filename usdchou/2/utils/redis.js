const redis = require('redis');
require('dotenv').config();

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  console.error('Redis客户端错误:', err);
});

redisClient.on('connect', () => {
  console.log('Redis连接成功');
});

async function connectRedis() {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('Redis连接失败:', error);
    process.exit(1);
  }
}

module.exports = {
  redisClient,
  connectRedis
};