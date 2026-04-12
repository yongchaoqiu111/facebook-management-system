const express = require('express');
const { check, validationResult } = require('express-validator');
const auth = require('../middlewares/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const tronWalletService = require('../services/tronWalletService');
const { sendError, sendSuccess, ERROR_CODES } = require('../utils/responseHelper');
const logger = require('../config/logger');

const router = express.Router();

// 获取提现手续费估算
router.get('/withdraw-fee', auth, async (req, res) => {
  try {
    const { amount } = req.query;
    const withdrawAmount = amount ? parseFloat(amount) : 0;
    
    const feeEstimate = await tronWalletService.estimateWithdrawalFee(withdrawAmount);
    sendSuccess(res, feeEstimate);
  } catch (err) {
    console.error(err.message);
    sendError(ERROR_CODES.INTERNAL_ERROR, res);
  }
});

// 获取钱包信息（余额+充值地址）
router.get('/info', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // 如果用户还没有充值地址，生成一个
    if (!user.depositAddress) {
      const wallet = await tronWalletService.generateDepositAddress(user._id.toString());
      
      user.depositAddress = wallet.address;
      user.depositPrivateKey = wallet.privateKey;  // 平台保管私钥
      await user.save();
      
      logger.info(`为用户 ${user._id} 生成充值地址: ${wallet.address}`);
      
      // 🚀 自动激活新地址（从平台主钱包转入 0.1 TRX）
      const activated = await tronWalletService.activateAddress(
        wallet.address,
        wallet.privateKey,
        0.1  // 转入 0.1 TRX 激活地址
      );
      
      if (activated) {
        logger.info(`✅ 地址 ${wallet.address} 已激活`);
      } else {
        logger.warn(`⚠️ 地址 ${wallet.address} 激活失败，用户首次充值时将自动激活`);
      }
    }
    
    sendSuccess(res, { 
      balance: user.balance,
      depositAddress: user.depositAddress,  // 用户的专属充值地址
      platformName: 'USDCHOU Platform',
      note: '请只向此地址充值 USDT-TRC20，充值将自动到账'
    });
  } catch (err) {
    console.error(err.message);
    sendError(ERROR_CODES.INTERNAL_ERROR, res);
  }
});

router.get('/balance', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    sendSuccess(res, { balance: user.balance });
  } catch (err) {
    console.error(err.message);
    sendError(ERROR_CODES.INTERNAL_ERROR, res);
  }
});

router.post('/recharge', auth, [
  check('amount', 'Amount is required').isNumeric(),
  check('txId', 'Transaction ID is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(ERROR_CODES.VALIDATION_ERROR, res, { data: errors.array() });
  }

  const { amount, txId } = req.body;

  try {
    // 验证金额
    if (parseFloat(amount) <= 0) {
      return sendError(ERROR_CODES.MINIMUM_RECHARGE, res);
    }

    // 检查是否重复充值
    const existingTx = await Transaction.findOne({ txId });
    if (existingTx) {
      return sendError(ERROR_CODES.DUPLICATE_TX_ID, res);
    }

    const user = await User.findById(req.user.id);
    user.balance += parseFloat(amount);
    await user.save();

    const transaction = new Transaction({
      userId: req.user.id,
      type: 'recharge',
      amount: parseFloat(amount),
      status: 'completed',
      txId,
      blockchainNetwork: 'TRON'
    });

    await transaction.save();

    sendSuccess(res, { 
      balance: user.balance, 
      transaction 
    }, '充值成功');
  } catch (err) {
    console.error(err.message);
    sendError(ERROR_CODES.INTERNAL_ERROR, res);
  }
});

