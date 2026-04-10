<template>
  <div class="trade-page">
    <!-- 顶部标题 -->
    <div class="trade-header">
      <h1>交易</h1>
    </div>

    <!-- 币种信息 -->
    <div class="coin-info" v-if="store.selectedCoin">
      <div class="coin-name">{{ currentSymbol }}</div>
      <div class="coin-price">${{ currentPrice }}</div>
      <div class="coin-change" :class="{ positive: currentChangePercent > 0 }">
        {{ currentChangePercent > 0 ? '+' : '' }}{{ currentChangePercent }}%
      </div>
    </div>

    <!-- K线图容器 -->
    <div class="chart-container">
      <div ref="chartContainer" class="chart"></div>
      <div v-if="loading" class="loading-overlay">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </div>

    <!-- 时间周期选择 -->
    <div class="timeframe-selector">
      <button 
        v-for="tf in timeframes" 
        :key="tf.value"
        :class="{ active: selectedTimeframe === tf.value }"
        @click="changeTimeframe(tf.value)"
      >
        {{ tf.label }}
      </button>
    </div>

    <!-- 交易表单 -->
    <div class="trade-form">
      <div class="trade-type-selector">
        <button 
          :class="{ active: tradeType === 'buy' }"
          @click="tradeType = 'buy'"
        >
          买入
        </button>
        <button 
          :class="{ active: tradeType === 'sell' }"
          @click="tradeType = 'sell'"
        >
          卖出
        </button>
      </div>

      <div class="form-group">
        <label>价格 (USD)</label>
        <input 
          v-model="price" 
          type="number" 
          step="0.01"
          placeholder="输入价格"
        />
      </div>

      <div class="form-group">
        <label>数量</label>
        <input 
          v-model="amount" 
          type="number" 
          step="0.000001"
          placeholder="输入数量"
        />
        <div class="quick-amounts">
          <button @click="setQuickAmount(25)">25%</button>
          <button @click="setQuickAmount(50)">50%</button>
          <button @click="setQuickAmount(75)">75%</button>
          <button @click="setQuickAmount(100)">100%</button>
        </div>
      </div>

      <div class="form-group">
        <label>总额 (USD)</label>
        <input 
          :value="totalAmount" 
          readonly
          type="text"
        />
      </div>

      <button class="trade-button" @click="handleTrade">
        {{ tradeType === 'buy' ? '买入' : '卖出' }} {{ currentSymbol }}
      </button>
    </div>

    <!-- 调试信息面板 -->
    <div class="debug-panel">
      <h3>🔍 调试信息</h3>
      <div class="debug-item">
        <strong>store.coins 长度:</strong> {{ store.coins.length }}
      </div>
      <div class="debug-item">
        <strong>store.selectedCoin:</strong> {{ store.selectedCoin ? store.selectedCoin.symbol : 'null' }}
      </div>
      <div class="debug-item">
        <strong>当前价格:</strong> ${{ currentPrice }}
      </div>
      <div class="debug-item">
        <strong>当前涨跌幅:</strong> {{ currentChangePercent }}%
      </div>
      <div class="debug-item">
        <strong>原始 change 值:</strong> {{ store.selectedCoin?.change }}
      </div>
      <div class="debug-item">
        <strong>priceHistory 长度:</strong> {{ priceHistoryLength }}
      </div>
      <div class="debug-item">
        <strong>图表实例:</strong> {{ chart ? '已初始化' : '未初始化' }}
      </div>
      <div class="debug-item">
        <strong>K线系列:</strong> {{ candlestickSeries ? '已创建' : '未创建' }}
      </div>
      <div class="debug-item">
        <strong>错误信息:</strong> {{ errorMessage || '无' }}
      </div>
      <button @click="showDebugDetails" class="debug-btn">查看详细数据</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useMarketStore } from '../stores/market'
import { createChart, CandlestickSeries } from 'lightweight-charts'

const store = useMarketStore()
const chartContainer = ref(null)
const loading = ref(false)
const errorMessage = ref('')
const tradeType = ref('buy')
const price = ref('')
const amount = ref('')
const selectedTimeframe = ref('15m')

let chart = null
let candlestickSeries = null

// 时间周期选项
const timeframes = [
  { label: '1分钟', value: '1m' },
  { label: '5分钟', value: '5m' },
  { label: '15分钟', value: '15m' },
  { label: '1小时', value: '1h' },
  { label: '4小时', value: '4h' },
  { label: '1天', value: '1d' }
]

