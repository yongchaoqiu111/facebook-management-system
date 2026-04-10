export const WS_CONFIG = {
  RECONNECT_DELAY: 5000,
  MAX_RETRIES: 10,
  BASE_DELAY: 1000,
  MAX_DELAY: 30000
}

export const CHART_CONFIG = {
  MAX_DATA_POINTS: 50,
  UPDATE_INTERVAL: 1000
}

export const API_CONFIG = {
  BASE_URL: 'http://localhost:3001',
  WS_URL: 'ws://localhost:3001'
}

export const TIMEFRAMES = [
  { label: '1分', value: '1m' },
  { label: '5分', value: '5m' },
  { label: '15分', value: '15m' },
  { label: '1小时', value: '1h' },
  { label: '4小时', value: '4h' },
  { label: '1天', value: '1d' }
]

export const COIN_CATEGORIES = [
  { name: '全部', value: 'all' },
  { name: '主流币', value: 'main' },
  { name: '人工智能', value: 'ai' },
  { name: 'Solana', value: 'solana' },
  { name: 'RWA', value: 'rwa' }
]