const rateLimitMap = new Map();

function rateLimiter(options = {}) {
  const {
    windowMs = 60 * 1000,  // 1分钟
    maxRequests = 100       // 最多100次请求
  } = options;
  
  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress;
    const now = Date.now();
    
    if (!rateLimitMap.has(ip)) {
      rateLimitMap.set(ip, { count: 1, startTime: now });
      return next();
    }
    
    const record = rateLimitMap.get(ip);
    
    // 重置窗口
    if (now - record.startTime > windowMs) {
      rateLimitMap.set(ip, { count: 1, startTime: now });
      return next();
    }
    
    // 检查是否超限
    if (record.count >= maxRequests) {
      return res.status(429).json({
        error: '请求过于频繁，请稍后再试',
        retryAfter: Math.ceil((windowMs - (now - record.startTime)) / 1000)
      });
    }
    
    record.count++;
    next();
  };
}

// 定期清理过期记录
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((record, ip) => {
    if (now - record.startTime > 60 * 1000) {
      rateLimitMap.delete(ip);
    }
  });
}, 60 * 1000);

module.exports = rateLimiter;