const axios = require('axios');
const crypto = require('crypto');
const logger = require('../config/logger');

class AuditClient {
  constructor() {
    this.auditServerUrl = process.env.AUDIT_SERVER_URL || 'http://localhost:5001';
    this.secretKey = process.env.AUDIT_SECRET_KEY || 'your-secret-key-change-this';
  }

  // 生成数据签名
  signData(data) {
    const str = JSON.stringify(data) + this.secretKey;
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  // 异步发送审计日志（不阻塞主流程）
  async sendLog(logData) {
    try {
      const payload = {
        ...logData,
        signature: this.signData(logData),
        sentAt: new Date().toISOString()
      };

      // 使用 setTimeout 异步发送，不影响主业务响应速度
      setTimeout(async () => {
        try {
          const response = await axios.post(
            `${this.auditServerUrl}/api/audit/log`,
            payload,
            { timeout: 5000 }
          );
          
          if (response.data.success) {
            logger.info(`✅ Audit log sent: ${logData.type}`);
          } else {
            logger.error(`❌ Audit server rejected: ${response.data.msg}`);
          }
        } catch (err) {
          logger.error(`❌ Failed to send audit log: ${err.message}`);
          // 可选：失败时存入本地队列，稍后重试
        }
      }, 0);

    } catch (err) {
      logger.error(`Audit client error: ${err.message}`);
    }
  }

  // 记录红包领取
  logRedPacketGrab(userId, redPacketId, amount, balanceBefore, balanceAfter) {
    this.sendLog({
      type: 'RED_PACKET_GRAB',
      userId,
      redPacketId,
      amount,
      balanceBefore,
      balanceAfter,
      timestamp: Date.now()
    });
  }

  // 记录进群缴费
  logChainGroupJoin(userId, groupId, amount, balanceBefore, balanceAfter) {
    this.sendLog({
      type: 'CHAIN_GROUP_JOIN',
      userId,
      groupId,
      amount,
      balanceBefore,
      balanceAfter,
      timestamp: Date.now()
    });
  }

  // 记录充值
  logDeposit(userId, amount, txHash, balanceBefore, balanceAfter) {
    this.sendLog({
      type: 'DEPOSIT',
      userId,
      amount,
      txHash,
      balanceBefore,
      balanceAfter,
      timestamp: Date.now()
    });
  }

  // 记录提现
  logWithdraw(userId, amount, address, balanceBefore, balanceAfter) {
    this.sendLog({
      type: 'WITHDRAW',
      userId,
      amount,
      address,
      balanceBefore,
      balanceAfter,
      timestamp: Date.now()
    });
  }
}

module.exports = new AuditClient();