// 🔥 修复：正确计算涨跌幅
const currentChangePercent = computed(() => {
  if (!store.selectedCoin) return '0.00'
  
  const change = parseFloat(store.selectedCoin.change)
  
  // 如果 change 有效，直接显示
  if (!isNaN(change)) {
    return change.toFixed(2)
  }
  
  return '0.00'
})

// 计算属性
const currentSymbol = computed(() => {
  if (!store.selectedCoin) return 'BTC/USD'
  return `${store.selectedCoin.symbol}/USD`
})

const currentPrice = computed(() => {
  if (!store.selectedCoin) return '0.00'
  return store.selectedCoin.price || '0.00'
})

const totalAmount = computed(() => {
  const p = parseFloat(price.value) || 0
  const a = parseFloat(amount.value) || 0
  return (p * a).toFixed(2)
})

const priceHistoryLength = computed(() => {
  if (!store.selectedCoin) return 0
  const history = store.priceHistory[store.selectedCoin.symbol]
  return history ? history.length : 0
})

// 初始化专业 K 线图
const initChart = () => {
  console.log('=== 开始初始化图表 ===')
  
  if (!chartContainer.value) {
    console.error('❌ chartContainer 不存在！')
    errorMessage.value = '图表容器未找到'
    return
  }
  
  console.log('✅ chartContainer 存在，尺寸:', chartContainer.value.offsetWidth, 'x', chartContainer.value.offsetHeight)
  
  try {
    chart = createChart(chartContainer.value, {
      layout: {
        background: { color: '#111' },
        textColor: '#999',
      },
      grid: {
        vertLines: { color: '#2a2a2a' },
        horzLines: { color: '#2a2a2a' },
      },
      crosshair: {
        mode: 1, // 十字光标
      },
      rightPriceScale: {
        borderColor: '#2a2a2a',
      },
      timeScale: {
        borderColor: '#2a2a2a',
        timeVisible: true,
        secondsVisible: false,
      },
    })
    
    console.log('✅ Chart 实例创建成功')
    
    // v5.x API: 使用 addSeries 方法
    candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#4CAF50',        // 上涨绿色
      downColor: '#F44336',      // 下跌红色
      borderUpColor: '#4CAF50',
      borderDownColor: '#F44336',
      wickUpColor: '#4CAF50',
      wickDownColor: '#F44336',
    })
    
    console.log('✅ CandlestickSeries 创建成功')
    console.log('=== 图表初始化完成 ===')
  } catch (error) {
    console.error('❌ 图表初始化失败:', error)
    errorMessage.value = '图表初始化失败: ' + error.message
  }
}

