/**
 * TRON 钱包服务
 * 负责平台主钱包管理和自动化充值/提现
 */

const TronWeb = require('tronweb');
const logger = require('../config/logger');

class TronWalletService {
  constructor() {
    // 初始化 TronWeb
    this.tronWeb = new TronWeb.TronWeb({
      fullHost: process.env.TRON_FULL_HOST || 'https://api.trongrid.io',
      solidityNode: process.env.TRON_SOLIDITY_HOST || 'https://api.trongrid.io',
      eventServer: process.env.TRON_EVENT_HOST || 'https://api.trongrid.io',
      privateKey: process.env.TRON_PLATFORM_PRIVATE_KEY || ''
    });

    // USDT-TRC20 合约地址（主网）
    this.USDT_CONTRACT_ADDRESS = process.env.USDT_CONTRACT_ADDRESS || 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
    
    // 平台主钱包地址
    this.platformAddress = process.env.TRON_PLATFORM_ADDRESS || '';
    
    // 监听状态
    this.isListening = false;
    this.lastProcessedBlock = 0;
  }

  /**
   * 为用户生成唯一的充值地址
   * @param {string} userId - 用户ID
   * @returns {Object} { address, privateKey }
   */
  async generateDepositAddress(userId) {
    try {
      // TronWeb v6 的 createAccount 是异步方法
      const account = await this.tronWeb.createAccount();
      
      const address = account.address?.base58;
      const privateKey = account.privateKey;
      
      if (!address || !privateKey) {
        throw new Error('生成账户失败：无法获取地址或私钥');
      }
      
      logger.info(`为用户 ${userId} 生成充值地址: ${address}`);
      
      return {
        address,
        privateKey  // 平台保管，需要加密存储
      };
    } catch (error) {
      logger.error(`为用户 ${userId} 生成充值地址失败:`, error);
      throw error;
    }
  }

  /**
   * 激活新创建的 TRON 地址（从平台主钱包转入少量 TRX）
   * @param {string} toAddress - 要激活的地址
   * @param {string} privateKey - 该地址的私钥（用于后续操作）
   * @param {number} amount - 转入的 TRX 数量（默认 0.1）
   */
  async activateAddress(toAddress, privateKey, amount = 0.1) {
    try {
      // 检查平台主钱包是否有足够的 TRX
      const platformBalance = await this.getTRXBalance(this.platformAddress);
      
      if (platformBalance < amount) {
        logger.warn(`平台主钱包 TRX 余额不足: ${platformBalance} TRX < ${amount} TRX`);
        return false;
      }
      
      // 从平台主钱包转入少量 TRX 激活地址
      const tx = await this.tronWeb.trx.sendTransaction(
        toAddress,
        this.tronWeb.toSun(amount)  // 转换为 Sun (1 TRX = 1,000,000 Sun)
      );
      
      logger.info(`已激活地址 ${toAddress}，转入 ${amount} TRX，交易ID: ${tx.txid}`);
      return true;
    } catch (error) {
      logger.error(`激活地址 ${toAddress} 失败:`, error);
      return false;
    }
  }

  /**
   * 获取 TRX 余额
   * @param {string} address - TRON 地址
   * @returns {number} TRX 余额
   */
  async getTRXBalance(address) {
    try {
      const balance = await this.tronWeb.trx.getBalance(address);
      return this.tronWeb.fromSun(balance);  // 从 Sun 转换为 TRX
    } catch (error) {
      logger.error(`获取 ${address} 的 TRX 余额失败:`, error);
      return 0;
    }
  }

  /**
   * 获取实时 TRX/USDT 价格
   * @returns {number} TRX 价格（USDT）
   */
  async getTRXPrice() {
    try {
      // 使用 Binance API 获取实时价格
      const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=TRXUSDT');
      const data = await response.json();
      return parseFloat(data.price);
    } catch (error) {
      logger.error('获取 TRX 价格失败，使用默认值:', error);
      return 0.12; // 默认价格
    }
  }

  /**
   * 获取平台账户资源详情
   * @param {string} address - TRON 地址
   * @returns {Object} 资源信息
   */
  async getAccountResources(address) {
    try {
      const accountResource = await this.tronWeb.trx.getAccountResource(address);
      
      // 获取账户带宽信息
      const accountNet = await this.tronWeb.trx.getAccountNet(address);
      
      return {
        energy: accountResource.energy || 0,
        energyLimit: accountResource.energy_limit || 0,
        bandwidth: accountNet.freeNetLimit - accountNet.freeNetUsed || 0,
        totalBandwidth: accountNet.netLimit || 0,
        usedBandwidth: accountNet.netUsed || 0
      };
    } catch (error) {
      logger.error(`获取账户 ${address} 资源失败:`, error);
      throw error;
    }
  }

