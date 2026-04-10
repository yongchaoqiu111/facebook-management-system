const redis = require('../config/redis');

function rateLimit(keyPrefix, maxRequests = 5, windowSeconds = 1) {
  return async (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: '未授权' });
    }
    
    const key = `${keyPrefix}:${userId}`;
    const count = await redis.incr(key);
    
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }
    
    if (count > maxRequests) {
      return res.status(429).json({
        success: false,
        message: '请求过于频繁，请稍后再试',
        retryAfter: windowSeconds
      });
    }
    
    next();
  };
}

module.exports = rateLimit;
