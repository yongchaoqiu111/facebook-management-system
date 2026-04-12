import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { addTradeRecord, getTradeRecords, clearAllData } from '@/utils/chatStorage'

/**
 * 全局用户 Store
 * 管理：用户信息、钱包余额、交易记录
 */
export const useUserStore = defineStore('user', () => {
  // 用户基本信息
  const userInfo = ref({
    id: localStorage.getItem('userId') || '',
    username: '',
    avatar: ''
  })
  
  // ✅ 钱包余额（存 localStorage）
  const balance = ref(parseFloat(localStorage.getItem('userBalance') || '10000'))
  
  // 最大交易记录数
  const MAX_TRANSACTIONS = 50

  // 设置用户信息
  const setUserInfo = (info) => {
    userInfo.value = { ...userInfo.value, ...info }
    if (info.id) {
      localStorage.setItem('userId', info.id)
    }
    console.log('✅ [UserStore] 设置用户信息:', info.username)
  }
  
  // 更新余额
  const updateBalance = (newBalance) => {
    balance.value = parseFloat(newBalance)
    localStorage.setItem('userBalance', balance.value.toString())
    console.log('✅ [UserStore] 更新余额:', balance.value)
  }
  
  // ✅ 添加交易记录（存 IndexedDB）
  const addTransaction = async (transaction) => {
    try {
      const tradeData = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        userId: userInfo.value.id,
        ...transaction
      }
      
      // ✅ 保存到 IndexedDB
      await addTradeRecord(tradeData)
      
      console.log('✅ [UserStore] 交易记录已保存到 IndexedDB:', transaction.type)
    } catch (error) {
      console.error('❌ [UserStore] 保存交易记录失败:', error)
    }
  }
  
  // ✅ 获取交易记录（从 IndexedDB）
  const getTransactions = async (limit = 20) => {
    try {
      const records = await getTradeRecords(userInfo.value.id, limit)
      return records
    } catch (error) {
      console.error('❌ [UserStore] 获取交易记录失败:', error)
      return []
    }
  }
  
  // ✅ 清空交易记录
  const clearTransactions = async () => {
    try {
      await clearAllData()
      console.log('✅ [UserStore] 交易记录已清空')
    } catch (error) {
      console.error('❌ [UserStore] 清空交易记录失败:', error)
    }
  }
  
  // ✅ 计算属性：总充值金额
  const totalDeposit = computed(() => {
    // 需要从 IndexedDB 异步计算，这里返回 0
    // 实际使用时应该调用异步方法
    return 0
  })
  
  // ✅ 计算属性：总提现金额
  const totalWithdraw = computed(() => {
    return 0
  })
  
  // ✅ 计算属性：总交易金额
  const totalTrade = computed(() => {
    return 0
  })

  return {
    userInfo,
    balance,
    setUserInfo,
    updateBalance,
    addTransaction,
    getTransactions,
    clearTransactions,
    totalDeposit,
    totalWithdraw,
    totalTrade
  }
})
