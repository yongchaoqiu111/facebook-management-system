<template>
  <div class="trade-detail">
    <!-- 顶部标题栏 -->
    <div class="header-section">
      <div class="header-left" @click="router.back()">
        <span class="back-icon">‹</span>
      </div>
      <div class="header-title">
        <span class="coin-symbol">{{ symbol }}</span>
        <span class="coin-name">{{ coinData.name }}</span>
      </div>
      <div class="header-right">
        <span class="coin-price">${{ coinData.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
        <span :class="['coin-change', coinData.change >= 0 ? 'positive' : 'negative']">
          {{ coinData.formattedChange || (coinData.change >= 0 ? '+' : '') + coinData.change?.toFixed(2) + '%' }}
        </span>
      </div>
    </div>

    <!-- Tab 切换区 -->
    <div class="tab-section">
      <div class="tabs">
        <div 
          v-for="tab in tabs" 
          :key="tab.id"
          class="tab"
          :class="{ active: activeTab === tab.id }"
          @click="switchTab(tab.id)"
        >
          {{ tab.name }}
        </div>
      </div>
      <div class="tab-indicator" :style="indicatorStyle"></div>
    </div>

    <!-- 时间周期选择器 -->
    <div v-show="activeTab === 'chart'" class="timeframe-section">
      <div 
        v-for="tf in timeframes" 
        :key="tf.value"
        class="timeframe-btn"
        :class="{ active: selectedTimeframe === tf.value }"
        @click="changeTimeframe(tf.value)"
      >
        {{ tf.label }}
      </div>
    </div>

    <!-- 内容显示区 -->
    <div class="content-section">
      <!-- 图表 -->
      <div v-show="activeTab === 'chart'" class="chart-wrapper">
        <div id="price-chart" ref="chartRef" class="chart-container"></div>
      </div>
      
      <!-- 最新成交 -->
      <div v-show="activeTab === 'trades'" class="trades-list">
        <div class="trades-header">
          <span class="trade-col">时间</span>
          <span class="trade-col">价格(USD)</span>
          <span class="trade-col">数量</span>
        </div>
        <div class="trades-body">
          <div 
            v-for="(trade, index) in recentTrades" 
            :key="index"
            class="trade-item"
          >
            <span class="trade-col">{{ trade.time }}</span>
            <span :class="['trade-col', trade.type]">{{ trade.price }}</span>
            <span class="trade-col">{{ trade.amount }}</span>
          </div>
        </div>
      </div>
      
      <!-- 持币量 -->
      <div v-show="activeTab === 'holders'" class="holders-info">
        <div class="holding-card">
          <div class="holding-header">
            <span class="coin-icon">💰</span>
            <div class="holding-title">
              <span class="coin-symbol">{{ symbol }}</span>
              <span class="coin-name">{{ coinData.name }}</span>
            </div>
          </div>
          <div class="holding-amount">
            <span class="amount-label">持有数量</span>
            <span class="amount-value">{{ currentHolding.toFixed(4) }}</span>
          </div>
          <div class="holding-value">
            <span class="value-label">总价值</span>
            <span class="value-amount">${{ (currentHolding * (coinData.price || 0)).toFixed(2) }}</span>
          </div>
        </div>
        
        <div class="balance-info">
          <div class="balance-item">
            <span class="balance-label">可用余额</span>
            <span class="balance-value">${{ userBalance.toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部操作区 -->
    <div class="action-section">
      <button class="buy-btn" @click="handleBuy">买入</button>
      <button class="sell-btn" @click="handleSell">卖出</button>
    </div>

    <!-- 交易弹窗 -->
    <div class="trade-modal" v-if="showTradeModal" @click.self="closeTradeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ tradeType === 'buy' ? '买入' : '卖出' }} {{ symbol }}</h3>
          <button class="close-btn" @click="closeTradeModal">✕</button>
        </div>

        <div class="trade-form">
          <div class="input-group">
            <label>数量</label>
            <div class="input-wrapper">
              <input 
                type="number" 
                v-model.number="tradeAmount" 
                placeholder="请输入数量"
                min="0"
                step="0.0001"
              />
              <button class="max-btn" @click="setMaxAmount">最大</button>
            </div>
          </div>

          <div class="estimated-amount">
            <span>预计{{ tradeType === 'buy' ? '花费' : '获得' }}:</span>
            <span>${{ estimatedAmount.toFixed(2) }}</span>
          </div>

          <div class="balance-info">
            <span>可用余额:</span>
            <span>${{ userBalance.toFixed(2) }}</span>
          </div>

          <button 
            :class="['trade-btn', tradeType]" 
            @click="executeTrade"
            :disabled="!tradeAmount || tradeAmount <= 0"
          >
            {{ tradeType === 'buy' ? '买入' : '卖出' }} {{ symbol }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMarketStore } from '@/stores/marketStore'
import { useUserStore } from '@/stores/userStore'
import { showToast } from '@/utils/toast'
import { createChart, CandlestickSeries } from 'lightweight-charts'

const route = useRoute()
const router = useRouter()
const marketStore = useMarketStore()
const userStore = useUserStore()
const { marketData, executeTrade: executeTradeViaWS } = marketStore

const symbol = computed(() => route.params.symbol)
const showTradeModal = ref(false)
const tradeType = ref('buy')
const tradeAmount = ref(0)

// ✅ 使用 store 中的余额
const userBalance = computed(() => userStore.balance)
const chartRef = ref(null)
const chart = ref(null)
const candlestickSeries = ref(null)
const activeTab = ref('chart')

const tabs = [
  { id: 'chart', name: '图表' },
  { id: 'trades', name: '最新成交' },
  { id: 'holders', name: '持币量' }
]

// 时间周期选项
const timeframes = [
  { label: '1分', value: '1m' },
  { label: '5分', value: '5m' },
  { label: '15分', value: '15m' },
  { label: '30分', value: '30m' },
  { label: '1时', value: '1h' },
  { label: '4时', value: '4h' },
  { label: '1天', value: '1d' }
]

const selectedTimeframe = ref('5m') // 默认 5 分钟

// 币种数据
const coinData = computed(() => {
  return marketData.find(c => c.symbol === symbol.value) || {
    symbol: symbol.value,
    name: 'Unknown',
    price: 0,
    change: 0,
    high24h: 0,
    low24h: 0,
    volume24h: 0,
    volume24hValue: 0
  }
})

// 当前持仓
const currentHolding = computed(() => {
  return marketStore.holdings?.[symbol.value] || 0
})

const indicatorStyle = computed(() => {
  const index = tabs.findIndex(tab => tab.id === activeTab.value)
  return {
    left: `${index * 33.33}%`,
    width: '40px',
    transform: 'translateX(-50%)'
  }
})

// 模拟最近交易记录
const recentTrades = computed(() => {
  const trades = []
  const basePrice = coinData.value?.price || 100
  const now = new Date()
  
  for (let i = 0; i < 20; i++) {
    const time = new Date(now.getTime() - i * 60000)
    const priceChange = (Math.random() - 0.5) * 0.02
    const price = basePrice * (1 + priceChange)
    const amount = (Math.random() * 1000).toFixed(2)
    const type = Math.random() > 0.5 ? 'buy' : 'sell'
    
    trades.push({
      time: time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      price: price.toFixed(2),
      amount: amount,
      type: type
    })
  }
  
  return trades
})

const switchTab = (tabId) => {
  activeTab.value = tabId
}

const initChart = () => {
  if (chartRef.value) {
    chart.value = createChart(chartRef.value, {
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
        fontSize: 12,
      },
      grid: {
        vertLines: { 
          color: '#f0f0f0',
          style: 0,
        },
        horzLines: { 
          color: '#f0f0f0',
          style: 0,
        },
      },
      width: chartRef.value.clientWidth,
      height: 300,
      rightPriceScale: {
        borderColor: '#e0e0e0',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: '#e0e0e0',
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        barSpacing: 10,
        minBarSpacing: 5,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#667eea',
          labelBackgroundColor: '#667eea',
        },
        horzLine: {
          color: '#667eea',
          labelBackgroundColor: '#667eea',
        },
      },
      handleScroll: {
        vertTouchDrag: false,
      },
      localization: {
        locale: 'zh-CN',
      },
    })

    // 创建K线图系列
    candlestickSeries.value = chart.value.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      priceLineVisible: true, // 显示价格线
      lastValueVisible: true, // 显示最新价格标签
    })

    updateChartData()

    // 响应式调整大小
    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0 || entries[0].target !== chartRef.value) return
      const newRect = entries[0].contentRect
      chart.value.applyOptions({ 
        width: newRect.width,
        height: Math.max(300, newRect.height * 0.6) // 保持最小高度
      })
    })
    resizeObserver.observe(chartRef.value)
  }
}

