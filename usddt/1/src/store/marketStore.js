import { defineStore } from 'pinia'

export const useMarketStore = defineStore('market', {
  state: () => ({
    marketData: [
      {
        symbol: 'BTC/USDT',
        name: '比特币',
        price: 67234.50,
        high24h: 67866.60,
        low24h: 66606.70,
        volume24h: 2098.04,
        volume24hValue: 1400000000,
        change24h: 2.3
      },
      {
        symbol: 'ETH/USDT',
        name: '以太坊',
        price: 3456.78,
        high24h: 3521.45,
        low24h: 3389.20,
        volume24h: 15678.90,
        volume24hValue: 540000000,
        change24h: -1.2
      },
      {
        symbol: 'SOL/USDT',
        name: '索拉纳',
        price: 108.45,
        high24h: 112.30,
        low24h: 105.60,
        volume24h: 234567.89,
        volume24hValue: 254000000,
        change24h: 4.5
      }
    ]
  }),
  getters: {
    getCoinBySymbol: (state) => (symbol) => {
      return state.marketData.find(coin => coin.symbol === symbol)
    }
  },
  actions: {
    updateCoinPrice(symbol, newPrice) {
      const coin = this.marketData.find(coin => coin.symbol === symbol)
      if (coin) {
        coin.price = newPrice
        coin.high24h = Math.max(coin.high24h, newPrice)
        coin.low24h = Math.min(coin.low24h, newPrice)
      }
    }
  }
})