/**
 * 本地缓存管理工具
 * 优先从 localStorage 读取，没有才请求 API
 */

/**
 * 获取好友ID数组
 * @param {Function} apiFetch - API 请求函数（可选）
 * @returns {Promise<Array>} 好友ID数组
 */
export async function getFriendIds(apiFetch = null) {
  // 1. 先尝试从 localStorage 读取
  const cached = localStorage.getItem('friendIds')
  if (cached) {
    try {
      const friendIds = JSON.parse(cached)
      console.log('📦 从缓存读取好友列表:', friendIds)
      return friendIds
    } catch (e) {
      console.error('解析好友缓存失败:', e)
    }
  }

  // 2. 缓存不存在，调用 API
  if (apiFetch) {
    try {
      const response = await apiFetch()
      const friendIds = response.data || response || []
      
      // 保存到缓存
      localStorage.setItem('friendIds', JSON.stringify(friendIds))
      console.log('🌐 从 API 获取好友列表并缓存:', friendIds)
      
      return friendIds
    } catch (err) {
      console.error('获取好友列表失败:', err)
      return []
    }
  }

  return []
}

/**
 * 获取多币种余额
 * @param {Function} apiFetch - API 请求函数（可选）
 * @returns {Object} 币种余额对象
 */
export async function getBalances(apiFetch = null) {
  // 1. 先尝试从 localStorage 读取
  const cached = localStorage.getItem('balances')
  if (cached) {
    try {
      const balances = JSON.parse(cached)
      console.log('📦 从缓存读取余额:', balances)
      return balances
    } catch (e) {
      console.error('解析余额缓存失败:', e)
    }
  }

  // 2. 缓存不存在，调用 API
  if (apiFetch) {
    try {
      const response = await apiFetch()
      const balances = response.data || response || {}
      
      // 保存到缓存
      localStorage.setItem('balances', JSON.stringify(balances))
      console.log('🌐 从 API 获取余额并缓存:', balances)
      
      return balances
    } catch (err) {
      console.error('获取余额失败:', err)
      return getDefaultBalances()
    }
  }

  return getDefaultBalances()
}

/**
 * 获取默认余额（全0）
 */
function getDefaultBalances() {
  return {
    btcBalance: 0,
    ethBalance: 0,
    bnbBalance: 0,
    solBalance: 0,
    xrpBalance: 0
  }
}

/**
 * 更新单个币种余额
 * @param {string} symbol - 币种符号（如 'BTC'）
 * @param {number} amount - 余额
 */
export function updateBalance(symbol, amount) {
  const keyMap = {
    'BTC': 'btcBalance',
    'ETH': 'ethBalance',
    'BNB': 'bnbBalance',
    'SOL': 'solBalance',
    'XRP': 'xrpBalance'
  }
  
  const balanceKey = keyMap[symbol.toUpperCase()]
  if (!balanceKey) {
    console.warn(`不支持的币种: ${symbol}`)
    return
  }

  // 读取当前余额
  const balances = getBalancesSync()
  balances[balanceKey] = parseFloat(amount.toFixed(8))
  
  // 保存回 localStorage
  localStorage.setItem('balances', JSON.stringify(balances))
  console.log(`💰 更新 ${symbol} 余额:`, amount)
}

/**
 * 同步获取余额（不等待 API）
 */
export function getBalancesSync() {
  const cached = localStorage.getItem('balances')
  if (cached) {
    try {
      return JSON.parse(cached)
    } catch (e) {
      console.error('解析余额缓存失败:', e)
    }
  }
  return getDefaultBalances()
}

/**
 * 清除所有缓存
 */
export function clearCache() {
  localStorage.removeItem('friendIds')
  localStorage.removeItem('balances')
  console.log('🗑️ 已清除缓存')
}
