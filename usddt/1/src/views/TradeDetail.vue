<template>
  <div class="trade-detail">
    <!-- 顶部统计区 -->
    <div class="stats-section">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">24小时最高</div>
          <div class="stat-value">${{ coinData?.high24h.toFixed(2) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">24小时最低</div>
          <div class="stat-value">${{ coinData?.low24h.toFixed(2) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">24小时量</div>
          <div class="stat-value">{{ coinData?.volume24h.toFixed(2) }} SOL</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">24小时额</div>
          <div class="stat-value">{{ formatVolume(coinData?.volume24hValue) }}</div>
        </div>
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

    <!-- 图表显示区 -->
    <div class="chart-section">
      <div id="price-chart" ref="chartRef" class="chart-container"></div>
    </div>

    <!-- 底部操作区 -->
    <div class="action-section">
      <button class="buy-btn" @click="handleBuy">买入</button>
      <button class="sell-btn" @click="handleSell">卖出</button>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useMarketStore } from '../store/marketStore'
import * as echarts from 'echarts'
import { initSocket } from '../socket.js'

export default {
  name: 'TradeDetail',
  props: {
    symbol: {
      type: String,
      default: 'SOL/USDT'
    }
  },
  setup(props) {
    const marketStore = useMarketStore()
    const chartRef = ref(null)
    const chart = ref(null)
    const activeTab = ref('chart')
    const tabWidth = ref(0)

    const tabs = [
      { id: 'chart', name: '图表' },
      { id: 'trades', name: '最新成交' },
      { id: 'holders', name: '持币量' }
    ]

    const coinData = computed(() => {
      return marketStore.getCoinBySymbol(props.symbol)
    })

    const indicatorStyle = computed(() => {
      const index = tabs.findIndex(tab => tab.id === activeTab.value)
      return {
        left: `${index * 33.33}%`,
        width: '40px',
        transform: 'translateX(-50%)'
      }
    })

    const formatVolume = (volume) => {
      if (!volume) return '0'
      if (volume >= 100000000) {
        return (volume / 100000000).toFixed(2) + '亿'
      } else if (volume >= 10000) {
        return (volume / 10000).toFixed(2) + '万'
      }
      return volume.toFixed(2)
    }

    const switchTab = (tabId) => {
      activeTab.value = tabId
    }

    const initChart = () => {
      if (chartRef.value) {
        chart.value = echarts.init(chartRef.value)
        updateChartData()
        window.addEventListener('resize', () => {
          chart.value?.resize()
        })
      }
    }

    const updateChartData = () => {
      if (!chart.value) return

      // 生成模拟数据
      const data = []
      const basePrice = coinData.value?.price || 108
      for (let i = 0; i < 120; i++) {
        const price = basePrice + (Math.random() - 0.5) * 10
        data.push([
          new Date(Date.now() - (120 - i) * 60000).getTime(),
          parseFloat(price.toFixed(2))
        ])
      }

      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross'
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'time',
          boundaryGap: false
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            formatter: '${value}'
          }
        },
        series: [
          {
            name: '价格',
            type: 'line',
            data: data,
            smooth: true,
            lineStyle: {
              color: '#667eea',
              width: 2
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                {
                  offset: 0,
                  color: 'rgba(102, 126, 234, 0.3)'
                },
                {
                  offset: 1,
                  color: 'rgba(102, 126, 234, 0.1)'
                }
              ])
            }
          }
        ]
      }

      chart.value.setOption(option)
    }

    const handleBuy = () => {
      console.log('买入操作')
      alert('买入功能开发中')
    }

    const handleSell = () => {
      console.log('卖出操作')
      alert('卖出功能开发中')
    }

    onMounted(() => {
      initChart()
      const socket = initSocket()
      socket.on('cryptoPriceUpdate', (data) => {
        if (data.symbol === props.symbol) {
          marketStore.updateCoinPrice(data.symbol, data.price)
          updateChartData()
        }
      })
    })

    onUnmounted(() => {
      chart.value?.dispose()
    })

    watch(() => props.symbol, () => {
      updateChartData()
    })

    return {
      coinData,
      chartRef,
      activeTab,
      tabs,
      indicatorStyle,
      switchTab,
      formatVolume,
      handleBuy,
      handleSell
    }
  }
}
</script>

<style scoped>
.trade-detail {
  min-height: 100dvh;
  background-color: #f8f9fa;
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  padding-top: calc(16px + env(safe-area-inset-top));
}

.stats-section {
  margin-bottom: 20px;
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
}

.tabs {
  display: flex;
  justify-content: space-around;
  padding: 16px 0;
  position: relative;
  z-index: 1;
}

.tab {
  font-size: 16px;
  color: #9ca3af;
  cursor: pointer;
  padding: 0 12px;
  transition: color 0.3s;
}

.tab.active {
  color: #1f2937;
  font-weight: 500;
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  height: 2px;
  background-color: #667eea;
  transition: left 0.3s ease;
  z-index: 2;
}

.chart-section {
  margin-bottom: 20px;
}

.chart-container {
  width: 100%;
  height: 300px;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.action-section {
  display: flex;
  gap: 16px;
  margin-top: auto;
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
  transition: transform 0.2s;
}

.buy-btn {
  background-color: #4CAF50;
}

.sell-btn {
  background-color: #F44336;
}

.buy-btn:active, .sell-btn:active {
  transform: scale(0.95);
}

@media (min-width: 768px) {
  .chart-container {
    height: 400px;
  }
}
</style>