/**
 * 标准化错误码定义
 * 格式: [模块]_[具体错误]
 */

const ERROR_CODES = {
  // ==================== 认证相关 ====================
  
  // 注册错误
  USERNAME_EXISTS: 'USERNAME_EXISTS',           // 用户名已存在
  PHONE_EXISTS: 'PHONE_EXISTS',                 // 手机号已注册
  INVALID_PHONE_FORMAT: 'INVALID_PHONE_FORMAT', // 手机号格式不正确
  PASSWORD_TOO_SHORT: 'PASSWORD_TOO_SHORT',     // 密码长度不足
  
  // 登录错误
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',   // 用户名或密码错误
  ACCOUNT_BANNED: 'ACCOUNT_BANNED',             // 账号被封禁
  ACCOUNT_NOT_VERIFIED: 'ACCOUNT_NOT_VERIFIED', // 账号未验证
  
  // Token 错误
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',               // Token 已过期
  TOKEN_INVALID: 'TOKEN_INVALID',               // Token 无效
  TOKEN_MISSING: 'TOKEN_MISSING',               // 缺少 Token
  
  // ==================== 用户相关 ====================
  
  USER_NOT_FOUND: 'USER_NOT_FOUND',             // 用户不存在
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',   // 用户已存在
  
  // ==================== 好友相关 ====================
  
  ALREADY_FRIENDS: 'ALREADY_FRIENDS',           // 已经是好友关系
  FRIEND_REQUEST_SENT: 'FRIEND_REQUEST_SENT',   // 好友请求已发送
  FRIEND_REQUEST_NOT_FOUND: 'FRIEND_REQUEST_NOT_FOUND', // 好友请求不存在
  CANNOT_ADD_SELF: 'CANNOT_ADD_SELF',           // 不能添加自己为好友
  USER_BLOCKED: 'USER_BLOCKED',                 // 用户已被屏蔽
  REQUEST_ALREADY_PROCESSED: 'REQUEST_ALREADY_PROCESSED', // 请求已处理
  NOT_AUTHORIZED: 'NOT_AUTHORIZED',             // 无权限操作
  
  // ==================== 红包相关 ====================
  
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE', // 余额不足
  RED_PACKET_EXHAUSTED: 'RED_PACKET_EXHAUSTED', // 红包已抢完
  ALREADY_OPENED: 'ALREADY_OPENED',             // 您已抢过该红包
  RED_PACKET_NOT_FOUND: 'RED_PACKET_NOT_FOUND', // 红包不存在
  CANNOT_OPEN_OWN: 'CANNOT_OPEN_OWN',           // 不能打开自己的红包
  INVALID_RED_PACKET_TYPE: 'INVALID_RED_PACKET_TYPE', // 无效的红包类型
  
  // ==================== 钱包相关 ====================
  
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',     // 余额不足（通用）
  BALANCE_INSUFFICIENT: 'BALANCE_INSUFFICIENT',     // 余额不足（充值/提现）
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',         // 交易失败
  WITHDRAWAL_LIMIT: 'WITHDRAWAL_LIMIT',             // 超出提现限额
  INVALID_WALLET_ADDRESS: 'INVALID_WALLET_ADDRESS', // 无效的钱包地址
  MINIMUM_WITHDRAWAL: 'MINIMUM_WITHDRAWAL',         // 低于最低提现金额
  MAXIMUM_WITHDRAWAL: 'MAXIMUM_WITHDRAWAL',         // 超过最大提现金额
  MINIMUM_RECHARGE: 'MINIMUM_RECHARGE',             // 低于最低充值金额
  MAXIMUM_RECHARGE: 'MAXIMUM_RECHARGE',             // 超过最大充值金额
  DUPLICATE_TX_ID: 'DUPLICATE_TX_ID',               // 重复的交易ID
  WITHDRAWAL_FEE_CALCULATION: 'WITHDRAWAL_FEE_CALCULATION', // 提现手续费计算错误
  PENDING_WITHDRAWAL: 'PENDING_WITHDRAWAL',         // 有待处理的提现申请
  
  // ==================== 消息相关 ====================
  
  MESSAGE_NOT_FOUND: 'MESSAGE_NOT_FOUND',       // 消息不存在
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',             // 房间不存在
  
  // ==================== 群组相关 ====================
  
  GROUP_NOT_FOUND: 'GROUP_NOT_FOUND',           // 群组不存在
  NOT_GROUP_MEMBER: 'NOT_GROUP_MEMBER',         // 不是群组成员
  GROUP_FULL: 'GROUP_FULL',                     // 群组已满
  
  // ==================== 系统错误 ====================
  
  INTERNAL_ERROR: 'INTERNAL_ERROR',             // 服务器内部错误
  VALIDATION_ERROR: 'VALIDATION_ERROR',         // 参数验证失败
  RATE_LIMIT: 'RATE_LIMIT',                     // 请求过于频繁
};

