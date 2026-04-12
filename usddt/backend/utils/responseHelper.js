/**
 * 统一的错误响应工具
 */

const { ERROR_CODES, ERROR_MESSAGES, ERROR_HTTP_STATUS } = require('./errorCodes');
const logger = require('../config/logger');

/**
 * 创建标准化错误响应
 * @param {string} errorCode - 错误码（来自 ERROR_CODES）
 * @param {object} res - Express response 对象
 * @param {object} options - 可选配置
 * @param {string} options.message - 自定义错误消息（覆盖默认消息）
 * @param {number} options.status - 自定义 HTTP 状态码（覆盖默认状态码）
 * @param {any} options.data - 附加数据
 */
function sendError(errorCode, res, options = {}) {
  const {
    message = ERROR_MESSAGES[errorCode] || '未知错误',
    status = ERROR_HTTP_STATUS[errorCode] || 500,
    data = null
  } = options;

  // 记录错误日志
  if (status >= 500) {
    logger.error(`[${errorCode}] ${message}`, { errorCode, status, data });
  } else {
    logger.warn(`[${errorCode}] ${message}`);
  }

  const response = {
    success: false,
    error: {
      code: errorCode,
      message,
      timestamp: new Date().toISOString()
    }
  };

  // 如果有附加数据，添加到响应中
  if (data !== null) {
    response.data = data;
  }

  return res.status(status).json(response);
}

/**
 * 创建成功响应
 * @param {object} res - Express response 对象
 * @param {any} data - 响应数据
 * @param {string} message - 成功消息
 */
function sendSuccess(res, data = null, message = '操作成功') {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null) {
    response.data = data;
  }

  return res.json(response);
}

/**
 * 验证手机号格式
 * @param {string} phone - 手机号
 * @returns {boolean}
 */
function isValidPhone(phone) {
  // 中国大陆手机号正则
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * 验证密码强度
 * @param {string} password - 密码
 * @returns {object} { valid: boolean, reason: string }
 */
function validatePassword(password) {
  if (!password || password.length < 6) {
    return { valid: false, reason: 'PASSWORD_TOO_SHORT' };
  }
  
  // 可以添加更多密码强度规则
  // if (!/[A-Z]/.test(password)) {
  //   return { valid: false, reason: 'PASSWORD_NO_UPPERCASE' };
  // }
  
  return { valid: true, reason: null };
}

module.exports = {
  sendError,
  sendSuccess,
  isValidPhone,
  validatePassword,
  ERROR_CODES,
  ERROR_MESSAGES,
  ERROR_HTTP_STATUS
};
