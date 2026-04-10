/**
 * TRON 充值监听服务
 * 自动检测所有用户充值地址的 USDT-TRC20 入账并更新用户余额
 */

const Transaction = require('../models/Transaction');
const User = require('../models/User');
const tronWalletService = require('./tronWalletService');
const logger = require('../config/logger');

class DepositListener {
  constructor() {
    this.isRunning = false;
    this.lastCheckTime = Date.now();
    this.processedTxIds = new Set(); // 已处理的交易ID（防止重复处理）
    
    // 从 Redis 或文件加载已处理的交易ID（生产环境应该持久化）
    this.loadProcessedTxIds();
  }

  /**
   * 启动充值监听
   */
  start() {
    if (this.isRunning) {
      logger.warn('充值监听已在运行');
      return;
    }

    this.isRunning = true;
    logger.info('🚀 启动 TRON 充值监听服务...');
    logger.info('📍 监听模式: 所有用户专属充值地址');

    // 每 20 秒检查一次所有用户的充值地址
    this.checkInterval = setInterval(async () => {
      try {
        await this.checkAllUserDeposits();
      } catch (error) {
        logger.error('❌ 检查充值失败:', error);
      }
    }, 20000);

    logger.info('✅ 充值监听服务已启动');
  }

  /**
   * 停止充值监听
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    logger.info('⏹️  充值监听服务已停止');
  }

  /**
   * 检查所有用户的充值地址
   */
  async checkAllUserDeposits() {
    try {
      // 获取所有有充值地址的用户
      const users = await User.find({ 
        depositAddress: { $ne: '', $exists: true } 
      }).select('_id depositAddress balance');

      if (!users || users.length === 0) {
        return;
      }

      logger.debug(`📊 开始检查 ${users.length} 个用户的充值地址...`);

      for (const user of users) {
        try {
          await this.checkUserDeposit(user);
        } catch (error) {
          logger.error(`检查用户 ${user._id} 充值失败:`, error);
        }
      }

      this.lastCheckTime = Date.now();
    } catch (error) {
      logger.error('检查所有用户充值时出错:', error);
    }
  }

  /**
   * 检查单个用户的充值
   * @param {Object} user - 用户对象
   */
  async checkUserDeposit(user) {
    try {
      const depositAddress = user.depositAddress;
      
      if (!depositAddress) {
        return;
      }

      // 获取该地址的最新交易
      const transactions = await tronWalletService.getAddressTransactions(depositAddress, 5);

      if (!transactions || transactions.length === 0) {
        return;
      }

      for (const tx of transactions) {
        // 跳过已处理的交易
        if (this.processedTxIds.has(tx.hash)) {
          continue;
        }

        // 只处理成功的交易
        if (tx.contractRet !== 'SUCCESS') {
          continue;
        }

        // 检查是否是 USDT-TRC20 转账到该地址
        const isDeposit = await this.isUSDTDeposit(tx, depositAddress);
        
        if (isDeposit) {
          await this.processDeposit(tx, user._id);
        }
      }
    } catch (error) {
      logger.error(`检查用户 ${user._id} 充值失败:`, error);
    }
  }

  /**
   * 判断是否是 USDT 充值到指定地址
   * @param {Object} tx - 交易对象
   * @param {string} targetAddress - 目标地址
   * @returns {boolean}
   */
  async isUSDTDeposit(tx, targetAddress) {
    try {
      // 检查交易是否包含合约调用
      if (!tx.raw_data || !tx.raw_data.contract) {
        return false;
      }

      const contract = tx.raw_data.contract[0];
      
      // 检查是否是 TriggerSmartContract（智能合约调用）
      if (contract.type !== 'TriggerSmartContract') {
        return false;
      }

      const parameter = contract.parameter.value;
      
      // 检查是否是 USDT 合约
      const contractAddress = tronWalletService.tronWeb.address.fromHex(parameter.contract_address);
      const usdtContractAddress = tronWalletService.USDT_CONTRACT_ADDRESS;
      
      if (contractAddress !== usdtContractAddress) {
        return false;
      }

      // 解析转账数据
      const data = parameter.data;
      if (!data || data.length < 138) {
        return false;
      }

      // 提取接收地址（从 data 中解析）
      const toAddressHex = '0x' + data.substring(34, 74);
      const toAddress = tronWalletService.tronWeb.address.fromHex(toAddressHex);

      // 确认是转入目标地址
      return toAddress === targetAddress;
    } catch (error) {
      logger.error('判断充值类型失败:', error);
      return false;
    }
  }

  /**
   * 处理充值交易
   * @param {Object} tx - 交易对象
   * @param {string} userId - 用户ID
   */
  async processDeposit(tx, userId) {
    try {
      const txId = tx.hash;
      
      // 标记为已处理
      this.processedTxIds.add(txId);
      this.saveProcessedTxIds();

      // 解析转账金额
      const amount = this.parseUSDTAmount(tx);
      
      if (!amount || amount <= 0) {
        logger.warn(`⚠️  交易 ${txId} 金额无效，跳过`);
        return;
      }

      // 查找用户
      const user = await User.findById(userId);
      if (!user) {
        logger.error(`❌ 用户不存在: ${userId}`);
        return;
      }

      // 更新用户余额
      user.balance += amount;
      await user.save();

      // 创建交易记录
      const transaction = new Transaction({
        userId: userId,
        type: 'recharge',
        amount: amount,
        status: 'completed',
        txId: txId,
        blockchainNetwork: 'TRON',
        confirmations: 1,
        depositAddress: user.depositAddress
      });

      await transaction.save();

      logger.info(`✅ 充值处理成功: 用户 ${userId}, 金额 ${amount} USDT, TXID: ${txId}`);

      // 可以通过 WebSocket 通知前端
      // io.to(userId).emit('depositReceived', { amount, txId });
    } catch (error) {
      logger.error('处理充值失败:', error);
    }
  }

  /**
   * 解析 USDT 转账金额
   * @param {Object} tx - 交易对象
   * @returns {number} 金额（USDT）
   */
  parseUSDTAmount(tx) {
    try {
      const contract = tx.raw_data.contract[0];
      const data = contract.parameter.value.data;
      
      if (!data || data.length < 138) {
        return 0;
      }

      // USDT 转账金额在 data 的第 74-138 位（64个字符）
      const amountHex = data.substring(74, 138);
      const amountInBaseUnit = parseInt(amountHex, 16);
      
      // USDT 精度为 6 位小数
      return amountInBaseUnit / 1000000;
    } catch (error) {
      logger.error('解析金额失败:', error);
      return 0;
    }
  }

  /**
   * 根据交易查找用户
   * @param {Object} tx - 交易对象
   * @returns {string|null} 用户ID
   */
  async findUserByTransaction(tx) {
    // TODO: 实现用户识别逻辑
    
    // 方案1: 查询最近的待确认充值记录
    // 方案2: 解析备注信息
    // 方案3: 使用唯一的充值地址（为每个用户生成独立地址）
    
    // 简化版：暂时返回 null，需要进一步完善
    return null;
  }

  /**
   * 保存已处理的交易ID（持久化）
   */
  saveProcessedTxIds() {
    // TODO: 保存到 Redis 或文件
    // 生产环境必须实现，防止重启后重复处理
  }

  /**
   * 加载已处理的交易ID
   */
  loadProcessedTxIds() {
    // TODO: 从 Redis 或文件加载
  }
}

// 导出单例
module.exports = new DepositListener();
