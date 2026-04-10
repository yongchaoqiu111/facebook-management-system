const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('服务器错误:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  // 开发环境返回详细错误
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.status || 500).json({
      error: err.message,
      stack: err.stack
    });
  }
  
  // 生产环境返回通用错误
  res.status(err.status || 500).json({
    error: '服务器内部错误'
  });
}

// 404 处理
function notFoundHandler(req, res) {
  res.status(404).json({
    error: '接口不存在'
  });
}

module.exports = { errorHandler, notFoundHandler };