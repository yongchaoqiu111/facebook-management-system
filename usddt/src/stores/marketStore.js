import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getSocket } from '@/socket'
import { useUserStore } from '@/stores/userStore'

export const useMarketStore = defineStore('market', () => {
  const userStore = useUserStore()
  
  // 行情数据 - 初始化默认价格（与后端保持一致）
  const marketData = ref([
    { symbol: 'BTC', name: '比特币', price: 72800, change: 0.1, formattedPrice: '$72,800.00', formattedChange: '+0.10%' },
    { symbol: 'ETH', name: '以太坊', price: 3200, change: 1.5, formattedPrice: '$3,200.00', formattedChange: '+1.50%' },
    { symbol: 'BNB', name: '币安币', price: 600, change: -0.5, formattedPrice: '$600.00', formattedChange: '-0.50%' },
    { symbol: 'SOL', name: 'Solana', price: 150, change: 2.0, formattedPrice: '$150.00', formattedChange: '+2.00%' },
    { symbol: 'XRP', name: 'Ripple', price: 2.5, change: -1.0, formattedPrice: '$2.50', formattedChange: '-1.00%' }
  ])
  const loading = ref(false)
  const lastUpdate = ref(null)

  // ✅ 用户余额（存 localStorage）
  // 注意：这里从 userStore 同步，不直接管理余额
  // userStore 的 balance 是全局余额，这里只是引用

  // 用户持仓
  const holdings = ref(JSON.parse(localStorage.getItem('cryptoHoldings') || '{}'))
  
  // BTC 价格历史（用于折线图）
  const btcPriceHistory = ref([
    70500, 70520, 70480, 70550, 70600, 70580, 70620, 70650, 70630, 70680,
    70700, 70690, 70720, 70750, 70730, 70780, 70800, 70790, 70820, 70850,
    70830, 70860, 70880, 70870, 70900, 70920, 70910, 70890, 70870, 70850,
    70840, 70860, 70880, 70870, 70890, 70900, 70880, 70870, 70860, 70850
  ])
  const MAX_HISTORY = 40

  // ✅ 初始化 WebSocket 监听
  const initWebSocketListener = () => {
    const socket = getSocket()
    if (!socket) {
      console.warn('⚠️ Socket 未初始化，无法监听价格更新')
      return
    }

    socket.on('cryptoPriceUpdate', (data) => {
      console.log('📊 [marketStore] 收到价格更新:', data)
      
      // data 可能是单个对象或数组
      const updates = Array.isArray(data) ? data : [data]
      
      // 更新所有币种价格
      updates.forEach(update => {
        const coin = marketData.value.find(c => c.symbol === update.symbol)
        if (coin) {
          coin.price = update.price
          coin.change = update.changePercent
          coin.formattedPrice = `$${update.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          coin.formattedChange = `${update.changePercent >= 0 ? '+' : ''}${update.changePercent.toFixed(2)}%`
        }
      })
      
      // 从这组数据中找 BTC 价格，记录到历史
      const btcUpdate = updates.find(u => u.symbol === 'BTC')
      if (btcUpdate) {
        btcPriceHistory.value.push(btcUpdate.price)
        if (btcPriceHistory.value.length > MAX_HISTORY) {
          btcPriceHistory.value.shift()
        }
        console.log('📈 [BTC历史] 价格:', btcUpdate.price, '当前点数:', btcPriceHistory.value.length)
      }
      
      lastUpdate.value = new Date()
    })
    
    // ✅ 监听交易成功
    socket.on('tradeExecuted', (data) => {
      console.log('💰 [marketStore] 交易成功:', data)
      
      // 更新持仓
      if (data.newHolding !== undefined) {
        updateHolding(data.symbol, data.newHolding)
      }
      
      // 本地持久化持仓
      localStorage.setItem('cryptoHoldings', JSON.stringify(holdings.value))
      
      // 更新 userStore 余额
      userStore.updateBalance(data.newBalance)
      
      // 保存交易记录到 IndexedDB
      userStore.addTransaction({
        type: data.type,
        symbol: data.symbol,
        amount: data.amount,
        price: data.price,
        total: data.total
      })
    })
    
    // ✅ 监听交易错误
    socket.on('tradeError', (data) => {
      console.log('❌ [marketStore] 交易失败:', data)
      // 错误处理由调用方负责
    })
    
    // ✅ 监听余额更新（包含持仓）
    socket.on('balanceUpdated', (data) => {
      console.log('💰 [marketStore] 余额更新:', data)
      
      // 更新 userStore 余额
      if (data.balance !== undefined) {
        userStore.updateBalance(data.balance)
      }
      
      // 更新持仓
      if (data.holdings) {
        Object.entries(data.holdings).forEach(([symbol, amount]) => {
          updateHolding(symbol, amount)
        })
        // 本地持久化
        localStorage.setItem('cryptoHoldings', JSON.stringify(holdings.value))
      }
    })
    
    console.log('✅ [marketStore] WebSocket 监听器已注册')
  }
  
  // ✅ 发送交易请求
  const executeTrade = (symbol, type, amount, price) => {
    const socket = getSocket()
    if (!socket || !socket.connected) {
      console.error('❌ [marketStore] Socket 未连接')
      return { success: false, error: '网络连接失败' }
    }
    
    console.log('💰 [marketStore] 发送交易请求:', { symbol, type, amount, price })
    
    socket.emit('executeTrade', {
      symbol,
      type,
      amount,
      price
    })
    
    return { success: true }
  }

  // 计算属性：按涨跌幅排序
  const sortedByChange = computed(() => {
    return [...marketData.value].sort((a, b) => b.change - a.change)
  })

  // 更新持仓
  const updateHolding = (symbol, amount) => {
    if (amount <= 0) {
      delete holdings.value[symbol]
    } else {
      holdings.value[symbol] = amount
    }
  }

  // 获取持仓总价值
  const getTotalHoldingValue = computed(() => {
    let total = 0
    Object.entries(holdings.value).forEach(([symbol, amount]) => {
      const coin = marketData.value.find(c => c.symbol === symbol)
      if (coin) {
        total += coin.price * amount
      }
    })
    return total
  })
  
  // 获取指定币种的价格历史
  const getPriceHistory = (symbol) => {
    return priceHistories.value[symbol] || []
  }

  return {
    marketData,
    loading,
    lastUpdate,
    holdings,
    btcPriceHistory,
    sortedByChange,
    initWebSocketListener,
    updateHolding,
    getTotalHoldingValue,
    executeTrade
  }
})
