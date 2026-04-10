const axios = require('axios');
const crypto = require('crypto');
const logger = require('../config/logger');

const AUDIT_SERVER_URL = process.env.AUDIT_SERVER_URL || 'http://192.168.1.100:5001';

let previousHash = '';

async function log(logData) {
  try {
    const currentHash = calculateHash(logData, previousHash);
    
    const auditLog = {
      ...logData,
      hash: currentHash,
      previousHash: previousHash,
      serverId: 'main-server-01',
      sentAt: new Date().toISOString()
    };
    
    axios.post(`${AUDIT_SERVER_URL}/api/audit/log`, auditLog, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.AUDIT_API_KEY
      }
    }).then(response => {
      if (response.data.success) {
        previousHash = currentHash;
        logger.debug('审计日志发送成功:', logData.type);
      } else {
        logger.error('审计服务器返回错误:', response.data);
      }
    }).catch(err => {
      logger.error('审计日志发送失败:', {
        error: err.message,
        logData
      });
    });
    
  } catch (err) {
    logger.error('审计日志构建失败:', err);
  }
}

function calculateHash(data, prevHash) {
  const content = JSON.stringify(data) + prevHash;
  return crypto.createHash('sha256').update(content).digest('hex');
}

function verifyHashChain(logs) {
  let prevHash = '';
  
  for (const log of logs) {
    const expectedHash = calculateHash(log, prevHash);
    
    if (log.hash !== expectedHash) {
      logger.error('哈希链验证失败:', {
        logId: log._id,
        expected: expectedHash,
        actual: log.hash
      });
      return false;
    }
    
    prevHash = log.hash;
  }
  
  return true;
}

module.exports = {
  log,
  verifyHashChain
};