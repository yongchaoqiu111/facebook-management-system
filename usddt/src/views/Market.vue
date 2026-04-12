<template>
  <div class="market-container page-container">
    <!-- 顶部宏观数据卡片 -->
    <div class="macro-card">
      <div class="macro-header">
        <span class="macro-title">宏观数据</span>
        <span class="macro-arrow">›</span>
      </div>
      
      <div class="macro-stats">
        <div class="macro-stat">
          <div class="stat-label">
            <span class="dot red"></span>市值
          </div>
          <div class="stat-value">{{ formatMarketCap(macroData.marketCap) }}</div>
          <div :class="['stat-change', macroData.marketCapChange >= 0 ? 'positive' : 'negative']">{{ formatPercent(macroData.marketCapChange) }}</div>
        </div>
        <div class="macro-stat">
          <div class="stat-label">
            <span class="dot gray"></span>成交量
          </div>
          <div class="stat-value">{{ formatVolume(macroData.volume) }}</div>
          <div :class="['stat-change', macroData.volumeChange >= 0 ? 'positive' : 'negative']">{{ formatPercent(macroData.volumeChange) }}</div>
        </div>
        <div class="macro-stat">
          <div class="stat-label">BTC 市值占比</div>
          <div class="stat-value">{{ macroData.btcDominance }}%</div>
        </div>
      </div>

      <!-- SVG 动画折线图 -->
      <div class="chart-container">
        <svg viewBox="0 0 500 120" class="line-chart">
          <!-- 柱状图背景 -->
          <g class="bar-bg">
            <rect v-for="i in 40" :key="i" :x="i * 12" y="30" width="4" height="90" fill="rgba(255,255,255,0.1)" rx="2"/>
          </g>
          
          <!-- 折线路径 -->
          <path 
            d="M 10,80 C 40,60 70,90 100,50 S 160,30 200,45 S 260,20 300,40 S 360,60 400,35 S 450,50 490,30" 
            fill="none" 
            stroke="#e94560" 
            stroke-width="3" 
            stroke-linecap="round"
            :stroke-dasharray="pathLength"
            :stroke-dashoffset="pathLength"
          >
            <animate 
              attributeName="stroke-dashoffset"
              :from="pathLength"
              to="0"
              dur="2.5s"
              fill="freeze"
              calcMode="linear"/>
          </path>
          
          <!-- 渐变填充 -->
          <path 
            d="M 10,80 C 40,60 70,90 100,50 S 160,30 200,45 S 260,20 300,40 S 360,60 400,35 S 450,50 490,30 L 490,120 L 10,120 Z" 
            fill="url(#chartGradient)"
            opacity="0.3"
          />
          
          <!-- 渐变定义 -->
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#e94560" stop-opacity="0.5"/>
              <stop offset="100%" stop-color="#e94560" stop-opacity="0"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>

    <!-- Tab 切换 -->
    <div class="tab-bar">
      <div class="tab-item active">币种</div>
      <div class="tab-item">现货交易</div>
    </div>

    <!-- 表头 -->
    <div class="list-header">
      <div class="header-left">
        <span>名称</span>
        <span class="sort-icon">⇅</span>
      </div>
      <div class="header-right">
        <span>最新价 | 24 小时涨跌幅</span>
        <span class="sort-icon">⇅</span>
      </div>
    </div>

    <!-- 行情列表 -->
    <div class="market-list">
      <div 
        v-for="coin in marketData" 
        :key="coin.symbol"
        class="market-item"
        @click="navigateToCoinDetail(coin.symbol)"
      >
        <div class="coin-left">
          <span class="star" :class="{ active: coin.starred }" @click.stop="toggleStar(coin)">★</span>
          <div class="coin-icon" :style="{ background: getCoinColor(coin.symbol) }">
            {{ getCoinIcon(coin.symbol) }}
          </div>
          <div class="coin-info">
            <div class="coin-symbol">{{ coin.symbol }}</div>
            <div class="coin-name">{{ coin.name }}</div>
          </div>
        </div>
        <div class="coin-right">
          <div class="coin-price">{{ formatPrice(coin.price) }}</div>
          <div :class="['coin-change', coin.change >= 0 ? 'positive' : 'negative']">
            {{ coin.formattedChange }}
          </div>
        </div>
      </div>
    </div>

    <!-- 交易弹窗 -->
    <div class="trade-modal" v-if="showModal" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ tradeType === 'buy' ? '买入' : '卖出' }}</h3>
          <button class="close-btn" @click="closeModal">✕</button>
        </div>

        <!-- 币种选择器 - 可上下滑动 -->
        <div class="coin-selector">
          <div 
            v-for="coin in marketData" 
            :key="coin.symbol"
            :class="['selector-item', { active: selectedCoin?.symbol === coin.symbol }]"
            @click="selectCoin(coin)"
          >
            <div class="selector-left">
              <div class="coin-icon-small" :style="{ background: getCoinColor(coin.symbol) }">
                {{ getCoinIcon(coin.symbol) }}
              </div>
              <div class="selector-info">
                <div class="selector-symbol">{{ coin.symbol }}</div>
                <div class="selector-name">{{ coin.name }}</div>
              </div>
            </div>
            <div class="selector-right">
              <div class="selector-price">{{ formatPrice(coin.price) }}</div>
              <div :class="['selector-change', coin.change >= 0 ? 'positive' : 'negative']">
                {{ coin.formattedChange }}
              </div>
            </div>
          </div>
        </div>

        <div class="current-price" v-if="selectedCoin">
          <div class="price-label">当前价格</div>
          <div class="price-value">{{ formatPrice(selectedCoin.price) }}</div>
          <div :class="['price-change', selectedCoin.change >= 0 ? 'positive' : 'negative']">
            {{ selectedCoin.formattedChange }}
          </div>
        </div>

        <div class="trade-form" v-if="selectedCoin">
          <div class="trade-type-selector">
            <button 
              :class="['type-btn', tradeType === 'buy' ? 'active buy' : '']"
              @click="tradeType = 'buy'"
            >买入</button>
            <button 
              :class="['type-btn', tradeType === 'sell' ? 'active sell' : '']"
              @click="tradeType = 'sell'"
            >卖出</button>
          </div>

          <div class="input-group">
            <label>数量</label>
            <input 
              type="number" 
              v-model.number="tradeAmount" 
              placeholder="请输入数量"
              min="0"
              step="0.0001"
            />
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
            {{ tradeType === 'buy' ? '买入' : '卖出' }} {{ selectedCoin.symbol }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMarketStore } from '@/stores/marketStore'