router.post('/withdraw', auth, [
  check('amount', 'Amount is required').isNumeric(),
  check('walletAddress', 'Wallet address is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(ERROR_CODES.VALIDATION_ERROR, res, { data: errors.array() });
  }

  const { amount, walletAddress } = req.body;

  try {
    // 验证 TRON 地址格式
    if (!tronWalletService.isValidAddress(walletAddress)) {
      return sendError(ERROR_CODES.INVALID_WALLET_ADDRESS, res);
    }

    // 验证提现金额
    const withdrawAmount = parseFloat(amount);
    if (withdrawAmount < 10) {
      return sendError(ERROR_CODES.MINIMUM_WITHDRAWAL, res, { message: '最低提现金额为 10 USDT' });
    }

    if (withdrawAmount > 10000) {
      return sendError(ERROR_CODES.MAXIMUM_WITHDRAWAL, res, { message: '单笔最大提现金额为 10000 USDT' });
    }

    // 估算手续费
    const feeEstimate = await tronWalletService.estimateWithdrawalFee();
    const fee = feeEstimate.feeInUSDT; // 动态手续费

    const user = await User.findById(req.user.id);
    
    // 检查余额（包含动态手续费）
    if (user.balance < withdrawAmount + fee) {
      return sendError(ERROR_CODES.BALANCE_INSUFFICIENT, res, { 
        message: `余额不足，需要 ${withdrawAmount + fee} USDT（含手续费 ${fee} USDT）` 
      });
    }

    // 扣除余额（用户承担手续费）
    user.balance -= (withdrawAmount + fee);
    await user.save();

    // 创建待处理交易记录
    const transaction = new Transaction({
      userId: req.user.id,
      type: 'withdraw',
      amount: withdrawAmount,
      status: 'pending',
      walletAddress,
      fee,
      blockchainNetwork: 'TRON'
    });

    await transaction.save();

    // 执行区块链转账（自动化）
    try {
      const txId = await tronWalletService.sendUSDT(walletAddress, withdrawAmount);
      
      // 更新交易状态为成功
      transaction.status = 'completed';
      transaction.txId = txId;
      await transaction.save();

      logger.info(`✅ 提现成功: 用户 ${user._id}, 金额 ${withdrawAmount} USDT, 手续费 ${fee} USDT, TXID: ${txId}`);
    } catch (blockchainError) {
      // 区块链转账失败，回滚余额
      logger.error('区块链转账失败，回滚余额:', blockchainError);
      
      user.balance += (withdrawAmount + fee);
      await user.save();
      
      transaction.status = 'failed';
      transaction.failReason = blockchainError.message;
      await transaction.save();
      
      return sendError(ERROR_CODES.TRANSACTION_FAILED, res, { 
        message: '区块链转账失败，已回滚余额' 
      });
    }

    sendSuccess(res, { 
      balance: user.balance, 
      transaction,
      fee,
      actualReceived: withdrawAmount,
      note: `手续费 ${fee} USDT 已从您的余额中扣除`
    }, '提现申请已提交');
  } catch (err) {
    console.error(err.message);
    sendError(ERROR_CODES.INTERNAL_ERROR, res);
  }
});

router.get('/transactions', auth, async (req, res) =>{
  try {
    const transactions = await Transaction.find({ userId: req.user.id }).sort({ createdAt: 'desc' });
    sendSuccess(res, transactions);
  } catch (err) {
    console.error(err.message);
    sendError(ERROR_CODES.INTERNAL_ERROR, res);
  }
});

router.get('/transactions/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return sendError(ERROR_CODES.MESSAGE_NOT_FOUND, res, { message: '交易记录不存在' });
    }

    if (transaction.userId.toString() !== req.user.id) {
      return sendError(ERROR_CODES.NOT_AUTHORIZED, res);
    }

    sendSuccess(res, transaction);
  } catch (err) {
    console.error(err.message);
    sendError(ERROR_CODES.INTERNAL_ERROR, res);
  }
});

// 🔥 检查充值状态（前端打开充值页时调用）
const redisClient = require('../config/redis');