  /**
   * 动态估算 USDT 提现 Gas 手续费（精确版）
   * @param {number} withdrawAmount - 提现金额（USDT）
   * @returns {Object} 详细费用信息
   */
  async estimateWithdrawalFee(withdrawAmount = 0) {
    try {
      const platformAddress = this.platformAddress;
      
      if (!platformAddress) {
        throw new Error('平台地址未配置');
      }

      // 1. 获取平台账户资源
      const resources = await this.getAccountResources(platformAddress);
      
      // 2. USDT-TRC20 转账所需资源
      const REQUIRED_ENERGY = 15000;  // USDT 转账约需 15k Energy
      const REQUIRED_BANDWIDTH = 500; // 约 500 Bandwidth
      
      let estimatedFeeInTRX = 0;
      let feeBreakdown = {
        energyFee: 0,
        bandwidthFee: 0,
        hasEnoughEnergy: true,
        hasEnoughBandwidth: true
      };
      
      // 3. 计算 Energy 费用
      if (resources.energy < REQUIRED_ENERGY) {
        feeBreakdown.hasEnoughEnergy = false;
        const energyDeficit = REQUIRED_ENERGY - resources.energy;
        // TRON 网络：1 TRX = 420 Energy（燃烧机制）
        feeBreakdown.energyFee = energyDeficit / 420;
        estimatedFeeInTRX += feeBreakdown.energyFee;
      }
      
      // 4. 计算 Bandwidth 费用
      if (resources.bandwidth < REQUIRED_BANDWIDTH) {
        feeBreakdown.hasEnoughBandwidth = false;
        // 不足部分需要燃烧 TRX，约 1 TRX
        feeBreakdown.bandwidthFee = 1;
        estimatedFeeInTRX += feeBreakdown.bandwidthFee;
      }
      
      // 5. 获取实时 TRX/USDT 价格
      const trxPrice = await this.getTRXPrice();
      const feeInUSDT = estimatedFeeInTRX * trxPrice;
      
      // 6. 计算总扣除金额
      const totalDeduction = withdrawAmount + feeInUSDT;
      
      // 7. 生成详细说明
      let note = '';
      if (feeBreakdown.hasEnoughEnergy && feeBreakdown.hasEnoughBandwidth) {
        note = '✅ 平台资源充足，本次提现免手续费';
      } else {
        const reasons = [];
        if (!feeBreakdown.hasEnoughEnergy) {
          reasons.push(`Energy 不足（缺 ${REQUIRED_ENERGY - resources.energy}）`);
        }
        if (!feeBreakdown.hasEnoughBandwidth) {
          reasons.push('Bandwidth 不足');
        }
        note = `⚠️ ${reasons.join(', ')}，预计手续费: ${feeInUSDT.toFixed(4)} USDT`;
      }
      
      return {
        success: true,
        fee: {
          inTRX: parseFloat(estimatedFeeInTRX.toFixed(4)),
          inUSDT: parseFloat(feeInUSDT.toFixed(4)),
          breakdown: feeBreakdown
        },
        price: {
          trxToUSDT: trxPrice,
          timestamp: new Date().toISOString()
        },
        resources: {
          current: resources,
          required: {
            energy: REQUIRED_ENERGY,
            bandwidth: REQUIRED_BANDWIDTH
          }
        },
        withdrawal: {
          amount: withdrawAmount,
          fee: parseFloat(feeInUSDT.toFixed(4)),
          totalDeduction: parseFloat(totalDeduction.toFixed(4)),
          actualReceived: withdrawAmount
        },
        note
      };
    } catch (error) {
      logger.error('估算提现手续费失败:', error);
      
      // 返回保守估算（避免用户余额不足）
      return {
        success: false,
        fee: {
          inTRX: 15,
          inUSDT: 2.0,
          breakdown: {
            energyFee: 14,
            bandwidthFee: 1,
            hasEnoughEnergy: false,
            hasEnoughBandwidth: false
          }
        },
        price: {
          trxToUSDT: 0.12,
          timestamp: new Date().toISOString()
        },
        note: '⚠️ 无法获取实时数据，使用保守估算 2.0 USDT',
        error: error.message
      };
    }
  }

  /**
   * 验证 TRON 地址格式
   * @param {string} address - TRON 地址
   * @returns {boolean}
   */
  isValidAddress(address) {
    return this.tronWeb.isAddress(address);
  }

  /**
   * 查询 TRX 余额
   * @param {string} address - TRON 地址
   * @returns {number} 余额（TRX）
   */
  async getTRXBalance(address) {
    try {
      const balance = await this.tronWeb.trx.getBalance(address);
      return this.tronWeb.fromSun(balance); // 转换为 TRX
    } catch (error) {
      logger.error(`查询 ${address} TRX 余额失败:`, error);
      throw error;
    }
  }

