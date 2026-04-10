<template><div class="market-page"><div class="market-header"><div class="header-left"><div class="logo">✦ 行情</div><div class="sub-tabs"><button class="sub-tab active">币种</button><button class="sub-tab">现货交易</button></div></div><div class="header-right"><button class="header-btn">登录</button></div></div><div class="market-content"><div v-if="loading" class="loading-container"><div class="spinner"></div><p>加载中...</p></div><div v-else-if="error" class="error-container"><p>{{ error }}</p><button class="retry-btn" @click="fetchData">重试</button></div><div v-else><div class="controls-row"><div class="search-box"><input 
              type="text" 
              v-model="searchKeyword"
              placeholder="搜索币种" 
              class="search-input"
            ></div><div class="category-filter"><button 
              v-for="category in categories" 
              :key="category.value"
              :class="['category-btn', currentCategory === category.value ? 'active' : '']"
              @click="setCategory(category.value)"
            >{{ category.name }}</button></div></div><div class="coin-list-section"><h3>热门币种</h3><div class="coin-list"><div 
              v-for="coin in filteredCoins" 
              :key="coin.symbol"
              class="coin-item"
              :class="{ active: selectedCoin?.symbol === coin.symbol }"
              @click="selectCoin(coin)"
            ><div class="coin-info"><div class="coin-logo">{{ coin.symbol.charAt(0) }}</div><div><div class="coin-name">{{ coin.name }}</div><div class="coin-symbol">{{ coin.symbol }}</div></div></div><div class="coin-price-info"><div class="coin-price">{{ coin.price }}</div><div 
                  :class="['coin-change', parseFloat(coin.change) > 0 ? 'positive' : 'negative']"
                >{{ parseFloat(coin.change) > 0 ? '+' : '' }}{{ coin.change }}%</div></div></div></div></div></div></div></div></template><script>import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMarketStore } from '../stores/market'
import { COIN_CATEGORIES } from '../constants/market'

export default {
  name: 'Market',
  setup() {
    const store = useMarketStore()
    
    const loading = computed(() => store.loading)
    const error = computed(() => store.error)
    const coins = computed(() => store.coins)
    const selectedCoin = computed(() => store.selectedCoin)
    const filteredCoins = computed(() => store.filteredCoins)
    const searchKeyword = computed({
      get: () => store.searchKeyword,
      set: (value) => store.setSearchKeyword(value)
    })
    const currentCategory = computed({
      get: () => store.currentCategory,
      set: (value) => store.setCategory(value)
    })
    
    const categories = COIN_CATEGORIES
    
    const fetchData = async () => {
      await store.fetchCoinList()
    }
    
    const selectCoin = (coin) => {
      store.selectCoin(coin)
    }
    
    const setCategory = (category) => {
      store.setCategory(category)
    }
    
    onMounted(async () => {
      await fetchData()
      store.initWebSocket()
    })
    
    onUnmounted(() => {
      store.disconnectWebSocket()
    })
    
    return {
      loading,
      error,
      coins,
      selectedCoin,
      filteredCoins,
      searchKeyword,
      currentCategory,
      categories,
      fetchData,
      selectCoin,
      setCategory
    }
  }
}</script><style scoped>.market-page {
  min-height: 100vh;
  background: #0a0a0a;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.market-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #111;
  border-bottom: 1px solid #2a2a2a;
}

.header-left h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.sub-tabs {
  display: flex;
  gap: 20px;
  margin-top: 8px;
}

.sub-tab {
  padding: 6px 0;
  background: transparent;
  border: none;
  color: #999;
  font-size: 14px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.sub-tab:hover {
  color: #ffffff;
}

.sub-tab.active {
  color: #ffffff;
  border-bottom: 2px solid #2196F3;
}

.header-right .header-btn {
  padding: 8px 16px;
  background: #2196F3;
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 14px;
  cursor: pointer;
}

.market-content {
  padding: 20px;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-left-color: #2196F3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-container p {
  color: #F44336;
  margin-bottom: 16px;
}

.retry-btn {
  padding: 8px 16px;
  background: #2196F3;
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 14px;
  cursor: pointer;
}

.market-info {
  margin-bottom: 20px;
}

.coin-pair {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.price-section {
  display: flex;
  align-items: baseline;
  gap: 15px;
}

.current-price {
  font-size: 28px;
  font-weight: 700;
}

.price-change {
  font-size: 16px;
  font-weight: 500;
}

.price-change.positive {
  color: #4CAF50;
}

.price-change.negative {
  color: #F44336;
}

.chart-tabs {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
}

.chart-tab {
  padding: 8px 0;
  background: transparent;
  border: none;
  color: #999;
  font-size: 14px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.chart-tab:hover {
  color: #ffffff;
}

.chart-tab.active {
  color: #ffffff;
  border-bottom: 2px solid #2196F3;
}

.controls-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.search-box {
  width: 100%;
}

.search-input {
  width: 100%;
  padding: 10px 16px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  color: #ffffff;
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: #2196F3;
}

.category-filter {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.category-btn {
  padding: 6px 12px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 16px;
  color: #999;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}

.category-btn:hover {
  background: #2a2a2a;
  color: #ffffff;
}

.category-btn.active {
  background: #2196F3;
  color: white;
  border-color: #2196F3;
}

.timeframe-selector {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.timeframe-btn {
  padding: 6px 12px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 4px;
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
  height: 300px;
  margin-bottom: 30px;
  background: #111;
  border-radius: 8px;
  padding: 16px;
}

.chart-wrapper canvas {
  width: 100% !important;
  height: 100% !important;
}

.coin-list-section h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.coin-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.coin-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #111;
  border-radius: 8px;
  border: 1px solid #2a2a2a;
  cursor: pointer;
}

.coin-item:hover {
  border-color: #2196F3;
}

.coin-item.active {
  border-color: #2196F3;
  background: #1a1a1a;
}

.coin-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.coin-logo {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2196F3, #1976D2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  color: white;
}

.coin-name {
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
}

.coin-symbol {
  font-size: 12px;
  color: #666;
}

.coin-price-info {
  text-align: right;
}

.coin-price {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}

.coin-change {
  font-size: 12px;
  font-weight: 500;
  margin-top: 4px;
}

.coin-change.positive {
  color: #4CAF50;
}

.coin-change.negative {
  color: #F44336;
}

@media (min-width: 768px) {
  .market-content {
    max-width: 800px;
    margin: 0 auto;
  }
  
  .controls-row {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  
  .search-box {
    width: 300px;
  }
  
  .chart-wrapper {
    height: 400px;
  }
}</style>