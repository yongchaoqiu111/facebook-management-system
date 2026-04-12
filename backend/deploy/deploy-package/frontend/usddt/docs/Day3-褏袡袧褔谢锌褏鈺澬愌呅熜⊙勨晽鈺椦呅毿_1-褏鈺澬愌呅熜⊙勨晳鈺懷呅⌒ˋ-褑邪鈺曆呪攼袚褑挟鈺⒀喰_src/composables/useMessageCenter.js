import { ref, reactive } from 'vue'

/**
 * 统一消息中心
 * 所有 Socket 消息统一在这里处理，转换成标准数组格式
 * 各聊天组件只负责订阅和展示
 */
export function useMessageCenter() {
  // 消息存储：按 conversationId 分类
  // {
  //   'group_123': [{ id, type, content, time, ... }],
  //   'user_456': [{ id, type, content, time, ... }]
  // }
  const conversations = reactive({})
  
  // Socket 是否已初始化
  let socketInitialized = false

  /**
   * 初始化 Socket 监听（全局只调用一次）
   */
  const initSocketListeners = () => {
    if (socketInitialized) {
      console.log('⚠️ Socket 监听器已初始化，跳过')
      return
    }

    console.log('🔌 初始化全局 Socket 监听器')
    
    // 模拟初始化 Socket 连接
    console.log('Socket 连接已初始化')
    
    socketInitialized = true
    console.log('✅ Socket 监听器初始化完成')
  }

  /**
   * 获取指定对话的消息
   */
  const getMessages = (conversationId) => {
    return conversations[conversationId] || []
  }

  /**
   * 发送消息（统一入口）
   */
  const sendMessage = async (conversationId, messageData) => {
    console.log('📤 [MessageCenter] 发送消息:', conversationId, messageData)
    
    try {
      // 确定消息类型
      const isGroup = conversationId.startsWith('group_')
      const groupId = isGroup ? conversationId.replace('group_', '') : null
      
      // 模拟发送成功
      console.log('✅ 消息发送成功')
      
      // 乐观更新本地消息
      const message = {
        id: `msg_${Date.now()}`,
        type: messageData.type || 'text',
        content: messageData.content,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        clientMsgId: messageData.clientMsgId,
        senderId: 'current_user',
        groupId: groupId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSelf: true
      }
      
      // 添加到对话数组
      if (!conversations[conversationId]) {
        conversations[conversationId] = []
      }
      conversations[conversationId].push(message)
      
      return message
      
    } catch (error) {
      console.error('❌ 消息发送失败:', error)
      throw error
    }
  }

  /**
   * 加载历史消息
   */
  const loadHistory = async (conversationId) => {
    console.log('📚 [MessageCenter] 加载历史消息:', conversationId)
    
    // 模拟从本地加载历史消息
    const mockMessages = [
      {
        id: '1',
        type: 'text',
        content: '欢迎加入接龙群！',
        time: '10:30',
        senderId: 'system',
        groupId: conversationId.replace('group_', ''),
        isSelf: false,
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        type: 'text',
        content: '大家好！',
        time: '10:31',
        senderId: 'user1',
        groupId: conversationId.replace('group_', ''),
        isSelf: false,
        createdAt: new Date().toISOString()
      }
    ]
    
    conversations[conversationId] = mockMessages
    console.log(`✅ 从本地加载 ${mockMessages.length} 条消息`)
    return mockMessages
  }

  return {
    conversations,
    initSocketListeners,
    getMessages,
    sendMessage,
    loadHistory
  }
}