  /**
   * 查询 USDT-TRC20 余额
   * @param {string} address - TRON 地址
   * @returns {number} 余额（USDT）
   */
  async getUSDTBalance(address) {
    try {
      const contract = await this.tronWeb.contract().at(this.USDT_CONTRACT_ADDRESS);
      const balance = await contract.balanceOf(address).call();
      return this.tronWeb.fromSun(balance, 6); // USDT 是 6 位小数
    } catch (error) {
      logger.error(`查询 ${address} USDT 余额失败:`, error);
      throw error;
    }
  }

  /**
   * 发送 TRX
   * @param {string} toAddress - 接收地址
   * @param {number} amount - 金额（TRX）
   * @returns {string} 交易哈希
   */
  async sendTRX(toAddress, amount) {
    try {
      if (!this.tronWeb.defaultPrivateKey) {
        throw new Error('平台私钥未配置');
      }

      const amountInSun = this.tronWeb.toSun(amount);
      const transaction = await this.tronWeb.trx.sendTransaction(
        toAddress,
        amountInSun
      );

      logger.info(`TRX 转账成功: ${amount} TRX -> ${toAddress}, TXID: ${transaction.transaction.txID}`);
      return transaction.transaction.txID;
    } catch (error) {
      logger.error('TRX 转账失败:', error);
      throw error;
    }
  }

  /**
   * 发送 USDT-TRC20
   * @param {string} toAddress - 接收地址
   * @param {number} amount - 金额（USDT）
   * @returns {string} 交易哈希
   */
  async sendUSDT(toAddress, amount) {
    try {
      if (!this.tronWeb.defaultPrivateKey) {
        throw new Error('平台私钥未配置');
      }

      // 验证地址
      if (!this.isValidAddress(toAddress)) {
        throw new Error('无效的 TRON 地址');
      }

      // 获取合约实例
      const contract = await this.tronWeb.contract().at(this.USDT_CONTRACT_ADDRESS);
      
      // USDT 精度为 6 位小数
      const amountInBaseUnit = Math.floor(amount * 1000000);

      // 调用 transfer 方法
      const result = await contract.transfer(toAddress, amountInBaseUnit).send({
        feeLimit: 100000000, // 手续费限制（100 TRX）
        callValue: 0,
        shouldPollResponse: true // 等待交易确认
      });

      logger.info(`USDT 转账成功: ${amount} USDT -> ${toAddress}, TXID: ${result}`);
      return result;
    } catch (error) {
      logger.error('USDT 转账失败:', error);
      throw error;
    }
  }

  /**
   * 监听充值交易（简化版：轮询检查）
   * @param {Function} onDeposit - 充值回调函数
   */
  startDepositListener(onDeposit) {
    if (this.isListening) {
      logger.warn('充值监听已在运行');
      return;
    }

    this.isListening = true;
    logger.info(`开始监听平台地址充值: ${this.platformAddress}`);

    // 每 10 秒检查一次新交易
    setInterval(async () => {
      try {
        await this.checkNewDeposits(onDeposit);
      } catch (error) {
        logger.error('检查充值失败:', error);
      }
    }, 10000);
  }

  /**
   * 检查新的充值交易
   * @param {Function} onDeposit - 充值回调
   */
  async checkNewDeposits(onDeposit) {
    try {
      // 获取最新的交易列表
      const transactions = await this.tronWeb.trx.getTransactionInfoFromBlock(
        'latest'
      );

      if (!transactions || !transactions.length) {
        return;
      }

      // 过滤出与平台地址相关的交易
      for (const tx of transactions) {
        // 检查是否是 USDT 转账到平台地址
        // 这里需要解析交易日志，简化处理
        
        // 实际生产中应该使用 TronGrid API 或事件监听
        // 这里仅作示例
      }
    } catch (error) {
      logger.error('检查新充值失败:', error);
    }
  }

  /**
   * 通过 TronGrid API 查询地址的交易历史
   * @param {string} address - TRON 地址
   * @param {number} limit - 限制数量
   * @returns {Array} 交易列表
   */
  async getAddressTransactions(address, limit = 20) {
    try {
      const url = `https://apilist.tronscan.org/api/transaction?sort=-timestamp&count=true&limit=${limit}&start=0&address=${address}`;
      const response = await fetch(url);
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      logger.error(`查询地址 ${address} 交易历史失败:`, error);
      return [];
    }
  }

  /**
   * 获取平台钱包信息
   * @returns {Object}
   */
  async getPlatformWalletInfo() {
    try {
      const trxBalance = await this.getTRXBalance(this.platformAddress);
      const usdtBalance = await this.getUSDTBalance(this.platformAddress);

      return {
        address: this.platformAddress,
        trxBalance,
        usdtBalance,
        network: process.env.TRON_NETWORK || 'mainnet'
      };
    } catch (error) {
      logger.error('获取平台钱包信息失败:', error);
      throw error;
    }
  }
}

// 导出单例
module.exports = new TronWalletService();
