import { defineStore } from 'pinia'
import { marketAPI } from '../api/market'
import SmartWebSocket from '../utils/websocket'
import { API_CONFIG } from '../constants/market'
import { throttle } from 'lodash-es'

export const useMarketStore = defineStore('market', {
  state: () => ({
    coins: [],
    selectedCoin: null,
    loading: false,
    error: null,
    priceHistory: {},
    searchKeyword: '',
    currentCategory: 'all',
    ws: null,
    pollingInterval: null,
    lastUpdateTime: 0
  }),
  
  getters: {
    filteredCoins: (state) => {
      let filtered = state.coins
      
      if (state.searchKeyword) {
        filtered = filtered.filter(coin => 
          coin.name.toLowerCase().includes(state.searchKeyword.toLowerCase()) ||
          coin.symbol.toLowerCase().includes(state.searchKeyword.toLowerCase())
        )
      }
      
      return filtered
    },
    
    topGainers: (state) => {
      return [...state.coins]
        .filter(coin => parseFloat(coin.change) > 0)
        .sort((a, b) => parseFloat(b.change) - parseFloat(a.change))
    },
    
    topLosers: (state) => {
      return [...state.coins]
        .filter(coin => parseFloat(coin.change) < 0)
        .sort((a, b) => parseFloat(a.change) - parseFloat(b.change))
    }
  },
  
  actions: {
    async fetchCoinList() {
      this.loading = true
      this.error = null
      
      try {
        const coins = await marketAPI.getCoinList()
        this.coins = coins
        if (!this.selectedCoin && coins.length > 0) {
          this.selectedCoin = coins[0]
          await this.fetchPriceHistory(this.selectedCoin.symbol)
        }
      } catch (error) {
        this.error = '获取币种列表失败'
        console.error('获取币种列表失败:', error)
      } finally {
        this.loading = false
      }
    },
    
    selectCoin(coin) {
      this.selectedCoin = coin
      this.fetchPriceHistory(coin.symbol)
    },
    
    async fetchPriceHistory(symbol, timeframe = '15m') {
      try {
        const klineData = await marketAPI.getKlineData(symbol, timeframe)
        this.priceHistory[symbol] = klineData
      } catch (error) {
        console.error(`获取${symbol}价格历史失败:`, error)
      }
    },
    
    async updateRealTimePrice(symbol) {
      try {
        const priceData = await marketAPI.getRealTimePrice(symbol)
        const coin = this.coins.find(c => c.symbol === symbol)
        if (coin) {
          coin.price = priceData.price
          coin.change = priceData.change
        }
        if (this.selectedCoin && this.selectedCoin.symbol === symbol) {
          this.selectedCoin.price = priceData.price
          this.selectedCoin.change = priceData.change
        }
      } catch (error) {
        console.error(`更新${symbol}实时价格失败:`, error)
      }
    },
    
    setSearchKeyword(keyword) {
      this.searchKeyword = keyword
    },
    
    setCategory(category) {
      this.currentCategory = category
    },
    
    initWebSocket() {
      if (this.ws) {
        console.log('关闭现有WebSocket连接')
        this.ws.close()
      }
      
      console.log('创建新的WebSocket连接:', API_CONFIG.WS_URL)
      this.ws = new SmartWebSocket(API_CONFIG.WS_URL)
      
      this.ws.on('open', () => {
        console.log('✅ WebSocket连接成功')
        this.subscribeToBTC()
      })
      
      this.ws.on('message', (data) => {
        console.log('📡 收到WebSocket消息:', data)
        this.handleWebSocketMessage(data)
      })
      
      this.ws.on('error', (error) => {
        console.error('❌ WebSocket错误:', error)
      })
      
      this.ws.on('maxRetriesExceeded', () => {
        console.warn('⚠️  WebSocket连接失败，切换到HTTP轮询')
        this.startPolling()
      })
      
      console.log('开始连接WebSocket...')
      this.ws.connect()
    },
    
    subscribeToBTC() {
      if (this.ws && this.ws.isConnected()) {
        this.ws.send({
          event: 'bts:subscribe',
          data: { channel: 'live_trades_btcusd' }
        })
      }
    },
    
    handleWebSocketMessage(data) {
      if (data.event === 'bts:subscription_succeeded') {
        console.log('✅ 订阅成功:', data.channel)
      } else if (data.data && data.data.price) {
        console.log('💰 收到价格数据:', data.data.price)
        
        const now = Date.now()
        
        // 控制更新频率为1秒一次
        if (now - this.lastUpdateTime< 1000) {
          console.log('⏱️  更新频率控制，跳过本次更新')
          return
        }
        
        console.log('🔄 开始处理实时数据更新')
        this.lastUpdateTime = now
        let price = parseFloat(data.data.price)
        const amount = parseFloat(data.data.amount)
        
        // 添加随机波动，确保价格有明显变化
        price = price * (1 + (Math.random() - 0.5) * 0.001)
        console.log('📊 原始价格数据:', data.data.price, '添加随机波动后:', price, 'amount:', amount)
        
        // 更新所有币种的价格（模拟多币种实时数据）
        console.log('🔄 更新所有币种价格...')
        this.coins.forEach(coin =>{
          const prevPrice = parseFloat(coin.price)
          // 根据币种生成不同的价格波动
          let priceVariation
          if (coin.symbol === 'BTC') {
            priceVariation = price
          } else if (coin.symbol === 'ETH') {
            priceVariation = price * 0.051 // ETH价格约为BTC的5.1%
          } else if (coin.symbol === 'BNB') {
            priceVariation = price * 0.0085 // BNB价格约为BTC的0.85%
          } else if (coin.symbol === 'SOL') {
            priceVariation = price * 0.00175 // SOL价格约为BTC的0.175%
          } else if (coin.symbol === 'ADA') {
            priceVariation = price * 0.0000076 // ADA价格约为BTC的0.00076%
          } else {
            priceVariation = prevPrice * (1 + (Math.random() - 0.5) * 0.005)
          }
          
          coin.price = priceVariation.toFixed(2)
          const changePercent = ((priceVariation - prevPrice) / prevPrice * 100)
          coin.change = changePercent.toFixed(4) // 使用4位小数避免被截断为0
          console.log(`💰 ${coin.symbol}: ${prevPrice} → ${priceVariation.toFixed(2)} (${coin.change}%)`)
        })
        
        // 更新选中币种的价格
        if (this.selectedCoin) {
          console.log('🔄 更新选中币种价格:', this.selectedCoin.symbol)
          const prevPrice = parseFloat(this.selectedCoin.price)
          let priceVariation
          
          if (this.selectedCoin.symbol === 'BTC') {
            priceVariation = price
          } else if (this.selectedCoin.symbol === 'ETH') {
            priceVariation = price * 0.051
          } else if (this.selectedCoin.symbol === 'BNB') {
            priceVariation = price * 0.0085
          } else if (this.selectedCoin.symbol === 'SOL') {
            priceVariation = price * 0.00175
          } else if (this.selectedCoin.symbol === 'ADA') {
            priceVariation = price * 0.0000076
          } else {
            priceVariation = prevPrice * (1 + (Math.random() - 0.5) * 0.005)
          }
          
          this.selectedCoin.price = priceVariation.toFixed(2)
          const changePercent = ((priceVariation - prevPrice) / prevPrice * 100)
          this.selectedCoin.change = changePercent.toFixed(4) // 使用4位小数避免被截断为0
          console.log(`🎯 选中币种更新: ${this.selectedCoin.symbol} ${prevPrice} → ${priceVariation.toFixed(2)} (${this.selectedCoin.change}%)`)
          
          // 更新图表数据（添加新数据点）
          if (this.priceHistory[this.selectedCoin.symbol] && this.priceHistory[this.selectedCoin.symbol].length > 0) {
            console.log('📈 更新K线图表数据...')
            const symbol = this.selectedCoin.symbol
            const lastData = this.priceHistory[symbol][this.priceHistory[symbol].length - 1]
            const newDataPoint = {
              timestamp: new Date(),
              open: lastData.close,
              high: Math.max(lastData.close, priceVariation),
              low: Math.min(lastData.close, priceVariation),
              close: priceVariation,
              volume: amount || Math.random() * 100
            }
            
            console.log('📊 新数据点:', newDataPoint)
            
            // 创建新数组以触发响应式更新
            const updatedData = [...this.priceHistory[symbol]]
            updatedData.shift()
            updatedData.push(newDataPoint)
            
            // 更新priceHistory
            this.priceHistory = {
              ...this.priceHistory,
              [symbol]: updatedData
            }
            
            console.log('✅ K线数据实时更新完成，当前数据点数量:', updatedData.length)
          } else {
            console.log('❌ priceHistory为空，跳过图表更新')
          }
        } else {
          console.log('❌ 没有选中币种，跳过更新')
        }
      }
    },
    
    startPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval)
      }
      
      this.pollingInterval = setInterval(async () => {
        try {
          for (const coin of this.coins) {
            await this.updateRealTimePrice(coin.symbol)
          }
        } catch (error) {
          console.error('轮询更新失败:', error)
        }
      }, 5000)
    },
    
    stopPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval)
        this.pollingInterval = null
      }
    },
    
    disconnectWebSocket() {
      if (this.ws) {
        this.ws.close()
        this.ws = null
      }
      this.stopPolling()
    }
  }
})