const updateChartData = () => {
  if (!chart.value || !candlestickSeries.value) return

  const currentPrice = coinData.value?.price
  if (!currentPrice || currentPrice === 0) return

  const timeframeMinutes = {
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '30m': 1800,
    '1h': 3600,
    '4h': 14400,
    '1d': 86400
  }

  const intervalSeconds = timeframeMinutes[selectedTimeframe.value] || 300
  const dataPoints = 120
  
  const data = []
  const now = Math.floor(Date.now() / 1000)
  // 最后一根K线对齐到当前周期
  const lastTime = Math.floor(now / intervalSeconds) * intervalSeconds
  let currentTime = lastTime - (dataPoints - 1) * intervalSeconds
  
  // 基于当前价格生成历史K线
  let basePrice = currentPrice
  for (let i = 0; i < dataPoints; i++) {
    const open = basePrice
    const change = (Math.random() - 0.5) * (basePrice * 0.01)
    const close = open + change
    const high = Math.max(open, close) + Math.random() * (basePrice * 0.005)
    const low = Math.min(open, close) - Math.random() * (basePrice * 0.005)
    
    data.push({
      time: currentTime,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2))
    })
    
    basePrice = close
    currentTime += intervalSeconds
  }

  candlestickSeries.value.setData(data)
  chart.value.timeScale().fitContent()
}

