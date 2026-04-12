import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getFriendChatData, saveMessages } from '@/utils/chatStorage'

/**
 * 全局聊天消息 Store
 * 管理：所有聊天会话的消息（群聊+私聊）
 * 三级缓存：Store → IndexedDB → API
 */
export const useChatMessageStore = defineStore('chatMessage', () => {
  // 消息缓存 { chatId: [messages] }
  const messagesCache = ref({})
  
  // 加载状态 { chatId: boolean }
  const loadingStates = ref({})
  
  /**
   * 获取指定聊天会话的消息（三级缓存策略）
   * @param {string} chatId - 聊天ID（friend_10000003 或 friend_1234567）
   * @param {Function} apiFetch - API 请求函数（可选）
   * @param {number} limit - 限制数量
   * @returns {Array} 消息数组
   */
  const getMessages = async (chatId, apiFetch = null, limit = 500) => {
    // 1️⃣ 优先从 Store 读取
    if (messagesCache.value[chatId]) {
      console.log(`📦 [Store] 从内存读取 ${chatId} 的消息`)
      return messagesCache.value[chatId]
    }
    
    // 2️⃣ Store 没有，从 IndexedDB 读取
    try {
      console.log(`💾 [IndexedDB] 从缓存读取 ${chatId} 的消息`)
      const { messages } = await getFriendChatData(chatId.replace('friend_', ''), limit)
      
      if (messages && messages.length > 0) {
        // 存入 Store
        messagesCache.value[chatId] = messages
        console.log(`✅ [Store] 已缓存 ${messages.length} 条消息`)
        return messages
      }
    } catch (err) {
      console.error('❌ [IndexedDB] 读取失败:', err)
    }
    
    // 3️⃣ IndexedDB 也没有，请求 API
    if (apiFetch) {
      try {
        console.log(`🌐 [API] 从后端获取 ${chatId} 的消息`)
        loadingStates.value[chatId] = true
        
        const messages = await apiFetch()
        
        // 存入 Store
        messagesCache.value[chatId] = messages
        
        // 存入 IndexedDB
        await saveMessages(messages)
        
        loadingStates.value[chatId] = false
        console.log(`✅ [Store + IndexedDB] 已缓存 ${messages.length} 条消息`)
        
        return messages
      } catch (err) {
        loadingStates.value[chatId] = false
        console.error('❌ [API] 获取失败:', err)
        return []
      }
    }
    
    return []
  }
  
  /**
   * 添加新消息到 Store 和 IndexedDB
   * @param {string} chatId - 聊天ID
   * @param {Object} message - 消息对象
   */
  const addMessage = async (chatId, message) => {
    // 初始化数组
    if (!messagesCache.value[chatId]) {
      messagesCache.value[chatId] = []
    }
    
    // 添加到 Store
    messagesCache.value[chatId].push(message)
    
    // 同步到 IndexedDB
    try {
      await saveMessages([message])
      console.log(`✅ [Store + IndexedDB] 添加消息: ${message.id}`)
    } catch (err) {
      console.error('❌ 保存消息失败:', err)
    }
  }
  
  /**
   * 批量添加消息
   * @param {string} chatId - 聊天ID
   * @param {Array} newMessages - 消息数组
   */
  const addMessages = async (chatId, newMessages) => {
    if (!messagesCache.value[chatId]) {
      messagesCache.value[chatId] = []
    }
    
    // 去重合并
    const existingIds = new Set(messagesCache.value[chatId].map(m => m.id))
    const uniqueMessages = newMessages.filter(m => !existingIds.has(m.id))
    
    messagesCache.value[chatId].push(...uniqueMessages)
    
    // 同步到 IndexedDB
    try {
      await saveMessages(uniqueMessages)
      console.log(`✅ [Store + IndexedDB] 批量添加 ${uniqueMessages.length} 条消息`)
    } catch (err) {
      console.error('❌ 批量保存消息失败:', err)
    }
  }
  
  /**
   * 清除指定聊天会话的缓存
   * @param {string} chatId - 聊天ID
   */
  const clearCache = (chatId) => {
    delete messagesCache.value[chatId]
    console.log(`🗑️ [Store] 清除 ${chatId} 的缓存`)
  }
  
  /**
   * 清除所有缓存
   */
  const clearAllCache = () => {
    messagesCache.value = {}
    console.log('🗑️ [Store] 清除所有消息缓存')
  }
  
  return {
    messagesCache,
    loadingStates,
    getMessages,
    addMessage,
    addMessages,
    clearCache,
    clearAllCache
  }
})
