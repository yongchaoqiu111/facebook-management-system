import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 全局聊天 Store
 * 管理：群消息、私聊消息、红包记录
 */
export const useChatStore = defineStore('chat', () => {
  // 群消息 { groupId: [messages] }
  const groupMessages = ref({})
  
  // 私聊消息 { userId: [messages] }
  const privateMessages = ref({})
  
  // 红包记录 { redPacketId: redPacketData }
  const redPackets = ref({})
  
  // 最大消息队列长度（每个群组/会话）
  const MAX_MESSAGES = 100

  // 添加群消息
  const addGroupMessage = (groupId, message) => {
    if (!groupMessages.value[groupId]) {
      groupMessages.value[groupId] = []
    }
    
    groupMessages.value[groupId].push(message)
    
    // 限制消息数量
    if (groupMessages.value[groupId].length > MAX_MESSAGES) {
      groupMessages.value[groupId].shift()
    }
    
    console.log('✅ [ChatStore] 添加群消息:', groupId, message.msgType === 2 ? '红包' : '文本')
  }
  
  // 添加私聊消息
  const addPrivateMessage = (userId, message) => {
    if (!privateMessages.value[userId]) {
      privateMessages.value[userId] = []
    }
    
    privateMessages.value[userId].push(message)
    
    // 限制消息数量
    if (privateMessages.value[userId].length > MAX_MESSAGES) {
      privateMessages.value[userId].shift()
    }
    
    console.log('✅ [ChatStore] 添加私聊消息:', userId)
  }
  
  // 添加红包记录
  const addRedPacket = (redPacketData) => {
    const id = redPacketData._id || redPacketData.id
    if (id) {
      redPackets.value[id] = redPacketData
      console.log('✅ [ChatStore] 添加红包记录:', id)
    }
  }
  
  // 更新红包状态
  const updateRedPacket = (redPacketId, updates) => {
    if (redPackets.value[redPacketId]) {
      redPackets.value[redPacketId] = {
        ...redPackets.value[redPacketId],
        ...updates
      }
      console.log('✅ [ChatStore] 更新红包状态:', redPacketId)
    }
  }
  
  // 获取群消息
  const getGroupMessages = (groupId) => {
    return groupMessages.value[groupId] || []
  }
  
  // 获取私聊消息
  const getPrivateMessages = (userId) => {
    return privateMessages.value[userId] || []
  }
  
  // 获取红包
  const getRedPacket = (redPacketId) => {
    return redPackets.value[redPacketId] || null
  }
  
  // 清空群组消息
  const clearGroupMessages = (groupId) => {
    if (groupId) {
      groupMessages.value[groupId] = []
    } else {
      groupMessages.value = {}
    }
  }
  
  // 清空私聊消息
  const clearPrivateMessages = (userId) => {
    if (userId) {
      privateMessages.value[userId] = []
    } else {
      privateMessages.value = {}
    }
  }

  return {
    groupMessages,
    privateMessages,
    redPackets,
    addGroupMessage,
    addPrivateMessage,
    addRedPacket,
    updateRedPacket,
    getGroupMessages,
    getPrivateMessages,
    getRedPacket,
    clearGroupMessages,
    clearPrivateMessages
  }
})
