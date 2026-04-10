<template><div class="layout-container"><header class="layout-header"><div class="header-left"><div class="logo">📈</div><div class="nav-menu"><button class="nav-item active">行情</button><button class="nav-item">交易</button><button class="nav-item">资产</button><button class="nav-item">合约</button><button class="nav-item">期权</button></div></div><div class="header-right"><button class="header-btn">登录</button><button class="header-btn">注册</button></div></header><div class="layout-body"><aside class="sidebar"><div class="sidebar-header"><h3>币种</h3><div class="search-box"><input type="text" placeholder="搜索币种" class="search-input"></div></div><div class="sidebar-content"><div 
          v-for="coin in coins" 
          :key="coin.symbol"
          class="sidebar-item"
          :class="{ active: selectedCoin.symbol === coin.symbol }"
          @click="selectCoin(coin)"
        ><div class="coin-logo">{{ coin.symbol.charAt(0) }}</div><div class="coin-info"><span class="coin-name">{{ coin.name }}</span><span class="coin-symbol">{{ coin.symbol }}</span></div><div class="coin-price">{{ coin.price }}</div><div 
            :class="['coin-change', parseFloat(coin.change) > 0 ? 'positive' : 'negative']"
          >{{ parseFloat(coin.change) > 0 ? '+' : '' }}{{ coin.change }}%</div></div></div></aside><main class="main-content"><slot></slot></main></div></div></template><script>export default {
  name: 'Layout',
  data() {
    return {
      coins: [
        { symbol: 'BTC', name: 'Bitcoin', price: '68500.50', change: '2.5' },
        { symbol: 'ETH', name: 'Ethereum', price: '3500.75', change: '-1.2' },
        { symbol: 'BNB', name: 'Binance Coin', price: '580.20', change: '0.8' },
        { symbol: 'SOL', name: 'Solana', price: '120.45', change: '-0.5' },
        { symbol: 'ADA', name: 'Cardano', price: '0.52', change: '1.1' },
        { symbol: 'XRP', name: 'Ripple', price: '0.65', change: '0.3' },
        { symbol: 'DOT', name: 'Polkadot', price: '7.20', change: '-0.8' },
        { symbol: 'DOGE', name: 'Dogecoin', price: '0.08', change: '1.5' }
      ],
      selectedCoin: { symbol: 'BTC', name: 'Bitcoin', price: '68500.50', change: '2.5' }
    };
  },
  methods: {
    selectCoin(coin) {
      this.selectedCoin = coin;
      this.$emit('coin-selected', coin);
    }
  }
};</script><style scoped>.layout-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #0a0a0a;
  color: #ffffff;
}

.layout-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 30px;
  height: 60px;
  background: #111;
  border-bottom: 1px solid #2a2a2a;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 30px;
}

.logo {
  font-size: 24px;
  font-weight: bold;
}

.nav-menu {
  display: flex;
  gap: 20px;
}

.nav-item {
  padding: 8px 16px;
  background: transparent;
  border: none;
  color: #999;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  border-bottom: 2px solid transparent;
}

.nav-item:hover {
  color: #ffffff;
}

.nav-item.active {
  color: #ffffff;
  border-bottom: 2px solid #2196F3;
}

.header-right {
  display: flex;
  gap: 15px;
}

.header-btn {
  padding: 8px 20px;
  background: #2196F3;
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.header-btn:hover {
  background: #1976D2;
}

.layout-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 350px;
  background: #111;
  border-right: 1px solid #2a2a2a;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #2a2a2a;
}

.sidebar-header h3 {
  margin: 0 0 15px 0;
  font-size: 16px;
  font-weight: 600;
}

.search-box {
  position: relative;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 4px;
  color: #ffffff;
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: #2196F3;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
}

.sidebar-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid #1a1a1a;
  cursor: pointer;
  transition: all 0.2s;
}

.sidebar-item:hover {
  background: #1a1a1a;
}

.sidebar-item.active {
  background: #2a2a2a;
  border-left: 3px solid #2196F3;
}

.coin-logo {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2196F3, #1976D2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  color: white;
  margin-right: 12px;
}

.coin-info {
  flex: 2;
  min-width: 0;
}

.coin-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.coin-symbol {
  font-size: 12px;
  color: #666;
}

.coin-price {
  flex: 1;
  text-align: right;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}

.coin-change {
  flex: 1;
  text-align: right;
  font-size: 12px;
  font-weight: 500;
  margin-left: 10px;
}

.positive {
  color: #4CAF50;
}

.negative {
  color: #F44336;
}

.main-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: #0a0a0a;
}

@media (max-width: 1200px) {
  .sidebar {
    width: 300px;
  }
}

@media (max-width: 768px) {
  .layout-header {
    padding: 0 20px;
  }
  
  .nav-menu {
    gap: 15px;
  }
  
  .nav-item {
    padding: 6px 12px;
    font-size: 12px;
  }
  
  .sidebar {
    width: 250px;
  }
  
  .sidebar-item {
    padding: 10px 15px;
  }
}</style>