router.post('/check-deposit', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.body;
    
    if (!requestId) {
      return sendError(ERROR_CODES.BAD_REQUEST, res, '缺少 requestId');
    }
    
    // 🔥 1. 防重提交：requestId 3秒内有效
    const requestKey = `scan:request:${requestId}`;
    const isDuplicate = await redisClient.set(requestKey, '1', { NX: true, EX: 3 });
    if (!isDuplicate) {
      return sendError(ERROR_CODES.RATE_LIMIT, res, '请勿重复提交');
    }
    
    // 🔥 2. 限流：同一用户5秒内只能请求1次
    const limitKey = `scan:limit:${userId}`;
    const exists = await redisClient.exists(limitKey);
    if (exists) {
      return sendError(ERROR_CODES.RATE_LIMIT, res, '操作频繁，请稍后再试');
    }
    await redisClient.set(limitKey, '1', { EX: 5 });
    
    const user = await User.findById(userId);
    if (!user || !user.depositAddress) {
      return sendError(ERROR_CODES.NOT_FOUND, res, '未找到充值地址');
    }
    
    // 🔥 3. 查询区块链
    const transactions = await tronWalletService.getAddressTransactions(user.depositAddress, 5);
    
    if (!transactions || transactions.length === 0) {
      return sendSuccess(res, { hasPending: false, transactions: [] });
    }
    
    // 过滤出未处理的 USDT 充值
    const pendingDeposits = [];
    for (const tx of transactions) {
      if (tx.contractRet !== 'SUCCESS') continue;
      
      const isDeposit = await require('../services/depositListener').prototype.isUSDTDepositToPlatform(
        tx, 
        process.env.PLATFORM_DEPOSIT_ADDRESS || user.depositAddress
      );
      
      if (isDeposit) {
        const amount = require('../services/depositListener').prototype.parseUSDTAmount(tx);
        pendingDeposits.push({
          txId: tx.txID,
          amount: amount,
          fromAddress: tronWalletService.tronWeb.address.fromHex(tx.raw_data.contract[0].parameter.value.owner_address),
          timestamp: tx.block_timestamp
        });
      }
    }
    
    sendSuccess(res, {
      hasPending: pendingDeposits.length > 0,
      transactions: pendingDeposits
    });
    
  } catch (err) {
    logger.error('Check deposit error:', err);
    sendError(ERROR_CODES.INTERNAL_ERROR, res);
  }
});

// 🔥 管理员调整用户余额（充值/扣款）- 无需登录
router.post('/admin/adjust-balance', [
  check('userId', '用户ID是必需的').not().isEmpty(),
  check('amount', '金额是必需的').isNumeric(),
  check('type', '类型必须是recharge或deduct').isIn(['recharge', 'deduct']),
  check('reason', '原因不能为空').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(ERROR_CODES.VALIDATION_ERROR, res, { data: errors.array() });
  }

  const { userId, amount, type, reason } = req.body;

  try {
    // TODO: 添加管理员权限验证
    // if (!req.user.isAdmin) {
    //   return sendError(ERROR_CODES.NOT_AUTHORIZED, res);
    // }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return sendError(ERROR_CODES.USER_NOT_FOUND, res, { message: '用户不存在' });
    }

    const adjustAmount = parseFloat(amount);
    if (adjustAmount <= 0) {
      return sendError(ERROR_CODES.BAD_REQUEST, res, { message: '金额必须大于0' });
    }

    // 调整余额
    if (type === 'recharge') {
      targetUser.balance += adjustAmount;
    } else if (type === 'deduct') {
      if (targetUser.balance < adjustAmount) {
        return sendError(ERROR_CODES.BALANCE_INSUFFICIENT, res, { 
          message: `用户余额不足，当前余额: ${targetUser.balance} USDT` 
        });
      }
      targetUser.balance -= adjustAmount;
    }

    await targetUser.save();

    // 记录交易
    const transaction = new Transaction({
      userId: userId,
      type: type === 'recharge' ? 'admin_recharge' : 'admin_deduct',
      amount: adjustAmount,
      status: 'completed',
      note: reason
    });

    await transaction.save();

    logger.info(`管理员调整余额: 用户 ${userId}, 类型: ${type}, 金额: ${adjustAmount}, 原因: ${reason}`);

    sendSuccess(res, { 
      userId: targetUser._id,
      balance: targetUser.balance,
      transaction 
    }, type === 'recharge' ? '充值成功' : '扣款成功');
  } catch (err) {
    logger.error('Admin adjust balance error:', err);
    sendError(ERROR_CODES.INTERNAL_ERROR, res);
  }
});

module.exports = router;