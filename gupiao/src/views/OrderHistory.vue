<template><div class="order-history-page"><div class="order-header"><h1>交易记录</h1><div class="order-tabs"><button 
            :class="['order-tab', activeTab === 'all' ? 'active' : '']"
            @click="activeTab = 'all'"
          >全部</button><button 
            :class="['order-tab', activeTab === 'buy' ? 'active' : '']"
            @click="activeTab = 'buy'"
          >买入</button><button 
            :class="['order-tab', activeTab === 'sell' ? 'active' : '']"
            @click="activeTab = 'sell'"
          >卖出</button></div></div><div class="order-content"><div v-if="loading" class="loading-container"><div class="spinner"></div><p>加载中...</p></div><div v-else-if="orders.length === 0" class="empty-state"><p>暂无交易记录</p></div><div v-else class="order-list"><div 
          v-for="order in filteredOrders" 
          :key="order.id"
          class="order-item"
        ><div class="order-info"><div class="order-header-info"><div class="coin-symbol">{{ order.coin }}/USD</div><div 
              :class="['order-type', order.type]"
            >{{ order.type === 'buy' ? '买入' : '卖出' }}</div></div><div class="order-details"><div class="order-price">{{ order.price }} USD</div><div class="order-amount">{{ order.amount }} {{ order.coin }}</div><div class="order-time">{{ order.time }}</div></div></div><div class="order-status"><span class="status-tag">{{ order.status }}</span></div></div></div></div></div></template><script>import { ref, computed } from 'vue'

export default {
  name: 'OrderHistory',
  setup() {
    const loading = ref(false)
    const activeTab = ref('all')
    
    const orders = ref([
      {
        id: 1,
        coin: 'BTC',
        type: 'buy',
        price: '68500.50',
        amount: '0.001',
        time: '2026-04-06 14:30:22',
        status: '已成交'
      },
      {
        id: 2,
        coin: 'ETH',
        type: 'sell',
        price: '3500.75',
        amount: '0.05',
        time: '2026-04-06 13:15:45',
        status: '已成交'
      },
      {
        id: 3,
        coin: 'BTC',
        type: 'buy',
        price: '69200.00',
        amount: '0.0005',
        time: '2026-04-05 16:45:12',
        status: '已成交'
      },
      {
        id: 4,
        coin: 'SOL',
        type: 'sell',
        price: '120.45',
        amount: '2.5',
        time: '2026-04-05 11:20:33',
        status: '已成交'
      },
      {
        id: 5,
        coin: 'ETH',
        type: 'buy',
        price: '3450.00',
        amount: '0.03',
        time: '2026-04-04 18:05:17',
        status: '已成交'
      }
    ])
    
    const filteredOrders = computed(() => {
      if (activeTab.value === 'all') {
        return orders.value
      }
      return orders.value.filter(order => order.type === activeTab.value)
    })
    
    return {
      loading,
      activeTab,
      orders,
      filteredOrders
    }
  }
}</script><style scoped>.order-history-page {
  min-height: 100vh;
  background: #0a0a0a;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding-bottom: 60px;
}

.order-header {
  padding: 16px 20px;
  background: #111;
  border-bottom: 1px solid #2a2a2a;
}

.order-header h1 {
  margin: 0 0 16px 0;
  font-size: 20px;
  font-weight: 600;
}

.order-tabs {
  display: flex;
  gap: 8px;
}

.order-tab {
  flex: 1;
  padding: 8px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 6px;
  color: #999;
  font-size: 14px;
  cursor: pointer;
}

.order-tab:hover {
  background: #2a2a2a;
  color: #ffffff;
}

.order-tab.active {
  background: #2196F3;
  color: white;
  border-color: #2196F3;
}

.order-content {
  padding: 20px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
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

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #111;
  border-radius: 8px;
  border: 1px solid #2a2a2a;
}

.order-info {
  flex: 1;
}

.order-header-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.coin-symbol {
  font-size: 14px;
  font-weight: 600;
}

.order-type {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.order-type.buy {
  background: rgba(76, 175, 80, 0.2);
  color: #4CAF50;
}

.order-type.sell {
  background: rgba(244, 67, 54, 0.2);
  color: #F44336;
}

.order-details {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #999;
}

.order-price {
  font-weight: 500;
}

.order-amount {
  font-weight: 500;
}

.order-time {
  color: #666;
}

.order-status {
  margin-left: 16px;
}

.status-tag {
  padding: 4px 8px;
  background: rgba(33, 150, 243, 0.2);
  color: #2196F3;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}</style>