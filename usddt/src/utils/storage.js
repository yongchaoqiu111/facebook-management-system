/**
 * 🐉 本地存储工具模块
 * 封装所有 localStorage 相关操作
 */

// ==================== 聊天记录存储 ====================

/**
 * 从本地存储加载聊天记录
 * @param {string} chatId - 聊天ID
 * @returns {Array|null} 消息列表
 */
export const loadChatHistory = (chatId) => {
  const key = `chat_history_${chatId}`
  console.log('📂 从 localStorage 加载, key:', key)
  const savedMessages = localStorage.getItem(key)
  if (savedMessages) {
    console.log('✅ 找到本地数据, 消息数:', JSON.parse(savedMessages).length)
    return JSON.parse(savedMessages)
  }
  console.log('⚠️ 未找到本地数据')
  return null
}

/**
 * 保存聊天记录到本地存储
 * @param {string} chatId - 聊天ID
 * @param {Array} messages - 消息列表
 */
export const saveChatHistory = (chatId, messages) => {
  const key = `chat_history_${chatId}`
  console.log('💾 保存到 localStorage, key:', key, '消息数:', messages.length)
  localStorage.setItem(key, JSON.stringify(messages))
  console.log('✅ 保存成功')
}

/**
 * 合并后端消息和本地消息
 * @param {Array} backendMessages - 后端返回的消息列表
 * @param {Array} localMessages - 本地存储的消息列表
 * @returns {Array} 合并后的消息列表（已按时间排序）
 */
export const mergeMessages = (backendMessages, localMessages) => {
  if (!localMessages || localMessages.length === 0) {
    return [...backendMessages]
  }

  // 找出本地有但后端没有的消息
  const backendIds = new Set(backendMessages.map(m => m.id || m.clientMsgId))
  const localOnlyMessages = localMessages.filter(m => {
    const msgId = m.id || m.clientMsgId
    return !backendIds.has(msgId)
  })

  if (localOnlyMessages.length > 0) {
    console.log('🎭 发现本地独有消息:', localOnlyMessages.length, '条')
    const merged = [...backendMessages, ...localOnlyMessages]
    
    // 按时间排序
    merged.sort((a, b) => {
      const timeA = a.createdAt || a.time || ''
      const timeB = b.createdAt || b.time || ''
      return timeA.localeCompare(timeB)
    })

    return merged
  }

  return [...backendMessages]
}

// ==================== 红包状态存储 ====================

/**
 * 检查红包是否已领取
 * @param {string} redPacketId - 红包ID
 * @returns {boolean} 是否已领取
 */
export const isRedPacketOpened = (redPacketId) => {
  const openedRecords = JSON.parse(localStorage.getItem('openedRedPackets') || '[]')
  return openedRecords.includes(redPacketId)
}

/**
 * 标记红包已领取
 * @param {string} redPacketId - 红包ID
 */
export const markRedPacketOpened = (redPacketId) => {
  const openedRecords = JSON.parse(localStorage.getItem('openedRedPackets') || '[]')
  if (!openedRecords.includes(redPacketId)) {
    openedRecords.push(redPacketId)
    localStorage.setItem('openedRedPackets', JSON.stringify(openedRecords))
    console.log('🧧 标记红包已领取:', redPacketId)
  }
}

/**
 * 获取所有已领取的红包记录
 * @returns {Array} 已领取的红包ID列表
 */
export const getOpenedRedPackets = () => {
  return JSON.parse(localStorage.getItem('openedRedPackets') || '[]')
}

/**
 * 清除所有红包领取记录
 */
export const clearOpenedRedPackets = () => {
  localStorage.removeItem('openedRedPackets')
  console.log('️ 已清除红包领取记录')
}

// ==================== 聊天列表存储 ====================

/**
 * 保存最近聊天列表
 * @param {Array} chatList - 聊天列表
 */
export const saveRecentChats = (chatList) => {
  localStorage.setItem('recentChats', JSON.stringify(chatList))
  console.log('💬 已保存最近聊天列表')
}

/**
 * 获取最近聊天列表
 * @returns {Array} 聊天列表
 */
export const getRecentChats = () => {
  return JSON.parse(localStorage.getItem('recentChats') || '[]')
}

// ==================== 工具方法 ====================

/**
 * 判断是否是模拟红包ID
 * @param {string} redPacketId - 红包ID
 * @returns {boolean} 是否是模拟红包
 */
export const isMockRedPacketId = (redPacketId) => {
  if (!redPacketId) return false
  return redPacketId.startsWith('pvt_') || 
         redPacketId.startsWith('grp_') || 
         redPacketId.startsWith('chn_') || 
         redPacketId.startsWith('mock_')
}

/**
 * 清除指定聊天的本地数据
 * @param {string} chatId - 聊天ID
 */
export const clearChatData = (chatId) => {
  localStorage.removeItem(`chat_history_${chatId}`)
  console.log('🗑️ 已清除聊天数据:', chatId)
}

/**
 * 清除所有本地聊天记录
 */
export const clearAllChatData = () => {
  const keys = Object.keys(localStorage).filter(key => key.startsWith('chat_history_'))
  keys.forEach(key => localStorage.removeItem(key))
  console.log('🗑️ 已清除所有聊天记录')
}

/**
 * 获取所有存储的聊天ID
 * @returns {Array} 聊天ID列表
 */
export const getSavedChatIds = () => {
  return Object.keys(localStorage)
    .filter(key => key.startsWith('chat_history_'))
    .map(key => key.replace('chat_history_', ''))
}