import { showToast } from '@/utils/toast'
import { macroAPI } from '@/api'

const router = useRouter()
const marketStore = useMarketStore()
const { marketData, holdings, initWebSocketListener, updateHolding, getTotalHoldingValue, executeTrade: executeTradeViaWS } = marketStore

// 宏观数据
const macroData = ref({
  marketCap: 0,
  volume: 0,
  btcDominance: 57.2,
  marketCapChange: 0,
  volumeChange: 0,
  priceHistory: []
})

// 加载状态
const loading = ref(false)

const userBalance = ref(parseFloat(localStorage.getItem('userBalance') || '10000'))
const showModal = ref(false)
const selectedCoin = ref(null)
const tradeType = ref('buy')
const tradeAmount = ref(0)

const totalHoldingValue = computed(() => getTotalHoldingValue.value)
const estimatedAmount = computed(() => {
  if (!selectedCoin.value || !tradeAmount.value) return 0
  return selectedCoin.value.price * tradeAmount.value
})

const getCoinIcon = (symbol) => {
  const icons = {
    BTC: '₿',
    ETH: 'Ξ',
    BNB: '🔶',
    SOL: '◎',
    XRP: '✕'
  }
  return icons[symbol] || '💎'
}

const getCoinColor = (symbol) => {
  const colors = {
    BTC: 'linear-gradient(135deg, #f7931a 0%, #e8850f 100%)',
    ETH: 'linear-gradient(135deg, #627eea 0%, #4a63d2 100%)',
    BNB: 'linear-gradient(135deg, #f3ba2f 0%, #d4a017 100%)',
    SOL: 'linear-gradient(135deg, #00ffa3 0%, #00d488 100%)',
    XRP: 'linear-gradient(135deg, #23292f 0%, #000000 100%)'
  }
  return colors[symbol] || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
}