// 更新最新价格点
const updateLastPrice = () => {
  if (!chart.value || !candlestickSeries.value) return
  
  const currentPrice = coinData.value?.price
  if (!currentPrice) return
  
  // K线图需要 OHLC 数据，这里简化处理
  const time = Math.floor(Date.now() / 1000)
  candlestickSeries.value.update({
    time: time,
    open: currentPrice,
    high: currentPrice * 1.001,
    low: currentPrice * 0.999,
    close: currentPrice
  })
}

// 切换时间周期
const changeTimeframe = (timeframe) => {
  selectedTimeframe.value = timeframe
  updateChartData()
}

const estimatedAmount = computed(() => {
  if (!coinData.value.price || !tradeAmount.value) return 0
  return coinData.value.price * tradeAmount.value
})

const setMaxAmount = () => {
  if (tradeType.value === 'buy') {
    // 买入：用余额 / 价格
    if (coinData.value.price && coinData.value.price > 0) {
      tradeAmount.value = parseFloat((userBalance.value / coinData.value.price).toFixed(4))
    }
  } else {
    // 卖出：用持仓（需要从 marketStore 获取）
    const holding = marketStore.holdings?.[symbol.value] || 0
    tradeAmount.value = holding
  }
}

const formatPrice = (price) => {
  if (!price) return '$--'
  if (price >= 1000) {
    return '$' + price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return '$' + price.toFixed(price >= 1 ? 2 : 5)
}

const handleBuy = () => {
  tradeType.value = 'buy'
  tradeAmount.value = 0
  showTradeModal.value = true
}

const handleSell = () => {
  tradeType.value = 'sell'
  tradeAmount.value = 0
  showTradeModal.value = true
}

const closeTradeModal = () => {
  showTradeModal.value = false
  tradeAmount.value = 0
}

const executeTrade = async () => {
  if (!coinData.value.price || !tradeAmount.value || tradeAmount.value <= 0) {
    showToast('请输入有效的交易数量', 'error')
    return
  }

  const amount = tradeAmount.value
  const price = coinData.value.price
  const totalCost = price * amount

  // ✅ 发送 WebSocket 请求到后端
  const result = executeTradeViaWS(symbol.value, tradeType.value, amount, price)
  
  if (!result.success) {
    showToast(result.error || '交易失败', 'error')
    return
  }
  
  showToast(`${tradeType.value === 'buy' ? '买入' : '卖出'}请求已发送`, 'info')
  
  closeTradeModal()
}

onMounted(() => {
  initChart()
})

onUnmounted(() => {
  chart.value?.remove()
})

// 监听当前币种的价格变化，实时更新K线
watch(() => coinData.value?.price, (newPrice) => {
  if (newPrice && candlestickSeries.value) {
    const timeframeMinutes = {
      '1m': 60,
      '5m': 300,
      '15m': 900,
      '30m': 1800,
      '1h': 3600,
      '4h': 14400,
      '1d': 86400
    }
    
    const intervalSeconds = timeframeMinutes[selectedTimeframe.value] || 300
    const now = Math.floor(Date.now() / 1000)
    // 对齐到当前时间周期
    const time = Math.floor(now / intervalSeconds) * intervalSeconds
    
    // 更新最后一根K线
    candlestickSeries.value.update({
      time: time,
      open: newPrice,
      high: newPrice * 1.002,
      low: newPrice * 0.998,
      close: newPrice
    })
  }
}, { deep: true })
</script>

<style scoped>
.trade-detail {
  min-height: 100vh;
  background-color: #f8f9fa;
  padding-top: 56px;
  padding-bottom: calc(80px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
}

/* 顶部标题栏 */
.header-section {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  font-size: 32px;
  cursor: pointer;
  margin-right: 12px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: background-color 0.2s;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.header-left:active {
  background-color: rgba(255, 255, 255, 0.2);
}

.header-title {
  flex: 1;
}

.header-title .coin-symbol {
  font-size: 18px;
  font-weight: 600;
  margin-right: 8px;
}

.header-title .coin-name {
  font-size: 14px;
  opacity: 0.8;
}

.header-right {
  text-align: right;
}

.header-right .coin-price {
  display: block;
  font-size: 18px;
  font-weight: 600;
}

.header-right .coin-change {
  font-size: 14px;
}

.header-right .coin-change.positive {
  color: #10b981;
}

.header-right .coin-change.negative {
  color: #ef4444;
}

.stats-section {
  padding: 16px;
  margin-bottom: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-card {
  background-color: #ffffff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: default;
  min-height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.stat-card:active {
  transform: scale(0.98);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}

.stat-label {
  font-size: 14px;
  color: #9ca3af;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 20px;
  font-weight: bold;
  color: #1f2937;
}

.tab-section {
  position: relative;
  background-color: #ffffff;
  border-radius: 12px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.tabs {
  display: flex;
  justify-content: space-around;
  padding: 4px 0;
  position: relative;
  z-index: 1;
}

.tab {
  font-size: 16px;
  color: #9ca3af;
  cursor: pointer;
  padding: 12px 16px;
  min-width: 80px;
  text-align: center;
  transition: all 0.3s;
  border-radius: 8px;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.tab:active {
  background-color: rgba(102, 126, 234, 0.1);
}

.tab.active {
  color: #1f2937;
  font-weight: 600;
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  height: 2px;
  background-color: #667eea;
  transition: left 0.3s ease;
  z-index: 2;
}

/* 时间周期选择器 */
.timeframe-section {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  flex-shrink: 0;
}

.timeframe-section::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

.timeframe-btn {
  flex-shrink: 0;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  background-color: #ffffff;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  min-width: 60px;
  text-align: center;
}

.timeframe-btn:active {
  transform: scale(0.95);
}

.timeframe-btn.active {
  color: #ffffff;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.content-section {
  flex: 1;
  overflow: hidden;
  padding: 0;
  min-height: 0;
}

.chart-wrapper {
  padding: 0 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 交易列表样式 */
.trades-list {
  background-color: #ffffff;
  border-radius: 12px;
  margin: 0 16px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 280px);
}

.trades-header {
  display: flex;
  padding: 12px 16px;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.trades-body {
  flex: 1;
  overflow-y: auto;
}

.trade-item {
  display: flex;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  transition: background-color 0.2s;
}

.trade-item:last-child {
  border-bottom: none;
}

.trade-item:active {
  background-color: #f9fafb;
}

.trade-col {
  flex: 1;
  text-align: center;
  font-size: 14px;
  color: #1f2937;
}

.trade-col.buy {
  color: #10b981;
  font-weight: 500;
}

.trade-col.sell {
  color: #ef4444;
  font-weight: 500;
}

/* 持币量样式 */
.holders-info {
  padding: 0 16px;
  max-height: calc(100vh - 280px);
  overflow-y: auto;
}

.holding-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 24px;
  color: #ffffff;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
  margin-bottom: 16px;
}

.holding-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.coin-icon {
  font-size: 32px;
  margin-right: 12px;
}

.holding-title {
  display: flex;
  flex-direction: column;
}

.holding-title .coin-symbol {
  font-size: 20px;
  font-weight: 600;
}

.holding-title .coin-name {
  font-size: 14px;
  opacity: 0.9;
}

.holding-amount {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 16px;
}

.amount-label {
  font-size: 14px;
  opacity: 0.9;
}

.amount-value {
  font-size: 24px;
  font-weight: 600;
}

.holding-value {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.value-label {
  font-size: 14px;
  opacity: 0.9;
}

.value-amount {
  font-size: 20px;
  font-weight: 600;
}

.balance-info {
  background-color: #ffffff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.balance-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.balance-label {
  font-size: 14px;
  color: #6b7280;
}

.balance-value {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.chart-container {
  flex: 1;
  min-height: 0;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  touch-action: pan-x;
}

.action-section {
  display: flex;
  gap: 16px;
  margin-top: 0;
  padding: 12px 16px;
  flex-shrink: 0;
  background-color: #f8f9fa;
}

.buy-btn, .sell-btn {
  flex: 1;
  height: 56px;
  border-radius: 12px;
  font-size: 18px;
  font-weight: bold;
  color: #ffffff;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.2s;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  position: relative;
  overflow: hidden;
}

.buy-btn {
  background-color: #4CAF50;
}

.sell-btn {
  background-color: #F44336;
}

.buy-btn::before, .sell-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.buy-btn:active::before, .sell-btn:active::before {
  width: 300px;
  height: 300px;
}

.buy-btn:active, .sell-btn:active {
  transform: scale(0.96);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

@media (min-width: 768px) {
  .chart-container {
    height: 400px;
  }
}

/* 交易弹窗样式 */
.trade-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-content {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}

.close-btn:active {
  color: #6b7280;
}

.trade-form {
  padding: 20px;
}

.input-group {
  margin-bottom: 16px;
}

.input-group label {
  display: block;
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 8px;
}

.input-wrapper {
  position: relative;
}

.input-wrapper input {
  width: 100%;
  padding: 12px 60px 12px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.input-wrapper input:focus {
  border-color: #667eea;
}

.max-btn {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: #9ca3af;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.max-btn:active {
  background: #6b7280;
  transform: translateY(-50%) scale(0.95);
}

.estimated-amount {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 12px;
}

.estimated-amount span {
  font-size: 14px;
  color: #6b7280;
}

.estimated-amount span:last-child {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.balance-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 20px;
}

.balance-info span {
  font-size: 14px;
  color: #6b7280;
}

.balance-info span:last-child {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.trade-btn {
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
}

.trade-btn.buy {
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
}

.trade-btn.sell {
  background: linear-gradient(135deg, #F44336 0%, #d32f2f 100%);
}

.trade-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.trade-btn:not(:disabled):active {
  transform: scale(0.98);
}
</style>