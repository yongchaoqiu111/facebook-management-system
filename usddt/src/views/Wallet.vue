<template>
  <div class="wallet-container">
    <!-- 头部导航 -->
    <header class="header">
      <h1>钱包</h1>
      <div class="header-actions">
        <button class="action-btn" @click="showTransactions">📋</button>
      </div>
    </header>

    <!-- 内容区域 -->
    <main class="content">
      <!-- 余额显示 -->
      <div class="balance-section">
        <div class="balance-card">
          <div class="balance-label">账户余额</div>
          <div class="balance-amount">{{ walletInfo.balance }} USDT</div>
          <div class="balance-note">当前汇率：1 TRX ≈ {{ trxPrice }} USDT</div>
        </div>
      </div>

      <!-- 功能按钮 -->
      <div class="action-buttons">
        <button class="action-btn recharge-btn" @click="openRechargeModal">
          <div class="btn-icon">💰</div>
          <div class="btn-text">充值</div>
        </button>
        <button class="action-btn withdraw-btn" @click="showWithdrawModal = true">
          <div class="btn-icon">📤</div>
          <div class="btn-text">提现</div>
        </button>
      </div>

      <!-- 交易记录 -->
      <div class="transactions-section">
        <div class="section-header">
          <h3>最近交易</h3>
          <button class="view-all-btn" @click="showTransactions">查看全部</button>
        </div>
        <div class="transactions-list">
          <div 
            v-for="transaction in recentTransactions" 
            :key="transaction._id"
            class="transaction-item"
          >
            <div class="transaction-icon">
              <span v-if="transaction.type === 'recharge' || transaction.type === 2 || transaction.type === 5 || transaction.type === 7">📥</span>
              <span v-else-if="transaction.type === 'withdraw' || transaction.type === 1 || transaction.type === 4 || transaction.type === 6">📤</span>
              <span v-else>💰</span>
            </div>
            <div class="transaction-info">
              <div class="transaction-type">
                {{ getTransactionTypeName(transaction.type) }}
              </div>
              <div class="transaction-time">{{ formatTime(transaction.createdAt) }}</div>
            </div>
            <div 
              :class="['transaction-amount', getTransactionAmountClass(transaction)]"
            >
              {{ getTransactionAmountSign(transaction) }}{{ transaction.amount }} USDT
            </div>
          </div>
          <div v-if="recentTransactions.length === 0" class="empty-state">
            暂无交易记录
          </div>
        </div>
      </div>
    </main>

    <!-- 底部导航 -->
    <footer class="bottom-nav">
      <div class="nav-item" @click="navigate('/home')">
        <div class="nav-icon">💬</div>
        <div class="nav-label">消息</div>
      </div>
      <div class="nav-item" @click="navigate('/contacts')">
        <div class="nav-icon">👥</div>
        <div class="nav-label">联系人</div>
      </div>
      <div class="nav-item active" @click="navigate('/wallet')">
        <div class="nav-icon">💰</div>
        <div class="nav-label">钱包</div>
      </div>
      <div class="nav-item" @click="navigate('/profile')">
        <div class="nav-icon">👤</div>
        <div class="nav-label">我的</div>
      </div>
    </footer>

    <!-- 充值弹窗 -->
    <div v-if="showRechargeModal" class="modal-overlay" @click="showRechargeModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>充值 USDT</h3>
          <button class="close-btn" @click="showRechargeModal = false">×</button>
        </div>
        <div class="recharge-content">
          <!-- 二维码显示 -->
          <div class="qrcode-section" v-if="qrCodeDataUrl">
            <img :src="qrCodeDataUrl" alt="充值地址二维码" class="qrcode-image" />
            <div class="qrcode-label">扫码充值</div>
          </div>
          
          <!-- 地址显示 -->
          <div class="address-section">
            <div class="address-label">充值地址</div>
            <div class="address-box" @click="copyAddress">
              {{ walletInfo.depositAddress }}
              <span class="copy-icon">📋</span>
            </div>
            <div class="address-note">
              {{ walletInfo.note }}
            </div>
          </div>
          
          <div class="platform-info">
            <div class="platform-name">{{ walletInfo.platformName }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 提现弹窗 -->
    <div v-if="showWithdrawModal" class="modal-overlay" @click="showWithdrawModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>提现 USDT</h3>
          <button class="close-btn" @click="showWithdrawModal = false">×</button>
        </div>
        <div class="withdraw-content">
          <div class="form-group">
            <label for="withdrawAmount">提现金额</label>
            <input 
              type="number" 
              id="withdrawAmount" 
              v-model.number="withdrawAmount"
              placeholder="请输入提现金额"
              min="10"
              max="10000"
              @input="updateFeeEstimate"
            />
            <div class="amount-hint">
              最低 10 USDT，最高 10000 USDT
            </div>
          </div>
          
          <div class="form-group">
            <label for="withdrawAddress">钱包地址</label>
            <input 
              type="text" 
              id="withdrawAddress" 
              v-model="withdrawAddress"
              placeholder="请输入 TRON 钱包地址"
            />
          </div>

          <!-- 手续费估算 -->
          <div v-if="feeEstimate" class="fee-info">
            <div class="fee-section">
              <div class="fee-label">手续费</div>
              <div class="fee-amount">{{ feeEstimate.fee.inUSDT }} USDT</div>
            </div>
            <div class="total-section">
              <div class="total-label">总计扣除</div>
              <div class="total-amount">{{ feeEstimate.withdrawal.totalDeduction }} USDT</div>
            </div>
            <div class="actual-section">
              <div class="actual-label">实际到账</div>
              <div class="actual-amount">{{ feeEstimate.withdrawal.actualReceived }} USDT</div>
            </div>
            <div class="fee-note">{{ feeEstimate.note }}</div>
          </div>

          <!-- 余额检查 -->
          <div v-if="insufficientBalance" class="error-message">
            ❌ 余额不足，需要 {{ feeEstimate?.withdrawal?.totalDeduction || withdrawAmount }} USDT
          </div>

          <button 
            class="withdraw-btn-submit"
            :disabled="!canWithdraw"
            @click="handleWithdraw"
          >
            确认提现
          </button>
        </div>
      </div>
    </div>

    <!-- 交易记录弹窗 -->
    <div v-if="showTransactionsModal" class="modal-overlay" @click="showTransactionsModal = false">
      <div class="modal-content transactions-modal" @click.stop>
        <div class="modal-header">
          <h3>交易记录</h3>
          <button class="close-btn" @click="showTransactionsModal = false">×</button>
        </div>
        <div class="transactions-modal-content">
          <div class="transactions-list">
            <div 
              v-for="transaction in allTransactions" 
              :key="transaction._id"
              class="transaction-item"
            >
              <div class="transaction-icon">
                <span v-if="transaction.type === 'recharge' || transaction.type === 2 || transaction.type === 5 || transaction.type === 7">📥</span>
                <span v-else-if="transaction.type === 'withdraw' || transaction.type === 1 || transaction.type === 4 || transaction.type === 6">📤</span>
                <span v-else>💰</span>
              </div>
              <div class="transaction-info">
                <div class="transaction-type">
                  {{ getTransactionTypeName(transaction.type) }}
                </div>
                <div class="transaction-time">{{ formatTime(transaction.createdAt) }}</div>
                <div v-if="transaction.txId" class="transaction-txid">
                  交易哈希: {{ transaction.txId.substring(0, 10) }}...
                </div>
              </div>
              <div 
                :class="['transaction-amount', getTransactionAmountClass(transaction)]"
              >
                {{ getTransactionAmountSign(transaction) }}{{ transaction.amount }} USDT
              </div>
            </div>
            <div v-if="allTransactions.length === 0" class="empty-state">
              暂无交易记录
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { walletAPI } from '../api'
import { useMessageCenter } from '@/composables/useMessageCenter'
import { getSocket } from '@/socket'
import { showToast } from '@/utils/toast'

const router = useRouter()

// ✅ 使用消息中心的余额变动记录
const { balanceChanges, getBalanceHistory, userBalance, loadBalanceHistory } = useMessageCenter()

// 钱包信息
const walletInfo = ref({
  balance: 0,
  depositAddress: '',
  platformName: '',
  note: ''
})

// ✅ 计算属性：实时同步userBalance
const currentBalance = computed(() => {
  return userBalance.value
})

// 交易记录
// ✅ 不再使用HTTP API，改为使用WebSocket推送的余额变动记录
const recentTransactions = computed(() => {
  return getBalanceHistory().slice(0, 5)
})

const allTransactions = computed(() => {
  return getBalanceHistory()
})

// 弹窗状态
const showRechargeModal = ref(false)
const showWithdrawModal = ref(false)
const showTransactionsModal = ref(false)

// 提现表单
const withdrawAmount = ref(0)
const withdrawAddress = ref('')
const feeEstimate = ref(null)
const trxPrice = ref(0.12) // 默认汇率

// 二维码相关
const qrCodeDataUrl = ref('')

// 打开充值弹窗并生成二维码
const openRechargeModal = () => {
  console.log('打开充值弹窗，当前地址:', walletInfo.value.depositAddress)
  
  // 使用在线二维码生成服务
  if (walletInfo.value.depositAddress) {
    const encodedAddress = encodeURIComponent(walletInfo.value.depositAddress)
    qrCodeDataUrl.value = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedAddress}`
    console.log('二维码URL生成成功:', qrCodeDataUrl.value)
  } else {
    console.error('充值地址为空，无法生成二维码')
    showToast('充值地址未加载，请稍后重试', 'warning')
  }
  
  // 显示弹窗
  showRechargeModal.value = true
  
  // ✅ 点击充值时检查充值状态
  checkDepositStatus()
}

// 充值状态检查
let lastRequestId = null
let lastRequestTime = 0

// ✅ 生成唯一 requestId（UUID格式）
const generateRequestId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// ✅ 检查充值状态（使用WebSocket）
const checkDepositStatus = async () => {
  const now = Date.now()
  
  // 5秒内重复调用拦截
  if (now - lastRequestTime < 5000) {
    console.log('⚠️ 操作频繁，请稍后再试')
    return
  }
  
  const requestId = generateRequestId()
  
  // 相同 requestId 3秒内重复提交拦截
  if (requestId === lastRequestId && now - lastRequestTime < 3000) {
    console.log('⚠️ 请勿重复提交')
    return
  }
  
  lastRequestId = requestId
  lastRequestTime = now
  
  try {
    const socket = getSocket()
    if (!socket) {
      console.error('❌ Socket未连接')
      return
    }
    
    // 发送充值检查请求
    socket.emit('wallet:checkDeposit', {
      requestId: requestId
    })
    
    // 监听结果（一次性监听）
    const handleResult = (data) => {
      console.log('💰 充值检查结果:', data)
      
      if (data.success) {
        if (data.hasPending) {
          // 显示充值中状态
          console.log(`🔄 发现 ${data.transactions.length} 笔充值中记录`)
          data.transactions.forEach(tx => {
            console.log(`充值中: ${tx.amount} USDT, TXID: ${tx.txId}`)
          })
          // TODO: 可以在UI上显示充值中提示
        } else {
          console.log('暂无充值记录')
        }
      } else {
        console.log('检查失败:', data.msg)
      }
      
      // 移除监听器
      socket.off('depositCheckResult', handleResult)
    }
    
    socket.on('depositCheckResult', handleResult)
    
    // 5秒后超时移除监听
    setTimeout(() => {
      socket.off('depositCheckResult', handleResult)
    }, 5000)
    
  } catch (err) {
    console.error('检查充值失败:', err)
  }
}

// 加载钱包信息
const loadWalletInfo = async () => {
  try {
    const walletData = await walletAPI.getWalletInfo()
    walletInfo.value = walletData
  } catch (error) {
    console.error('获取钱包信息失败:', error)
  }
}

// 加载交易记录
const loadTransactions = async (page = 1, limit = 20) => {
  try {
    const response = await walletAPI.getTransactions(page, limit)
    
    // ✅ 防御性检查：确保数据结构正确
    const transactionsData = response.data || response
    const transactions = Array.isArray(transactionsData.transactions) 
      ? transactionsData.transactions 
      : Array.isArray(transactionsData) 
        ? transactionsData 
        : []
    
    if (page === 1) {
      recentTransactions.value = transactions.slice(0, 5)
    }
    allTransactions.value = transactions
    
    console.log('✅ 交易记录已加载:', transactions.length, '条')
  } catch (error) {
    console.error('获取交易记录失败:', error)
    // ✅ 出错时设置为空数组，避免后续错误
    if (page === 1) {
      recentTransactions.value = []
    }
    allTransactions.value = []
  }
}

// ✅ 获取交易类型名称
const getTransactionTypeName = (type) => {
  const typeMap = {
    1: '加入接龙群',
    2: '门票收益',
    3: '抢红包',
    4: '六合下注',
    5: '六合中奖',
    6: '私聊红包转出',
    7: '私聊红包收入',
    'recharge': '充值',
    'withdraw': '提现'
  }
  return typeMap[type] || '其他'
}

// ✅ 获取金额符号
const getTransactionAmountSign = (transaction) => {
  // 负数表示支出，正数表示收入
  const amount = parseFloat(transaction.amount)
  return amount >= 0 ? '+' : ''
}

// ✅ 获取金额样式类
const getTransactionAmountClass = (transaction) => {
  const amount = parseFloat(transaction.amount)
  return amount >= 0 ? 'income' : 'expense'
}

// 更新手续费估算
const updateFeeEstimate = async () => {
  if (withdrawAmount.value > 0) {
    try {
      const feeData = await walletAPI.estimateWithdrawFee(withdrawAmount.value)
      feeEstimate.value = feeData
      trxPrice.value = feeData.price.trxToUSDT
    } catch (error) {
      console.error('获取手续费估算失败:', error)
    }
  } else {
    feeEstimate.value = null
  }
}

// 检查余额是否充足
const insufficientBalance = computed(() => {
  if (!feeEstimate.value) return false
  return walletInfo.value.balance < feeEstimate.value.withdrawal.totalDeduction
})

// 是否可以提现
const canWithdraw = computed(() => {
  return withdrawAmount.value >= 10 && 
         withdrawAmount.value <= 10000 &&
         withdrawAddress.value &&
         !insufficientBalance.value
})

// 执行提现
const handleWithdraw = async () => {
  try {
    const response = await walletAPI.withdraw(withdrawAmount.value, withdrawAddress.value)
    if (response.success) {
      showToast(`✅ 提现成功！\n交易哈希: ${response.data.transaction.txId}`, 'success', 3000)
      // 刷新钱包信息和交易记录
      loadWalletInfo()
      loadTransactions()
      // 关闭弹窗并重置表单
      showWithdrawModal.value = false
      withdrawAmount.value = 0
      withdrawAddress.value = ''
      feeEstimate.value = null
    }
  } catch (error) {
    console.error('提现失败:', error)
    const errorMessage = error.response?.data?.error?.message || '提现失败，请稍后重试'
    showToast(`❌ ${errorMessage}`, 'error')
  }
}

// 复制地址
const copyAddress = () => {
  if (!walletInfo.value.depositAddress) {
    showToast('充值地址未加载，请稍后重试', 'warning')
    return
  }
  
  navigator.clipboard.writeText(walletInfo.value.depositAddress).then(() => {
    showToast('充值地址已复制到剪贴板', 'success')
  }).catch(err => {
    console.error('复制失败:', err)
    showToast('复制失败，请手动复制', 'error')
  })
}

// 显示交易记录
const showTransactions = async () => {
  await loadTransactions(1, 50)
  showTransactionsModal.value = true
}

// 格式化时间
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 导航
const navigate = (path) => {
  router.push(path)
}

// 页面加载时获取数据
onMounted(async () => {
  loadWalletInfo()
  // ✅ 从 IndexedDB 加载余额变动历史
  await loadBalanceHistory()
})
</script>

<style scoped>
.wallet-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

/* 内容区域 */
.content {
  flex: 1;
  overflow-y: auto;
  /* ✅ 防止底部导航遮挡：底部导航高度(70px) + 安全区 */
  padding-bottom: calc(20px + 70px + env(safe-area-inset-bottom));
}

/* 头部导航 */
.header {
  background: white;
  border-bottom: 1px solid #e0e0e0;
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header h1 {
  color: #667eea;
  font-size: 1.5rem;
}

.header-actions {
  display: flex;
  gap: 15px;
}

.action-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: #f5f7fa;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  transition: background-color 0.3s ease;
}

.action-btn:hover {
  background: #e0e0e0;
}

/* 内容区域 */
.content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* 余额显示 */
.balance-section {
  margin-bottom: 30px;
}

.balance-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 20px;
  color: white;
  border-radius: 20px;
  text-align: center;
}

.balance-label {
  font-size: 1rem;
  opacity: 0.9;
  margin-bottom: 10px;
}

.balance-amount {
  font-size: 2.5rem;
  font-weight: 600;
  margin-bottom: 10px;
}

.balance-note {
  font-size: 0.9rem;
  opacity: 0.8;
}

/* 功能按钮 */
.action-buttons {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
}

.action-btn.recharge-btn,
.action-btn.withdraw-btn {
  flex: 1;
  height: auto;
  padding: 30px 20px;
  background: white;
  border-radius: 15px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.action-btn.recharge-btn:hover,
.action-btn.withdraw-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.btn-icon {
  font-size: 2rem;
}

.btn-text {
  font-size: 1rem;
  font-weight: 500;
  color: #333;
}

/* 交易记录 */
.transactions-section {
  background: white;
  border-radius: 15px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  color: #333;
  font-size: 1.2rem;
}

.view-all-btn {
  padding: 6px 12px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 15px;
  font-size: 0.8rem;
  cursor: pointer;
}

.transactions-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.transaction-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 10px;
}

.transaction-icon {
  font-size: 1.5rem;
}

.transaction-info {
  flex: 1;
}

.transaction-type {
  font-weight: 500;
  color: #333;
  margin-bottom: 5px;
}

.transaction-time {
  font-size: 0.8rem;
  color: #666;
}

.transaction-txid {
  font-size: 0.7rem;
  color: #999;
  margin-top: 5px;
}

.transaction-amount {
  font-weight: 600;
  font-size: 1.1rem;
}

.transaction-amount.recharge {
  color: #2ed573;
}

.transaction-amount.withdraw {
  color: #ff4757;
}

.empty-state {
  text-align: center;
  color: #999;
  padding: 40px 20px;
}

/* 底部导航 */
.bottom-nav {
  background: white;
  border-top: 1px solid #e0e0e0;
  padding: 15px 10px;
  padding-bottom: calc(15px + env(safe-area-inset-bottom));
  display: flex;
  justify-content: space-around;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  color: #666;
  transition: color 0.3s ease;
}

.nav-item.active {
  color: #667eea;
}

.nav-icon {
  font-size: 1.3rem;
}

.nav-label {
  font-size: 0.7rem;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 20px;
  padding: 30px;
  width: 90%;
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h3 {
  color: #667eea;
  font-size: 1.3rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #999;
}

/* 充值弹窗 */
.qrcode-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.qrcode-image {
  width: 200px;
  height: 200px;
  border: 2px solid #f0f0f0;
  border-radius: 12px;
  padding: 10px;
  background: white;
}

.qrcode-label {
  margin-top: 10px;
  font-size: 0.9rem;
  color: #666;
  font-weight: 500;
}

.recharge-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.address-section {
  text-align: center;
}

.address-label {
  font-size: 1rem;
  color: #333;
  margin-bottom: 10px;
}

.address-box {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 10px;
  font-family: monospace;
  font-size: 0.9rem;
  word-break: break-all;
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.copy-icon {
  position: absolute;
  right: 15px;
  font-size: 1rem;
  opacity: 0;  /* ✅ 完全透明，隐藏复制图标 */
}

.address-note {
  font-size: 0.8rem;
  color: #666;
  margin-top: 10px;
  line-height: 1.4;
}

.platform-info {
  text-align: center;
}

.platform-name {
  font-size: 1.1rem;
  font-weight: 500;
  color: #667eea;
}

/* 提现弹窗 */
.withdraw-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 500;
  color: #333;
  font-size: 0.9rem;
}

.form-group input {
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 1rem;
}

.form-group input:focus {
  border-color: #667eea;
}

.amount-hint {
  font-size: 0.8rem;
  color: #666;
}

/* 手续费信息 */
.fee-info {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.fee-section,
.total-section,
.actual-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.fee-label,
.total-label,
.actual-label {
  font-size: 0.9rem;
  color: #666;
}

.fee-amount,
.total-amount,
.actual-amount {
  font-weight: 600;
  font-size: 1.1rem;
}

.fee-note {
  font-size: 0.8rem;
  color: #ff4757;
  text-align: center;
  margin-top: 10px;
}

/* 错误信息 */
.error-message {
  color: #ff4757;
  font-size: 0.9rem;
  text-align: center;
  padding: 10px;
  background: #ffeaea;
  border-radius: 10px;
}

/* 提现按钮 */
.withdraw-btn-submit {
  padding: 15px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.withdraw-btn-submit:hover:not(:disabled) {
  background: #5a6fd8;
}

.withdraw-btn-submit:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* 交易记录弹窗 */
.transactions-modal {
  max-width: 500px;
}

.transactions-modal-content {
  max-height: 60vh;
  overflow-y: auto;
}
</style>