// 获取宏观数据
const fetchMacroData = async () => {
  loading.value = true
  try {
    const response = await macroAPI.getMacroData()
    if (response) {
      macroData.value = response
      console.log('📊 [Market] 宏观数据已加载:', macroData.value)
    }
  } catch (error) {
    console.error('❌ [Market] 获取宏观数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 格式化价格
const formatPrice = (price) => {
  if (!price) return '$--'
  if (price >= 1000) {
    return '$' + price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return '$' + price.toFixed(price >= 1 ? 2 : 5)
}

// 格式化市值（万亿/亿）
const formatMarketCap = (value) => {
  if (!value) return '$--'
  if (value >= 1e12) {
    return '$' + (value / 1e12).toFixed(2) + '万亿'
  } else if (value >= 1e8) {
    return '$' + (value / 1e8).toFixed(2) + '亿'
  }
  return '$' + value.toLocaleString()
}

// 格式化成交量（亿/万）
const formatVolume = (value) => {
  if (!value) return '$--'
  if (value >= 1e8) {
    return '$' + (value / 1e8).toFixed(2) + '亿'
  } else if (value >= 1e4) {
    return '$' + (value / 1e4).toFixed(2) + '万'
  }
  return '$' + value.toLocaleString()
}

// 格式化百分比
const formatPercent = (value) => {
  if (!value && value !== 0) return '--'
  const sign = value >= 0 ? '+' : ''
  return sign + value.toFixed(2) + '%'
}

const toggleStar = (coin) => {
  coin.starred = !coin.starred
}

const navigateToCoinDetail = (symbol) => {
  router.push(`/market/coin/${symbol}`)
}

const showTradeModal = (coin) => {
  selectedCoin.value = coin || marketData.value[0]
  tradeType.value = 'buy'
  tradeAmount.value = 0
  showModal.value = true
}

const selectCoin = (coin) => {
  selectedCoin.value = coin
}

const closeModal = () => {
  showModal.value = false
  selectedCoin.value = null
  tradeAmount.value = 0
}

const executeTrade = async () => {
  if (!selectedCoin.value || !tradeAmount.value || tradeAmount.value <= 0) {
    showToast('请输入有效的交易数量', 'error')
    return
  }

  const coin = selectedCoin.value
  const amount = tradeAmount.value

  // 通过 WebSocket 执行交易
  executeTradeViaWS(coin.symbol, tradeType.value, amount, coin.price)
  
  showToast(`交易请求已发送: ${tradeType.value === 'buy' ? '买入' : '卖出'} ${amount} ${coin.symbol}`, 'success')
  
  closeModal()
}

// 使用后端返回的价格历史生成 SVG 路径
const pricePath = computed(() => {
  const history = macroData.value.priceHistory || []
  if (history.length < 2) return { line: '', fill: '' }
  
  const width = 500
  const height = 120
  const padding = 10
  const step = (width - padding * 2) / (history.length - 1)
  
  const min = Math.min(...history)
  const max = Math.max(...history)
  const range = max - min || 1
  
  const points = history.map((price, i) => {
    const x = padding + i * step
    const y = height - padding - ((price - min) / range) * (height - padding * 2)
    return `${x},${y}`
  })
  
  const linePath = `M ${points.join(' L ')}`
  const fillPath = `${linePath} L ${width - padding},120 L ${padding},120 Z`
  
  return { line: linePath, fill: fillPath }
})

// 计算路径长度（用于动画）
const pathLength = computed(() => {
  // 贝塞尔曲线路径的估算长度
  return 800
})

onMounted(() => {
  console.log('✅ [Market] 页面已挂载')
  initWebSocketListener()
  fetchMacroData()
})
</script>

<style scoped>
.market-container {
  min-height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding-top: calc(56px + env(safe-area-inset-top));
  padding-bottom: calc(60px + env(safe-area-inset-bottom));
}

/* 宏观数据卡片 */
.macro-card {
  margin: 16px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.macro-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.macro-title {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.macro-arrow {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.6);
}

.macro-stats {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
}

.macro-stat {
  flex: 1;
}

.stat-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.dot.red {
  background: #e94560;
}

.dot.gray {
  background: #666;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
}

.stat-change {
  font-size: 13px;
  font-weight: 500;
}

.stat-change.negative {
  color: #ef4444;
}

.stat-change.positive {
  color: #10b981;
}

/* SVG 折线图 */
.chart-container {
  margin-top: 8px;
  border-radius: 12px;
  overflow: hidden;
}

.line-chart {
  width: 100%;
  height: 120px;
}

/* Tab 切换 */
.tab-bar {
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.tab-item {
  padding: 12px 16px;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  position: relative;
}

.tab-item.active {
  color: #fff;
  font-weight: 600;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 16px;
  right: 16px;
  height: 2px;
  background: #fff;
}

.tab-item.search-icon {
  margin-left: auto;
  font-size: 20px;
}

/* 分类标签 */
.category-tags {
  display: flex;
  gap: 10px;
  padding: 16px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.category-tags::-webkit-scrollbar {
  display: none;
}

.tag {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.3s;
}

.tag.active {
  background: rgba(255, 255, 255, 0.9);
  color: #667eea;
}

.tag.more {
  background: transparent;
  color: #666;
  font-size: 18px;
  padding: 8px 12px;
}

/* 表头 */
.list-header {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sort-icon {
  font-size: 12px;
}

/* 行情列表 */
.market-list {
  padding: 0 16px 100px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  height: calc(100vh - 420px);
}

.market-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  cursor: pointer;
  transition: background 0.2s;
}

.market-item:active {
  background: rgba(255, 255, 255, 0.1);
}

.coin-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.star {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: color 0.2s;
}

.star.active {
  color: #f3ba2f;
}

.coin-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #fff;
}

.coin-info {
  display: flex;
  flex-direction: column;
}

.coin-symbol {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.coin-name {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 2px;
}

.coin-right {
  text-align: right;
}

.coin-price {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
}

.coin-change {
  font-size: 14px;
  font-weight: 500;
}

.coin-change.positive {
  color: #10b981;
}

.coin-change.negative {
  color: #ef4444;
}

/* 交易弹窗 */
.trade-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.modal-content {
  background: #1a1a1a;
  border-radius: 24px 24px 0 0;
  padding: 24px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease-out;
}

/* 币种选择器 - 可上下滑动 */
.coin-selector {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 20px;
  border-radius: 12px;
  background: #222;
  -webkit-overflow-scrolling: touch;
}

.selector-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #333;
  cursor: pointer;
  transition: background 0.2s;
}

.selector-item:last-child {
  border-bottom: none;
}

.selector-item.active {
  background: rgba(102, 126, 234, 0.2);
}

.selector-item:active {
  background: rgba(255, 255, 255, 0.1);
}

.selector-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.coin-icon-small {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #fff;
}

.selector-info {
  display: flex;
  flex-direction: column;
}

.selector-symbol {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
}

.selector-name {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 2px;
}

.selector-right {
  text-align: right;
}

.selector-price {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 2px;
}

.selector-change {
  font-size: 13px;
  font-weight: 500;
}

.selector-change.positive {
  color: #10b981;
}

.selector-change.negative {
  color: #ef4444;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #fff;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #666;
  cursor: pointer;
}

.current-price {
  text-align: center;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  margin-bottom: 20px;
}

.price-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  margin-bottom: 8px;
}

.price-value {
  color: white;
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 8px;
}

.price-change {
  color: white;
  font-size: 16px;
  font-weight: 500;
}

.trade-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.trade-type-selector {
  display: flex;
  gap: 12px;
}

.type-btn {
  flex: 1;
  padding: 12px;
  border: 2px solid #333;
  background: #1a1a1a;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  color: #fff;
  cursor: pointer;
  transition: all 0.3s;
}

.type-btn.active.buy {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-color: #10b981;
  color: white;
}

.type-btn.active.sell {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border-color: #ef4444;
  color: white;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group label {
  font-size: 14px;
  color: #888;
}

.input-group input {
  padding: 12px;
  border: 2px solid #333;
  border-radius: 12px;
  font-size: 16px;
  background: #1a1a1a;
  color: #fff;
  outline: none;
  transition: border-color 0.3s;
}

.input-group input:focus {
  border-color: #667eea;
}

.estimated-amount, .balance-info {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  background: #222;
  border-radius: 12px;
  font-size: 14px;
  color: #888;
}

.estimated-amount span:last-child, .balance-info span:last-child {
  font-weight: bold;
  color: #fff;
}

.trade-btn {
  padding: 16px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: bold;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
}

.trade-btn.buy {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.trade-btn.sell {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.trade-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.trade-btn:active:not(:disabled) {
  transform: scale(0.98);
}
</style>
