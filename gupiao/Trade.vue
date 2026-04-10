<template>
  <div class="trade-page">
    <!-- 顶部标题 -->
    <div class="trade-header">
      <h1>交易</h1>
    </div>

    <div class="trade-content">
      <!-- 当前币种信息 -->
      <div class="trade-info">
        <div class="current-coin">{{ currentSymbol }}/USD</div>
        <div class="price-info">
          <div class="current-price">{{ currentPrice }}</div>
          <div :class="['price-change', priceChange >= 0 ? 'positive' : 'negative']">
            {{ priceChange >= 0 ? '+' : '' }}{{ priceChange }}%
          </div>
        </div>
      </div>

      <!-- 时间周期选择 -->
      <div class="timeframe-selector">
        <button 
          v-for="tf in timeframes" 
          :key="tf.value"
          :class="['timeframe-btn', selectedTimeframe === tf.value ? 'active' : '']"
          @click="changeTimeframe(tf.value)"
        >
          {{ tf.label }}
        </button>
      </div>

      <!-- K线图表容器 -->
      <div class="chart-wrapper">
        <div ref="chartContainer" class="chart-container"></div>
        <div v-if="loading" class="chart-loading">
          <div class="loading-spinner"></div>
          <div>加载中...</div>
        </div>
        <div v-if="errorMessage" class="chart-error">{{ errorMessage }}</div>
      </div>

      <!-- 交易表单 -->
      <div class="trade-form">
        <div class="trade-tabs">
          <button 
            :class="['trade-tab', tradeType === 'buy' ? 'active buy' : '']"
            @click="tradeType = 'buy'"
          >买入</button>
          <button 
            :class="['trade-tab', tradeType === 'sell' ? 'active sell' : '']"
            @click="tradeType = 'sell'"
          >卖出</button>
        </div>

        <div class="form-group">
          <label>价格 (USD)</label>
          <input 
            type="number" 
            v-model="price"
            class="form-input"
            placeholder="0.00"
            step="0.01"
          >
        </div>

        <div class="form-group">
          <label>数量</label>
          <input 
            type="number" 
            v-model="amount"
            class="form-input"
            placeholder="0.00"
            step="0.000001"
          >
        </div>

        <div class="quick-amounts">
          <button v-for="pct in [25, 50, 75, 100]" :key="pct" @click="setQuickAmount(pct)">
            {{ pct }}%
          </button>
        </div>

        <div class="total-info">
          <span>总额:</span>
          <span class="total-amount">{{ totalAmount }} USD</span>
        </div>

        <button 
          class="trade-btn" 
          :class="tradeType"
          @click="handleTrade"
        >
          {{ tradeType === 'buy' ? '买入' : '卖出' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useMarketStore } from '../stores/market'
import { createChart } from 'lightweight-charts'

export default {
  name: 'Trade',
  setup() {
    const store = useMarketStore()
    
    // 基础状态
    const tradeType = ref('buy')
    const price = ref('')
    const amount = ref('')
    const selectedTimeframe = ref('15m')
    const chartContainer = ref(null)
    const loading = ref(false)
    const errorMessage = ref('')
    
    let chart = null
    let candlestickSeries = null
    
    // 时间周期选项
    const timeframes = [
      { label: '1分', value: '1m' },
      { label: '5分', value: '5m' },
      { label: '15分', value: '15m' },
      { label: '1小时', value: '1h' },
      { label: '4小时', value: '4h' },
      { label: '1天', value: '1d' }
    ]
    
    // 计算属性
    const currentSymbol = computed(() => {
      return store.selectedCoin?.symbol || 'BTC'
    })
    
    const currentPrice = computed(() => {
      return store.selectedCoin?.price || '0.00'
    })
    
    const priceChange = computed(() => {
      return parseFloat(store.selectedCoin?.change || 0)
    })
    
    const totalAmount = computed(() => {
      const p = parseFloat(price.value) || 0
      const a = parseFloat(amount.value) || 0
      return (p * a).toFixed(2)
    })
    
    // 初始化专业 K 线图
    const initChart = () => {
      if (!chartContainer.value) {
        console.error('图表容器未找到')
        return
      }
      
      // 创建图表
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
      
      // 添加 K 线系列
      candlestickSeries = chart.addCandlestickSeries({
        upColor: '#4CAF50',        // 上涨绿色
        downColor: '#F44336',      // 下跌红色
        borderUpColor: '#4CAF50',
        borderDownColor: '#F44336',
        wickUpColor: '#4CAF50',
        wickDownColor: '#F44336',
      })
      
      // 自适应大小
      new ResizeObserver(entries => {
        if (entries.length === 0 || entries[0].target !== chartContainer.value) { return }
        const newRect = entries[0].contentRect
        chart.applyOptions({ width: newRect.width, height: newRect.height })
      }).observe(chartContainer.value)
      
      console.log('图表初始化完成')
    }
    
    // 加载并显示 K 线数据
    const loadChartData = async () => {
      loading.value = true
      errorMessage.value = ''
      
      try {
        console.log('开始加载 K线数据...')
        
        // 确保有选中的币种
        if (!store.selectedCoin) {
          if (store.coins.length > 0) {
            store.selectCoin(store.coins[0])
          } else {
            await store.fetchCoinList()
            if (store.coins.length > 0) {
              store.selectCoin(store.coins[0])
            }
          }
        }
        
        if (!store.selectedCoin) {
          throw new Error('无法获取币种信息')
        }
        
        // 获取 K线数据
        await store.fetchPriceHistory(store.selectedCoin.symbol, selectedTimeframe.value)
        
        const priceHistory = store.priceHistory[store.selectedCoin.symbol]
        
        if (!priceHistory || priceHistory.length === 0) {
          throw new Error('没有获取到价格数据')
        }
        
        console.log('数据加载成功，数据点数量:', priceHistory.length)
        
        // 转换为 lightweight-charts 需要的格式
        const candleData = priceHistory.map(item => ({
          time: item.timestamp.getTime() / 1000, // Unix 时间戳（秒）
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
        }))
        
        // 设置数据
        candlestickSeries.setData(candleData)
        
        // 自动调整视图
        chart.timeScale().fitContent()
        
        console.log('K 线图绘制完成')
        
      } catch (error) {
        console.error('加载图表数据失败:', error)
        errorMessage.value = '数据加载失败: ' + error.message
      } finally {
        loading.value = false
      }
    }
    
    // 切换时间周期
    const changeTimeframe = (timeframe) => {
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
    
    // 监听币种变化
    watch(() => store.selectedCoin, (newCoin) => {
      if (newCoin) {
        price.value = newCoin.price
        loadChartData()
      }
    })
    
    // 生命周期
    onMounted(async () => {
      console.log('Trade 页面加载')
      
      // 初始化图表
      initChart()
      
      // 确保币种列表已加载
      if (store.coins.length === 0) {
        await store.fetchCoinList()
      }
      
      // 加载图表数据
      await loadChartData()
    })
    
    onUnmounted(() => {
      // 清理图表
      if (chart) {
        chart.remove()
        chart = null
      }
    })
    
    return {
      tradeType,
      price,
      amount,
      selectedTimeframe,
      timeframes,
      chartContainer,
      loading,
      errorMessage,
      currentSymbol,
      currentPrice,
      priceChange,
      totalAmount,
      changeTimeframe,
      setQuickAmount,
      handleTrade
    }
  }
}
</script>

<style scoped>
.trade-page {
  min-height: 100vh;
  background: #0a0a0a;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding-bottom: 60px;
}

.trade-header {
  padding: 16px 20px;
  background: #111;
  border-bottom: 1px solid #2a2a2a;
}

.trade-header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.trade-content {
  padding: 20px;
}

.trade-info {
  margin-bottom: 20px;
  padding: 16px;
  background: #111;
  border-radius: 8px;
  border: 1px solid #2a2a2a;
}

.current-coin {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}

.price-info {
  display: flex;
  align-items: baseline;
  gap: 15px;
}

.current-price {
  font-size: 24px;
  font-weight: 700;
}

.price-change {
  font-size: 14px;
  font-weight: 500;
}

.price-change.positive {
  color: #4CAF50;
}

.price-change.negative {
  color: #F44336;
}

.timeframe-selector {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  overflow-x: auto;
}

.timeframe-btn {
  padding: 6px 12px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 6px;
  color: #999;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}

.timeframe-btn:hover {
  background: #2a2a2a;
  color: #ffffff;
}

.timeframe-btn.active {
  background: #2196F3;
  color: white;
  border-color: #2196F3;
}

.chart-wrapper {
  position: relative;
  height: 400px;
  margin-bottom: 20px;
  background: #111;
  border-radius: 8px;
  border: 1px solid #2a2a2a;
  overflow: hidden;
}

.chart-container {
  width: 100%;
  height: 100%;
}

.chart-loading,
.chart-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #2a2a2a;
  border-top-color: #2196F3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 10px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.chart-loading {
  color: #2196F3;
}

.chart-error {
  color: #F44336;
  font-size: 14px;
}

.trade-form {
  padding: 20px;
  background: #111;
  border-radius: 8px;
  border: 1px solid #2a2a2a;
}

.trade-tabs {
  display: flex;
  margin-bottom: 20px;
  background: #1a1a1a;
  border-radius: 8px;
  padding: 4px;
}

.trade-tab {
  flex: 1;
  padding: 10px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #999;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.trade-tab:hover {
  color: #ffffff;
}

.trade-tab.active.buy {
  background: #4CAF50;
  color: white;
}

.trade-tab.active.sell {
  background: #F44336;
  color: white;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  color: #999;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 12px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  color: #ffffff;
  font-size: 16px;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #2196F3;
}

.quick-amounts {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.quick-amounts button {
  flex: 1;
  padding: 8px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 6px;
  color: #999;
  font-size: 12px;
  cursor: pointer;
}

.quick-amounts button:hover {
  background: #2a2a2a;
  color: #ffffff;
}

.total-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-top: 1px solid #2a2a2a;
  margin-bottom: 16px;
  font-size: 14px;
  color: #999;
}

.total-amount {
  color: #ffffff;
  font-weight: 600;
  font-size: 16px;
}

.trade-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.trade-btn.buy {
  background: #4CAF50;
  color: white;
}

.trade-btn.sell {
  background: #F44336;
  color: white;
}
</style>