// 错误码对应的中文描述
const ERROR_MESSAGES = {
  // 认证相关
  USERNAME_EXISTS: '用户名已存在',
  PHONE_EXISTS: '手机号已注册',
  INVALID_PHONE_FORMAT: '手机号格式不正确',
  PASSWORD_TOO_SHORT: '密码长度不足，至少6位',
  INVALID_CREDENTIALS: '用户名或密码错误',
  ACCOUNT_BANNED: '账号已被封禁',
  ACCOUNT_NOT_VERIFIED: '账号未验证',
  TOKEN_EXPIRED: 'Token 已过期，请重新登录',
  TOKEN_INVALID: 'Token 无效',
  TOKEN_MISSING: '缺少认证 Token',
  
  // 用户相关
  USER_NOT_FOUND: '用户不存在',
  USER_ALREADY_EXISTS: '用户已存在',
  
  // 好友相关
  ALREADY_FRIENDS: '已经是好友关系',
  FRIEND_REQUEST_SENT: '好友请求已发送',
  FRIEND_REQUEST_NOT_FOUND: '好友请求不存在',
  CANNOT_ADD_SELF: '不能添加自己为好友',
  USER_BLOCKED: '无法添加该用户',
  REQUEST_ALREADY_PROCESSED: '请求已处理',
  NOT_AUTHORIZED: '无权限操作',
  
  // 红包相关
  INSUFFICIENT_BALANCE: '余额不足',
  RED_PACKET_EXHAUSTED: '红包已抢完',
  ALREADY_OPENED: '您已抢过该红包',
  RED_PACKET_NOT_FOUND: '红包不存在',
  CANNOT_OPEN_OWN: '不能打开自己的红包',
  INVALID_RED_PACKET_TYPE: '无效的红包类型',
  
  // 钱包相关
  INSUFFICIENT_BALANCE: '余额不足',
  BALANCE_INSUFFICIENT: '余额不足，无法完成操作',
  TRANSACTION_FAILED: '交易失败，请稍后重试',
  WITHDRAWAL_LIMIT: '超出提现限额',
  INVALID_WALLET_ADDRESS: '无效的钱包地址',
  MINIMUM_WITHDRAWAL: '低于最低提现金额',
  MAXIMUM_WITHDRAWAL: '超过最大提现金额',
  MINIMUM_RECHARGE: '低于最低充值金额',
  MAXIMUM_RECHARGE: '超过最大充值金额',
  DUPLICATE_TX_ID: '该交易ID已使用，请勿重复提交',
  WITHDRAWAL_FEE_CALCULATION: '提现手续费计算错误',
  PENDING_WITHDRAWAL: '您有待处理的提现申请，请等待处理完成',
  
  // 消息相关
  MESSAGE_NOT_FOUND: '消息不存在',
  ROOM_NOT_FOUND: '房间不存在',
  
  // 群组相关
  GROUP_NOT_FOUND: '群组不存在',
  NOT_GROUP_MEMBER: '不是群组成员',
  GROUP_FULL: '群组已满',
  
  // 系统错误
  INTERNAL_ERROR: '服务器内部错误',
  VALIDATION_ERROR: '参数验证失败',
  RATE_LIMIT: '请求过于频繁，请稍后再试',
};

// HTTP 状态码映射
const ERROR_HTTP_STATUS = {
  // 400 - 客户端错误
  USERNAME_EXISTS: 400,
  PHONE_EXISTS: 400,
  INVALID_PHONE_FORMAT: 400,
  PASSWORD_TOO_SHORT: 400,
  INVALID_CREDENTIALS: 400,
  ALREADY_FRIENDS: 400,
  FRIEND_REQUEST_SENT: 400,
  CANNOT_ADD_SELF: 400,
  USER_BLOCKED: 400,
  REQUEST_ALREADY_PROCESSED: 400,
  INSUFFICIENT_BALANCE: 400,
  RED_PACKET_EXHAUSTED: 400,
  ALREADY_OPENED: 400,
  CANNOT_OPEN_OWN: 400,
  INVALID_RED_PACKET_TYPE: 400,
  INSUFFICIENT_BALANCE: 400,
  BALANCE_INSUFFICIENT: 400,
  INVALID_WALLET_ADDRESS: 400,
  MINIMUM_WITHDRAWAL: 400,
  MAXIMUM_WITHDRAWAL: 400,
  MINIMUM_RECHARGE: 400,
  MAXIMUM_RECHARGE: 400,
  DUPLICATE_TX_ID: 400,
  WITHDRAWAL_FEE_CALCULATION: 400,
  PENDING_WITHDRAWAL: 400,
  WITHDRAWAL_LIMIT: 400,
  VALIDATION_ERROR: 400,
  RATE_LIMIT: 429,
  
  // 401 - 未授权
  TOKEN_EXPIRED: 401,
  TOKEN_INVALID: 401,
  TOKEN_MISSING: 401,
  NOT_AUTHORIZED: 401,
  
  // 403 - 禁止访问
  ACCOUNT_BANNED: 403,
  ACCOUNT_NOT_VERIFIED: 403,
  
  // 404 - 未找到
  USER_NOT_FOUND: 404,
  FRIEND_REQUEST_NOT_FOUND: 404,
  RED_PACKET_NOT_FOUND: 404,
  MESSAGE_NOT_FOUND: 404,
  ROOM_NOT_FOUND: 404,
  GROUP_NOT_FOUND: 404,
  NOT_GROUP_MEMBER: 404,
  
  // 500 - 服务器错误
  INTERNAL_ERROR: 500,
  TRANSACTION_FAILED: 500,
  GROUP_FULL: 500,
};

module.exports = {
  ERROR_CODES,
  ERROR_MESSAGES,
  ERROR_HTTP_STATUS,
};
