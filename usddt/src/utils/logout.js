/**
 * 退出登录清理工具
 * 清理 localStorage 和 IndexedDB 的所有用户数据
 */

import { clearAllQueues } from './wsQueue'
import { getDB } from './chatStorage'

const DB_NAME = 'ChatMessagesDB'

/**
 * 清理 localStorage
 */
function clearLocalStorage() {
  const keysToRemove = [
    'token',
    'userId',
    'user',
    'tokenExpiresAt',
    'friendIds',
    'balances',
    'cryptoHoldings',
    'userBalance',
    'walletInfo',  // 🆕 钱包信息
    'depositAddress'  // 🆕 充值地址
  ]
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key)
  })
  
  console.log('🗑️ [Cleanup] localStorage 已清理')
}

/**
 * 清理 IndexedDB
 */
async function clearIndexedDB() {
  try {
    const db = await getDB()
    
    // 获取所有对象存储名称
    const storeNames = Array.from(db.objectStoreNames)
    
    // 清空每个存储
    for (const storeName of storeNames) {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      await store.clear()
      console.log(`🗑️ [Cleanup] IndexedDB ${storeName} 已清空`)
    }
    
    console.log('🗑️ [Cleanup] IndexedDB 已清理')
  } catch (error) {
    console.error('❌ [Cleanup] IndexedDB 清理失败:', error)
  }
}

/**
 * 清理 Pinia Store（通过刷新页面实现）
 */
function clearStores() {
  // Pinia Store 在页面刷新后会自动重置
  console.log('🗑️ [Cleanup] Stores 将在页面刷新后重置')
}

/**
 * 执行完整清理
 */
export async function logoutCleanup() {
  console.log('🚪 [Logout] 开始清理用户数据...')
  
  // 1. 清空 WebSocket 队列
  clearAllQueues()
  
  // 2. 清理 localStorage
  clearLocalStorage()
  
  // 3. 清理 IndexedDB
  await clearIndexedDB()
  
  // 4. 清理 Stores（通过刷新页面）
  clearStores()
  
  console.log('✅ [Logout] 所有数据已清理')
}

/**
 * 仅清理聊天相关数据（切换账号时可用）
 */
export async function clearChatData() {
  console.log('🧹 [Cleanup] 开始清理聊天数据...')
  
  // 清空队列
  clearAllQueues()
  
  // 清理 IndexedDB 中的聊天相关数据
  try {
    const db = await getDB()
    const chatStores = ['messages', 'redPackets']
    
    for (const storeName of chatStores) {
      if (db.objectStoreNames.contains(storeName)) {
        const tx = db.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        await store.clear()
        console.log(`🗑️ [Cleanup] ${storeName} 已清空`)
      }
    }
  } catch (error) {
    console.error('❌ [Cleanup] 聊天数据清理失败:', error)
  }
  
  console.log('✅ [Cleanup] 聊天数据已清理')
}