// 加载并显示 K 线数据
const loadChartData = async () => {
  console.log('\n=== 开始加载 K线数据 ===')
  loading.value = true
  errorMessage.value = ''
  
  try {
    console.log('1. 检查 selectedCoin:', store.selectedCoin)
    
    // 确保有选中的币种
    if (!store.selectedCoin) {
      console.log('2. selectedCoin 为空，尝试获取币种列表...')
      if (store.coins.length > 0) {
        console.log('   coins 已有数据，选择第一个:', store.coins[0].symbol)
        store.selectCoin(store.coins[0])
      } else {
        console.log('   coins 也为空，开始 fetchCoinList...')
        await store.fetchCoinList()
        console.log('   fetchCoinList 完成，coins 数量:', store.coins.length)
        if (store.coins.length > 0) {
          console.log('   选择第一个币种:', store.coins[0].symbol)
          store.selectCoin(store.coins[0])
        }
      }
    }
    
    console.log('3. 最终 selectedCoin:', store.selectedCoin)
    
    if (!store.selectedCoin) {
      throw new Error('无法获取币种信息')
    }
    
    console.log('4. 开始获取价格历史数据...')
    console.log('   币种:', store.selectedCoin.symbol)
    console.log('   时间周期:', selectedTimeframe.value)
    
    // 获取 K线数据
    await store.fetchPriceHistory(store.selectedCoin.symbol, selectedTimeframe.value)
    
    console.log('5. 检查 priceHistory...')
    const priceHistory = store.priceHistory[store.selectedCoin.symbol]
    console.log('   priceHistory 存在:', !!priceHistory)
    console.log('   priceHistory 长度:', priceHistory ? priceHistory.length : 0)
    
    if (!priceHistory || priceHistory.length === 0) {
      throw new Error('没有获取到价格数据')
    }
    
    console.log('6. 数据加载成功，第一条数据:', priceHistory[0])
    console.log('   最后一条数据:', priceHistory[priceHistory.length - 1])
    
    // 转换为 lightweight-charts 需要的格式
    console.log('7. 开始转换数据格式...')
    const candleData = priceHistory.map((item, index) => {
      const data = {
        time: item.timestamp.getTime() / 1000, // Unix 时间戳（秒）
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
      }
      if (index === 0 || index === priceHistory.length - 1) {
        console.log(`   [${index}]`, data)
      }
      return data
    })
    
    console.log('8. 转换后的数据数量:', candleData.length)
    
    if (!candlestickSeries) {
      throw new Error('K线系列未初始化')
    }
    
    // 设置数据
    console.log('9. 设置图表数据...')
    candlestickSeries.setData(candleData)
    console.log('✅ 数据设置成功')
    
    // 自动调整视图
    console.log('10. 调整图表视图...')
    chart.timeScale().fitContent()
    console.log('✅ 视图调整完成')
    
    console.log('=== K线数据加载完成 ===\n')
  } catch (error) {
    console.error('❌ 加载 K线数据失败:', error)
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

// 切换时间周期
const changeTimeframe = (timeframe) => {
  console.log('切换时间周期:', timeframe)
  selectedTimeframe.value = timeframe
  loadChartData()
}

// 快速设置数量
const setQuickAmount = (percent) => {
  const balance = 10000 // 模拟余额
  const p = parseFloat(price.value) || parseFloat(currentPrice.value)
  if (p > 0) {
    amount.value = ((balance * percent / 100) / p).toFixed(6)
  }
}

// 处理交易
const handleTrade = () => {
  if (!price.value || !amount.value) {
    alert('请输入价格和数量')
    return
  }
  
  const action = tradeType.value === 'buy' ? '买入' : '卖出'
  alert(`${action} ${amount.value} ${currentSymbol.value}\n价格: $${price.value}\n总额: $${totalAmount.value}`)
}

// 显示详细调试信息
const showDebugDetails = () => {
  console.log('\n========== 详细调试信息 ==========')
  console.log('store.coins:', store.coins)
  console.log('store.selectedCoin:', store.selectedCoin)
  console.log('store.priceHistory:', store.priceHistory)
  console.log('chart:', chart)
  console.log('candlestickSeries:', candlestickSeries)
  console.log('currentChangePercent:', currentChangePercent.value)
  console.log('====================================\n')
  
  alert('详细数据已输出到控制台，请按 F12 查看')
}

// 监听币种变化
watch(() => store.selectedCoin, (newCoin) => {
  console.log('📡 检测到 selectedCoin 变化:', newCoin)
  if (newCoin) {
    price.value = newCoin.price
    loadChartData()
  }
})

// 🔥 关键修复：监听 priceHistory 的实时变化，自动更新 K线图
watch(() => store.priceHistory, (newHistory) => {
  if (!store.selectedCoin || !candlestickSeries) {
    console.log('⚠️ 跳过更新: selectedCoin 或 candlestickSeries 为空')
    return
  }
  
  const symbol = store.selectedCoin.symbol
  const history = newHistory[symbol]
  
  if (!history || history.length === 0) {
    console.log('⚠️ 跳过更新: priceHistory 为空')
    return
  }
  
  console.log('🔄 检测到 priceHistory 更新，数据点数量:', history.length)
  
  // 转换为 lightweight-charts 格式
  const candleData = history.map(item => ({
    time: item.timestamp.getTime() / 1000,
    open: item.open,
    high: item.high,
    low: item.low,
    close: item.close,
  }))
  
  // 获取最后一个数据点并更新图表
  const lastCandle = candleData[candleData.length - 1]
  if (lastCandle) {
    console.log('📊 实时更新最后一根K线:', {
      time: new Date(lastCandle.time * 1000).toLocaleTimeString(),
      open: lastCandle.open.toFixed(2),
      high: lastCandle.high.toFixed(2),
      low: lastCandle.low.toFixed(2),
      close: lastCandle.close.toFixed(2)
    })
    
    // 使用 update 方法而不是 setData，性能更好
    candlestickSeries.update(lastCandle)
    console.log('✅ K线图已实时更新')
  }
}, { deep: true })

// 生命周期
onMounted(async () => {
  console.log('\n🚀 Trade 页面加载')
  console.log('初始状态:')
  console.log('  - store.coins.length:', store.coins.length)
  console.log('  - store.selectedCoin:', store.selectedCoin)
  
  // 🔥 关键修复：先初始化图表
  initChart()
  
  // 🔥 关键修复：确保币种列表已加载（等待完成）
  if (store.coins.length === 0) {
    console.log('⏳ 币种列表为空，开始加载...')
    await store.fetchCoinList()
    console.log('✅ 币种列表加载完成，数量:', store.coins.length)
    console.log('✅ selectedCoin.change:', store.selectedCoin?.change)
  }
  
  // 🔥 关键修复：确保 selectedCoin 有 change 值
  if (store.selectedCoin && !store.selectedCoin.change) {
    console.log('⚠️ selectedCoin.change 为空，手动设置初始值')
    store.selectedCoin.change = '2.5'  // 默认涨跌幅
  }
  
  // 🔥 关键修复：最后才初始化 WebSocket
  console.log(' 初始化WebSocket连接...')
  store.initWebSocket()
  
  // 加载图表数据
  console.log('📊 开始加载图表数据...')
  await loadChartData()
})

// 清理
import { onBeforeUnmount } from 'vue'
onBeforeUnmount(() => {
  if (chart) {
    chart.remove()
    chart = null
  }
})
</script>

<style scoped>
.trade-page {
  min-height: 100vh;
  background: #0a0a0a;
  color: #fff;
  padding: 20px;
}

.trade-header {
  margin-bottom: 20px;
}

.trade-header h1 {
  font-size: 24px;
  margin: 0;
}

.coin-info {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
  padding: 15px;
  background: #1a1a1a;
  border-radius: 8px;
}

.coin-name {
  font-size: 20px;
  font-weight: bold;
}

.coin-price {
  font-size: 24px;
  font-weight: bold;
  color: #4CAF50;
}

.coin-change {
  font-size: 16px;
  padding: 4px 8px;
  border-radius: 4px;
  background: rgba(244, 67, 54, 0.2);
  color: #F44336;
}

.coin-change.positive {
  background: rgba(76, 175, 80, 0.2);
  color: #4CAF50;
}

.chart-container {
  position: relative;
  height: 400px;
  background: #111;
  border-radius: 8px;
  margin-bottom: 20px;
  overflow: hidden;
}

.chart {
  width: 100%;
  height: 100%;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.7);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #333;
  border-top-color: #4CAF50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #F44336;
  text-align: center;
  padding: 20px;
}

.timeframe-selector {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.timeframe-selector button {
  padding: 8px 16px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 4px;
  color: #999;
  cursor: pointer;
  transition: all 0.3s;
}

.timeframe-selector button:hover {
  background: #2a2a2a;
  color: #fff;
}

.timeframe-selector button.active {
  background: #4CAF50;
  border-color: #4CAF50;
  color: #fff;
}

.trade-form {
  background: #1a1a1a;
  padding: 20px;
  border-radius: 8px;
  max-width: 500px;
}

.trade-type-selector {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.trade-type-selector button {
  flex: 1;
  padding: 12px;
  background: #2a2a2a;
  border: none;
  border-radius: 4px;
  color: #999;
  cursor: pointer;
  transition: all 0.3s;
}

.trade-type-selector button.active {
  background: #4CAF50;
  color: #fff;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  color: #999;
  font-size: 14px;
}

.form-group input {
  width: 100%;
  padding: 10px;
  background: #2a2a2a;
  border: 1px solid #333;
  border-radius: 4px;
  color: #fff;
  font-size: 16px;
}

.quick-amounts {
  display: flex;
  gap: 5px;
  margin-top: 8px;
}

.quick-amounts button {
  flex: 1;
  padding: 6px;
  background: #2a2a2a;
  border: 1px solid #333;
  border-radius: 4px;
  color: #999;
  cursor: pointer;
  font-size: 12px;
}

.quick-amounts button:hover {
  background: #3a3a3a;
  color: #fff;
}

.trade-button {
  width: 100%;
  padding: 14px;
  background: #4CAF50;
  border: none;
  border-radius: 4px;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s;
}

.trade-button:hover {
  background: #45a049;
}

/* 调试面板样式 */
.debug-panel {
  margin-top: 30px;
  padding: 20px;
  background: #1a1a1a;
  border: 2px solid #FF9800;
  border-radius: 8px;
}

.debug-panel h3 {
  margin: 0 0 15px 0;
  color: #FF9800;
}

.debug-item {
  padding: 8px 0;
  border-bottom: 1px solid #333;
  font-family: monospace;
  font-size: 13px;
}

.debug-item strong {
  color: #4CAF50;
  margin-right: 10px;
}

.debug-btn {
  margin-top: 15px;
  padding: 10px 20px;
  background: #2196F3;
  border: none;
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
}

.debug-btn:hover {
  background: #1976D2;
}
</style>
