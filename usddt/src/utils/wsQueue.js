/**
 * WebSocket 数据持久化队列管理器
 * 策略：收到数据立即更新 Store，异步批量写入 IndexedDB
 */

import { saveMessages, saveTradeRecords } from '@/utils/chatStorage'

// 队列配置
const QUEUE_CONFIG = {
  batchSize: 10,        // 每批保存10条
  flushInterval: 2000,  // 每2秒刷新一次
  maxRetries: 3         // 最大重试次数
}

// 队列状态
const queues = {
  messages: [],      // 消息队列
  trades: [],        // 交易记录队列
  redPackets: []     // 红包队列
}

let flushTimers = {}
let isFlushing = {}

/**
 * 添加到消息队列
 * @param {Object} message - 消息对象
 */
export function queueMessage(message) {
  queues.messages.push(message)
  scheduleFlush('messages')
  console.log(`📥 [Queue] 消息入队: ${message.id}, 队列长度: ${queues.messages.length}`)
}

/**
 * 批量添加消息到队列
 * @param {Array} messages - 消息数组
 */
export function queueMessages(messages) {
  queues.messages.push(...messages)
  scheduleFlush('messages')
  console.log(`📥 [Queue] ${messages.length} 条消息入队, 队列长度: ${queues.messages.length}`)
}

/**
 * 添加到交易记录队列
 * @param {Object} trade - 交易记录对象
 */
export function queueTrade(trade) {
  queues.trades.push(trade)
  scheduleFlush('trades')
  console.log(`📥 [Queue] 交易记录入队: ${trade.id}, 队列长度: ${queues.trades.length}`)
}

/**
 * 批量添加交易记录到队列
 * @param {Array} trades - 交易记录数组
 */
export function queueTrades(trades) {
  queues.trades.push(...trades)
  scheduleFlush('trades')
  console.log(`📥 [Queue] ${trades.length} 条交易记录入队, 队列长度: ${queues.trades.length}`)
}

/**
 * 添加到红包队列
 * @param {Object} redPacket - 红包对象
 */
export function queueRedPacket(redPacket) {
  queues.redPackets.push(redPacket)
  scheduleFlush('redPackets')
  console.log(`📥 [Queue] 红包入队: ${redPacket.redPacketId}, 队列长度: ${queues.redPackets.length}`)
}

/**
 * 安排刷新（防抖）
 * @param {string} queueName - 队列名称
 */
function scheduleFlush(queueName) {
  // 清除之前的定时器
  if (flushTimers[queueName]) {
    clearTimeout(flushTimers[queueName])
  }
  
  // 设置新的定时器
  flushTimers[queueName] = setTimeout(() => {
    flushQueue(queueName)
  }, QUEUE_CONFIG.flushInterval)
}

/**
 * 刷新队列（批量保存）
 * @param {string} queueName - 队列名称
 */
async function flushQueue(queueName) {
  // 防止重复刷新
  if (isFlushing[queueName]) {
    console.log(`⏳ [Queue] ${queueName} 正在保存，跳过`)
    return
  }
  
  const queue = queues[queueName]
  
  // 队列为空，无需保存
  if (queue.length === 0) {
    return
  }
  
  isFlushing[queueName] = true
  
  try {
    // 取出一批数据
    const batch = queue.splice(0, QUEUE_CONFIG.batchSize)
    
    console.log(`💾 [Queue] 开始保存 ${queueName}: ${batch.length} 条`)
    
    // 根据类型保存到 IndexedDB
    let success = false
    let retries = 0
    
    while (!success && retries < QUEUE_CONFIG.maxRetries) {
      try {
        if (queueName === 'messages') {
          await saveMessages(batch)
        } else if (queueName === 'trades') {
          await saveTradeRecords(batch)
        } else if (queueName === 'redPackets') {
          // TODO: 实现红包保存
          console.warn('⚠️ 红包保存未实现')
        }
        
        success = true
        console.log(`✅ [Queue] ${queueName} 保存成功: ${batch.length} 条`)
      } catch (error) {
        retries++
        console.error(`❌ [Queue] ${queueName} 保存失败 (重试 ${retries}/${QUEUE_CONFIG.maxRetries}):`, error)
        
        if (retries >= QUEUE_CONFIG.maxRetries) {
          // 重试失败，将数据放回队列头部
          queue.unshift(...batch)
          console.error(`❌ [Queue] ${queueName} 保存失败，已放回队列`)
        } else {
          // 等待后重试
          await new Promise(resolve => setTimeout(resolve, 1000 * retries))
        }
      }
    }
  } finally {
    isFlushing[queueName] = false
    
    // 如果队列还有数据，继续刷新
    if (queues[queueName].length > 0) {
      scheduleFlush(queueName)
    }
  }
}

/**
 * 强制刷新所有队列
 */
export async function flushAllQueues() {
  console.log('🔄 [Queue] 强制刷新所有队列')
  
  for (const queueName of Object.keys(queues)) {
    // 清除定时器
    if (flushTimers[queueName]) {
      clearTimeout(flushTimers[queueName])
      flushTimers[queueName] = null
    }
    
    // 立即刷新
    if (queues[queueName].length > 0) {
      await flushQueue(queueName)
    }
  }
  
  console.log('✅ [Queue] 所有队列已刷新')
}

/**
 * 获取队列状态
 * @returns {Object} 队列状态
 */
export function getQueueStatus() {
  return {
    messages: queues.messages.length,
    trades: queues.trades.length,
    redPackets: queues.redPackets.length,
    total: queues.messages.length + queues.trades.length + queues.redPackets.length
  }
}

/**
 * 清空所有队列（退出登录时调用）
 */
export function clearAllQueues() {
  // 清除所有定时器
  for (const queueName of Object.keys(flushTimers)) {
    if (flushTimers[queueName]) {
      clearTimeout(flushTimers[queueName])
      flushTimers[queueName] = null
    }
  }
  
  // 清空队列
  queues.messages = []
  queues.trades = []
  queues.redPackets = []
  
  console.log('🗑️ [Queue] 所有队列已清空')
}

// 页面卸载时自动刷新
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    flushAllQueues()
  })
  
  // 网络断开时刷新
  window.addEventListener('offline', () => {
    console.log('📡 [Queue] 网络断开，强制刷新队列')
    flushAllQueues()
  })
}
