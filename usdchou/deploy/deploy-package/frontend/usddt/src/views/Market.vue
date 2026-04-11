<template><div class="market-container"><!-- 头部导航 --><header class="header"><h1>实时行情</h1><div class="header-actions"><button class="action-btn">⚙️</button></div></header><!-- 内容区域 --><main class="content"><!-- 行情列表 --><div class="market-list"><div 
          v-for="coin in marketData" 
          :key="coin.symbol"
          class="market-item"
          @click="selectCoin(coin)"
        ><div class="coin-info"><div class="coin-symbol">{{ coin.symbol }}</div><div class="coin-name">{{ coin.name }}</div></div><div class="coin-price">{{ coin.price }}</div><div 
            :class="['coin-change', coin.change > 0 ? 'positive' : 'negative']"
          >{{ coin.change > 0 ? '+' : '' }}{{ coin.change }}%</div></div></div><!-- K线图表 --><div class="chart-container" v-if="selectedCoin"><div class="chart-header"><h3>{{ selectedCoin.name }} ({{ selectedCoin.symbol }})</h3><div class="chart-price">{{ selectedCoin.price }}</div></div><div class="chart-controls"><button 
            v-for="interval in intervals" 
            :key="interval"
            :class="['interval-btn', currentInterval === interval ? 'active' : '']"
            @click="changeInterval(interval)"
          >{{ interval }}</button></div><div id="chart" ref="chartRef"></div></div></main><!-- 底部导航 --><footer class="bottom-nav"><div class="nav-item" @click="navigate('/home')"><div class="nav-icon">💬</div><div class="nav-label">消息</div></div><div class="nav-item" @click="navigate('/contacts')"><div class="nav-icon">👥</div><div class="nav-label">联系人</div></div><div class="nav-item" @click="navigate('/wallet')"><div class="nav-icon">💰</div><div class="nav-label">钱包</div></div><div class="nav-item active" @click="navigate('/market')"><div class="nav-icon">📈</div><div class="nav-label">行情</div></div><div class="nav-item" @click="navigate('/profile')"><div class="nav-icon">👤</div><div class="nav-label">我的</div></div></footer></div></template><script setup>import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const router = useRouter()
const chartRef = ref(null)
let chart = null

// 市场数据
const marketData = ref([
  { symbol: 'BTC/USD', name: '比特币', price: '$68,452.34', change: 2.3 },
  { symbol: 'ETH/USD', name: '以太坊', price: '$3,421.67', change: -1.2 },
  { symbol: 'BNB/USD', name: '币安币', price: '$523.45', change: 0.8 },
  { symbol: 'SOL/USD', name: 'Solana', price: '$124.78', change: 5.6 },
  { symbol: 'ADA/USD', name: 'Cardano', price: '$0.54', change: -0.3 }
])

// 选中的币种
const selectedCoin = ref(null)

// 图表时间间隔
const intervals = ['1m', '5m', '15m', '1h', '4h', '1d']
const currentInterval = ref('1h')

// WebSocket连接
let ws = null

// 初始化WebSocket连接
const initWebSocket = () => {
  try {
    // 使用Bitstamp的WebSocket API
    ws = new WebSocket('wss://ws.bitstamp.net')
    
    ws.onopen = () => {
      console.log('WebSocket connected')
      // 订阅BTC/USD实时数据
      const subscribeMessage = {
        event: 'bts:subscribe',
        data: {
          channel: 'live_trades_btcusd'
        }
      }
      ws.send(JSON.stringify(subscribeMessage))
    }
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.event === 'trade') {
        updatePrice(data.data.price)
      }
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
    
    ws.onclose = () => {
      console.log('WebSocket disconnected')
    }
    
  } catch (error) {
    console.error('Failed to connect WebSocket:', error)
  }
}

// 更新价格
const updatePrice = (price) => {
  if (selectedCoin.value) {
    selectedCoin.value.price = `$${parseFloat(price).toLocaleString()}`
    updateChart(parseFloat(price))
  }
}

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return
  
  const ctx = chartRef.value.getContext('2d')
  
  // 生成模拟K线数据
  const generateMockData = () => {
    const data = []
    const labels = []
    let basePrice = 68000
    
    for (let i = 0; i< 20; i++) {
      const price = basePrice + (Math.random() - 0.5) * 1000
      basePrice = price
      data.push(price)
      labels.push(new Date(Date.now() - (20 - i) * 3600000).toLocaleTimeString())
    }
    
    return { data, labels }
  }
  
  const mockData = generateMockData()
  
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: mockData.labels,
      datasets: [{
        label: '价格 (USD)',
        data: mockData.data,
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 0
      },
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString()
            }
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return '$' + context.parsed.y.toLocaleString()
            }
          }
        }
      }
    }
  })
}

// 更新图表数据
const updateChart = (price) => {
  if (!chart) return
  
  // 添加新数据点
  chart.data.labels.push(new Date().toLocaleTimeString())
  chart.data.datasets[0].data.push(price)
  
  // 保持数据点数量
  if (chart.data.labels.length > 20) {
    chart.data.labels.shift()
    chart.data.datasets[0].data.shift()
  }
  
  chart.update()
}

// 选择币种
const selectCoin = (coin) => {
  selectedCoin.value = coin
  if (!chart) {
    initChart()
  }
}

// 切换时间间隔
const changeInterval = (interval) => {
  currentInterval.value = interval
  // 这里可以重新加载对应时间间隔的数据
}

// 导航
const navigate = (path) => {
  router.push(path)
}

onMounted(() =>{
  // 初始化WebSocket
  initWebSocket()
  
  // 默认选择第一个币种
  if (marketData.value.length > 0) {
    selectCoin(marketData.value[0])
  }
})

onUnmounted(() => {
  // 关闭WebSocket连接
  if (ws) {
    ws.close()
  }
  
  // 销毁图表
  if (chart) {
    chart.destroy()
  }
})</script><style scoped>.market-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
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

/* 行情列表 */
.market-list {
  margin-bottom: 30px;
}

.market-item {
  background: white;
  border-radius: 10px;
  padding: 15px 20px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.market-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.coin-info {
  display: flex;
  flex-direction: column;
}

.coin-symbol {
  font-weight: 600;
  font-size: 1rem;
}

.coin-name {
  font-size: 0.8rem;
  color: #666;
}

.coin-price {
  font-weight: 500;
  font-size: 1.1rem;
}

.coin-change {
  font-size: 0.9rem;
  font-weight: 500;
}

.coin-change.positive {
  color: #28a745;
}

.coin-change.negative {
  color: #dc3545;
}

/* K线图表 */
.chart-container {
  background: white;
  border-radius: 15px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chart-header h3 {
  color: #333;
  margin: 0;
}

.chart-price {
  font-size: 1.2rem;
  font-weight: 600;
  color: #667eea;
}

.chart-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.interval-btn {
  padding: 8px 16px;
  border: 1px solid #e0e0e0;
  background: white;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.3s ease;
}

.interval-btn:hover {
  background: #f5f7fa;
}

.interval-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

#chart {
  height: 400px;
  width: 100%;
}

/* 底部导航 */
.bottom-nav {
  background: white;
  border-top: 1px solid #e0e0e0;
  padding: 15px 10px;
  display: flex;
  justify-content: space-around;
  position: sticky;
  bottom: 0;
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
}</style>