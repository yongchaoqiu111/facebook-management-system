const axios = require('axios');
const logger = require('../config/logger');

const auditClient = {
  async log(data) {
    try {
      await axios.post(process.env.AUDIT_SERVICE_URL || 'http://localhost:3001/audit/log', data);
    } catch (err) {
      logger.error('审计日志发送失败:', err);
    }
  }
};

module.exports = auditClient;