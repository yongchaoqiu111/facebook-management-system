import { ref, reactive, computed } from 'vue'
import { initSocket, getSocket, onGroupMessage, onGroupRedPacket, sendGroupMessage, onRedPacketReceived, onRedPacketUpdated, onReceiveRedPacket, onPrivateRedPacketSent } from '@/socket'
import { chainGroupAPI, redPacketAPI, chatAPI } from '@/api'
import { saveMessages, getMessagesByChatId, saveBalanceChange, getUserBalanceChanges } from '@/utils/chatStorage'

/**
 * 统一消息中心
 * 所有 Socket 消息统一在这里处理，转换成标准数组格式
 * 各聊天组件只负责订阅和展示
 */

// ✅ 模块级别的标志，防止重复初始化
let socketInitialized = false

// ✅ 模块级别的状态变量（单例模式，所有组件共享）
const conversations = reactive({})
const balanceChanges = ref([])
const userBalance = ref(0)
const receivedMsgIds = new Set()
const MAX_STORED_IDS = 1000

export function useMessageCenter() {
  // 消息存储：按 conversationId 分类
  // （已提升到模块级别，实现单例共享）
  
  // 金额变动记录（独立存储）
  // （已提升到模块级别，实现单例共享）
  
  // ✅ 从 IndexedDB 加载余额变动历史
  const loadBalanceHistory = async () => {
    try {
      const currentUserId = localStorage.getItem('userId')
      if (!currentUserId) return
      
      const changes = await getUserBalanceChanges(currentUserId)
      balanceChanges.value = changes
      console.log(`✅ 已加载 ${balanceChanges.value.length} 条余额变动记录`)
    } catch (error) {
      console.error('❌ 加载余额历史记录失败:', error)
    }
  }
  
  // ✅ 保存余额变动历史到 IndexedDB
  const saveBalanceHistory = async () => {
    try {
      const currentUserId = localStorage.getItem('userId')
      if (!currentUserId) return
      
      // 只保留最近100条
      const recentChanges = balanceChanges.value.slice(-100)
      await saveBalanceChange(recentChanges[recentChanges.length - 1])
    } catch (error) {
      console.error('❌ 保存余额历史记录失败:', error)
    }
  }
  
  // 用户余额
  // （已提升到模块级别，实现单例共享）
  
  // 消息去重 Set
  // （已提升到模块级别，实现单例共享）
  
  // ✅ 红包相关回调（供组件订阅）
  const redPacketCallbacks = {
    onChainProgress: [],
    onRedPacketClaimed: [],
    onRedPacketStatusUpdate: [],
    onRedPacketExhausted: [],  // ✅ 红包已领完回调
    onMyRedPacketResult: [],
    onPrivateRedPacketReceived: [],  // ✅ 私聊红包领取结果 (type=7)
    onPrivateRedPacketSent: [],  // ✅ 私聊红包发送成功回调
    onMemberKicked: [],
    onGroupInfo: [],  // ✅ 群组信息广播回调
    onMemberTotalReceivedUpdated: []  // ✅ 成员累计领取更新回调
  }

  /**
   * 初始化 Socket 监听（全局只调用一次）
   */
  const initSocketListeners = () => {
    if (socketInitialized) {
      console.log('⚠️ Socket 监听器已初始化，跳过')
      return
    }

    window._initSocketCallCount = (window._initSocketCallCount || 0) + 1
    console.log('🔌 初始化全局 Socket 监听器 - 第', window._initSocketCallCount, '次调用')
    
    // 初始化 Socket 连接
    initSocket()
    
    const socket = getSocket()
    
    // 监听群聊消息
    onGroupMessage((data) => {
      console.log('📨 [MessageCenter] 收到群消息:', data)
      console.log('📨 [MessageCenter] 消息时间:', new Date().toLocaleTimeString())
      handleIncomingMessage('group', data)
    })
    
    // ✅ 监听 receiveMessage 事件（统一消息入口）
    socket.on('receiveMessage', (data) => {
      console.log('📨 [MessageCenter] 收到 receiveMessage:', data)
      
      // 数据可能是数组，取第一个元素
      const messageData = Array.isArray(data) ? data[0] : data
      
      if (!messageData) {
        console.warn('⚠️ 消息数据为空')
        return
      }
      
      // ✅ 根据 msgType 或 type 判断消息类型
      const msgType = messageData.msgType
      const contentType = messageData.type || messageData.content?.type
      
      console.log('🔍 [调试] receiveMessage 数据:', messageData)
      console.log('🔍 [调试] msgType:', msgType, 'contentType:', contentType)
      console.log('🔍 [调试] receiverId:', messageData.receiverId, 'groupId:', messageData.groupId)
      
      // ✅ 优先判断是否有 receiverId（私聊）
      if (messageData.receiverId) {
        // 私聊消息
        if (msgType === 1 || contentType === 'text') {
          console.log('💬 私聊文本消息')
          handleIncomingMessage('private', messageData)
        } else if (msgType === 2 || contentType === 'redpacket' || contentType === 'redPacket') {
          console.log('🧧 私聊红包消息')
          handleIncomingMessage('privateRedPacket', messageData)
        }
      } else if (messageData.groupId) {
        // ✅ 判断是群聊还是私聊：如果 groupId 是8位数字，说明是私聊（对方ID）
        const isPrivateChat = /^\d{8}$/.test(String(messageData.groupId))
        
        if (isPrivateChat) {
          // 私聊消息
          console.log('💬 私聊消息（groupId是对方ID）')
          if (msgType === 1 || contentType === 'text') {
            handleIncomingMessage('private', messageData)
          } else if (msgType === 2 || contentType === 'redpacket' || contentType === 'redPacket') {
            handleIncomingMessage('privateRedPacket', messageData)
          }
        } else {
          // 群聊消息
          if (msgType === 1 || contentType === 'text') {
            console.log('💬 群聊消息')
            handleIncomingMessage('group', messageData)
          } else if (msgType === 2 || contentType === 'redpacket' || contentType === 'redPacket') {
            console.log('🧧 群红包消息')
            handleIncomingMessage('groupRedPacket', messageData)
          } else if (msgType === 3 || contentType === 'system') {
            console.log('🔔 系统通知')
            // TODO: 处理系统通知
          }
        }
      } else {
        // ⚠️ 后端没有返回 receiverId 和 groupId，尝试从 sender 推断
        console.warn('⚠️ 消息缺少 receiverId 和 groupId，尝试从 sender 推断')
        console.log('🔍 [调试] messageData.sender:', messageData.sender)
        
        // 如果 sender.userId 存在，且不是当前用户，可能是私聊
        const currentUserId = localStorage.getItem('userId')
        const senderUserId = messageData.sender?.userId || messageData.sender?._id
        
        console.log('🔍 [调试] senderUserId:', senderUserId, 'currentUserId:', currentUserId)
        
        if (senderUserId && senderUserId !== currentUserId) {
          console.log('💬 推断为私聊消息，sender:', senderUserId)
          // 手动添加 receiverId（假设是当前用户）
          messageData.receiverId = currentUserId
          handleIncomingMessage('private', messageData)
        } else {
          console.warn('⚠️ 无法推断消息类型:', messageData)
        }
      }
    })
    
    // 监听群红包
    onGroupRedPacket((data) => {
      console.log('🧧 [MessageCenter] 收到群红包:', data)
      handleIncomingMessage('groupRedPacket', data)
    })
    
    // ✅ 监听接龙进度更新
    socket.on('chainRedPacketProgress', async (data) => {
      console.log('📊 [MessageCenter] 接龙进度更新:', data)
      
      // ✅ 处理接龙群红包状态更新
      if (data.redPacketId && data.status === 'completed') {
        try {
          const { saveMessages } = await import('@/utils/chatStorage')
          
          // 遍历内存中的所有会话，找到对应的红包消息
          for (const convId of Object.keys(conversations)) {
            const messages = conversations[convId]
            
            if (!messages || messages.length === 0) continue
            
            const targetMsg = messages.find(m => m.redPacketId === String(data.redPacketId))
            if (targetMsg && targetMsg.groupId) {
              console.log('✅ 找到接龙红包消息（内存）:', targetMsg.id, convId)
              
              // ✅ 更新接龙红包状态为已完成
              targetMsg.opened = true
              targetMsg.title = '接龙已完成'
              
              console.log('✅ 已更新接龙红包状态为 opened=true')
              
              // ✅ 同步到 IndexedDB
              await saveMessages([targetMsg])
              console.log('✅ 已保存到 IndexedDB')
              break
            }
          }
        } catch (error) {
          console.error('❌ 更新接龙红包状态失败:', error)
        }
      }
      
      redPacketCallbacks.onChainProgress.forEach(cb => cb(data))
    })
    
    // ✅ 监听红包领取明细
    socket.on('redPacketClaimed', async (data) => {
      console.log('💰 [MessageCenter] 有人领取红包:', data)
      console.log('🔍 [调试] data.redPacketId:', data.redPacketId)
      
      // ✅ 将领取记录添加到对应红包消息中
      if (data.redPacketId) {
        try {
          const { saveMessages } = await import('@/utils/chatStorage')
          
          let found = false
          // 遍历内存中的所有会话，找到对应的红包消息
          for (const convId of Object.keys(conversations)) {
            const messages = conversations[convId]
            
            if (!messages || messages.length === 0) continue
            
            const targetMsg = messages.find(m => m.redPacketId === String(data.redPacketId))
            if (targetMsg) {
              found = true
              console.log('✅ 找到红包消息（内存）:', targetMsg.id, convId)
              console.log('📊 当前 opened 状态:', targetMsg.opened)
              
              // ✅ 更新红包状态为已领取
              targetMsg.opened = true
              targetMsg.title = '已领取'
              
              console.log('✅ 已更新红包状态为 opened=true')
              
              // ✅ 同步到 IndexedDB
              await saveMessages([targetMsg])
              console.log('✅ 已保存到 IndexedDB')
              break
            }
          }
          
          if (!found) {
            console.warn('⚠️ 未找到对应的红包消息，redPacketId:', data.redPacketId)
            console.log('📋 当前所有会话:', Object.keys(conversations))
            // 打印所有红包消息的 redPacketId
            for (const convId of Object.keys(conversations)) {
              const msgs = conversations[convId]
              if (msgs) {
                const redPackets = msgs.filter(m => m.type === 'redPacket')
                if (redPackets.length > 0) {
                  console.log(`会话 ${convId} 的红包:`, redPackets.map(m => ({ id: m.id, redPacketId: m.redPacketId, opened: m.opened })))
                }
              }
            }
          }
        } catch (error) {
          console.error('❌ 更新领取记录失败:', error)
        }
      }
      
      redPacketCallbacks.onRedPacketClaimed.forEach(cb => cb(data))
    })
    
    // ✅ 监听红包状态更新
    socket.on('redPacketStatusUpdate', (data) => {
      console.log('🔄 [MessageCenter] 红包状态变更:', data)
      redPacketCallbacks.onRedPacketStatusUpdate.forEach(cb => cb(data))
    })
    
    // ✅ 监听红包已领完
    socket.on('redPacketExhausted', async (data) => {
      console.log('🚫 [MessageCenter] 红包已领完:', data)
      
      // ✅ 将红包标记为已领取（领完=所有人都领过了）
      if (data.redPacketId) {
        try {
          const { saveMessages } = await import('@/utils/chatStorage')
          
          let found = false
          // 遍历内存中的所有会话，找到对应的红包消息
          for (const convId of Object.keys(conversations)) {
            const messages = conversations[convId]
            
            if (!messages || messages.length === 0) continue
            
            const targetMsg = messages.find(m => m.redPacketId === String(data.redPacketId))
            if (targetMsg) {
              found = true
              console.log('✅ 找到红包消息（内存）:', targetMsg.id, convId)
              console.log('📊 当前 opened 状态:', targetMsg.opened)
              
              // ✅ 只更新私聊红包，群红包由 chainRedPacketProgress 控制
              if (targetMsg.redPacketType === 'private' || !targetMsg.groupId) {
                targetMsg.opened = true
                targetMsg.title = '已领完'
                console.log('✅ 已更新私聊红包状态为 opened=true')
              } else {
                console.log('⏭️ 跳过群红包，等待 chainRedPacketProgress 事件')
              }
              
              // ✅ 同步到 IndexedDB
              await saveMessages([targetMsg])
              console.log('✅ 已保存到 IndexedDB')
              break
            }
          }
          
          if (!found) {
            console.warn('⚠️ 未找到对应的红包消息，redPacketId:', data.redPacketId)
            console.log('📋 当前所有会话:', Object.keys(conversations))
            // 打印所有红包消息的 redPacketId
            for (const convId of Object.keys(conversations)) {
              const msgs = conversations[convId]
              if (msgs) {
                const redPackets = msgs.filter(m => m.type === 'redPacket')
                if (redPackets.length > 0) {
                  console.log(`会话 ${convId} 的红包:`, redPackets.map(m => ({ id: m.id, redPacketId: m.redPacketId, opened: m.opened })))
                }
              }
            }
          }
        } catch (error) {
          console.error('❌ 更新领取记录失败:', error)
        }
      }
      
      redPacketCallbacks.onRedPacketExhausted.forEach(cb => cb(data))
    })
    
    // ✅ 监听我的抢红包结果
    socket.on('myRedPacketResult', (data) => {
      console.log('🎉 [MessageCenter] 我抢到了红包:', data)
      redPacketCallbacks.onMyRedPacketResult.forEach(cb => cb(data))
      
      // 同时更新余额
      if (data.balance !== undefined) {
        userBalance.value = data.balance
      }
    })
    
    // ✅ 监听用户被踢出群组事件
    socket.on('kickedFromGroup', (data) => {
      console.log('🚫 [MessageCenter] 我被踢出群组，完整数据:', data)
      
      // ✅ 直接从 data.groupId 提取（和进群时使用同样的格式）
      const groupId = data.groupId
      console.log('🆔 提取的 groupId:', groupId)
      
      if (groupId) {
        // ✅ 更新 LocalStorage 中的门票状态（格式：joined_userId_groupId）
        const currentUserId = localStorage.getItem('userId')
        if (currentUserId) {
          const storageKey = `joined_${currentUserId}_${groupId}`
          console.log('🔑 生成的 storageKey:', storageKey)
          
          // 更新为 0（未加入）
          localStorage.setItem(storageKey, '0')
          console.log(`✅ 已更新门票状态: ${storageKey} = 0`)
          
          // 清除 sessionStorage
          sessionStorage.removeItem('justJoinedChainGroup')
          console.log('🗑️ 已清除 sessionStorage')
        }
        
        // ✅ 弹出提示卡片
        showKickedOutModal(data)
      } else {
        console.error('❌ 无法从事件数据中提取 groupId')
      }
      
      // 通知回调
      redPacketCallbacks.onMemberKicked.forEach(cb => cb({ ...data, isSelf: true }))
    })
    
    // ✅ 监听群成员被踢出事件
    socket.on('memberKicked', (data) => {
      console.log('🔥 [调试] 收到 memberKicked:', data)
      console.log('👥 [MessageCenter] 群成员被踢出:', data)
      
      // 通知回调
      redPacketCallbacks.onMemberKicked.forEach(cb => cb({ ...data, isSelf: false }))
    })
    
    // ✅ 监听群组列表更新（进群时后端推送）
    socket.on('groupListUpdated', (data) => {
      console.log('📋 [MessageCenter] 收到群组列表更新:', data)
      
      // ✅ 检测是否被踢出群组
      if (data.groups && Array.isArray(data.groups)) {
        const currentGroupId = window._currentChatId  // 从全局变量获取当前群组ID
        if (currentGroupId) {
          const stillInGroup = data.groups.find(g => g._id === currentGroupId || g.id === currentGroupId)
          if (!stillInGroup) {
            console.warn('⚠️ [MessageCenter] 检测到被踢出群组:', currentGroupId)
            // 触发自定义事件，由组件层处理跳转
            window.dispatchEvent(new CustomEvent('kickedFromGroup', { 
              detail: { groupId: currentGroupId } 
            }))
          }
        }
      }
      
      // 通知回调（供 useChainGroupChat 更新 chainGroupInfo）
      redPacketCallbacks.onGroupInfo.forEach(cb => cb(data))
    })
    
    // ✅ 监听成员累计领取金额更新
    socket.on('memberTotalReceivedUpdated', (data) => {
      console.log('💰 [MessageCenter] 成员累计领取更新:', data)
      
      // 🔥 如果用户被踢出，更新缓存为 0
      if (data.wasKicked && data.userId === localStorage.getItem('userId')) {
        const cacheKey = `joined_${data.userId}_${data.groupId}`
        console.log('⚠️ 用户被踢出，更新缓存为 0:', cacheKey)
        localStorage.setItem(cacheKey, '0')  // 设置为 0 表示未加入
      }
      
      // 通知回调（供 useChainGroupChat 更新 chainGroupInfo）
      if (redPacketCallbacks.onMemberTotalReceivedUpdated) {
        redPacketCallbacks.onMemberTotalReceivedUpdated.forEach(cb => cb(data))
      }
    })
    
    // ✅ 监听私聊红包发送成功（发给发送方）
    onPrivateRedPacketSent(async (data) => {
      console.log('📤 [MessageCenter] 私聊红包发送成功:', data)
      
      const currentUserId = localStorage.getItem('userId')
      const receiverId = data.receiverId
      
      if (!currentUserId || !receiverId) {
        console.warn('⚠️ 私聊红包缺少必要字段:', data)
        return
      }
      
      // 构造红包消息
      const now = new Date()
      const time = now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes()
      
      const redPacketMessage = {
        id: `pr_${Date.now()}`,
        type: 'redPacket',
        redPacketType: 'private',
        amount: data.amount,
        count: 1,
        message: data.message || '恭喜发财，大吉大利',
        opened: false,
        expired: false,
        redPacketId: data.redPacketId,
        clientMsgId: data.redPacketId,
        receiverId: receiverId,
        chatId: receiverId,
        timestamp: data.timestamp || Date.now(),
        senderId: currentUserId,
        isSelf: true,
        time: time
      }
      
      console.log('📦 [MessageCenter] 格式化后的私聊红包消息:', redPacketMessage)
      
      // 添加到对话
      const conversationId = receiverId
      addMessageToConversation(conversationId, redPacketMessage)
      
      // 保存到 IndexedDB
      try {
        await saveMessages([redPacketMessage])
        console.log('💾 [MessageCenter] 私聊红包已保存到 IndexedDB')
      } catch (error) {
        console.error('❌ [MessageCenter] 保存私聊红包失败:', error)
      }
      
      // 触发发送成功回调（显示成功弹窗）
      redPacketCallbacks.onPrivateRedPacketSent.forEach(cb => cb({
        amount: data.amount,
        receiverId: receiverId,
        redPacketId: data.redPacketId
      }))
    })
    
    // ✅ 监听接收私聊红包（发给接收方）
    onReceiveRedPacket(async (data) => {
      console.log('📥 [MessageCenter] 收到私聊红包:', data)
      
      const currentUserId = localStorage.getItem('userId')
      const senderId = data.sender?.userId || data.senderId
      
      if (!senderId) {
        console.warn('⚠️ 接收红包缺少 senderId:', data)
        return
      }
      
      // 构造红包消息
      const now = new Date()
      const time = now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes()
      
      const redPacketMessage = {
        id: `pr_${Date.now()}`,
        type: 'redPacket',
        redPacketType: data.type || 'private',
        amount: data.amount,
        count: data.count || 1,
        message: data.message || '恭喜发财，大吉大利',
        opened: false,
        expired: false,
        redPacketId: data.redPacketId,
        clientMsgId: data.redPacketId,
        chatId: senderId,
        timestamp: data.timestamp || Date.now(),
        senderId: senderId,
        isSelf: false,
        time: time
      }
      
      console.log('📦 [MessageCenter] 格式化后的接收红包消息:', redPacketMessage)
      
      // 添加到对话（conversationId = 对方ID）
      const conversationId = senderId
      addMessageToConversation(conversationId, redPacketMessage)
      
      // 保存到 IndexedDB
      try {
        await saveMessages([redPacketMessage])
        console.log('💾 [MessageCenter] 接收红包已保存到 IndexedDB')
      } catch (error) {
        console.error('❌ [MessageCenter] 保存接收红包失败:', error)
      }
    })
    
    // ✅ 监听红包领取结果（发给当前用户）
    onRedPacketReceived((data) => {
      console.log('🎉 [MessageCenter] 我领取了红包:', data)
      
      // 更新用户余额
      if (data.newBalance !== undefined) {
        userBalance.value = Number(data.newBalance)
        console.log('💰 更新用户余额:', data.newBalance)
      }
      
      // 通知回调（供 useChainGroupChat 处理累计金额等）
      redPacketCallbacks.onMyRedPacketResult.forEach(cb => cb(data))
    })
    
    // ✅ 监听红包状态更新（发给群组）
    onRedPacketUpdated((data) => {
      console.log('🔄 [MessageCenter] 红包状态更新:', data)
      
      // 通知回调（供组件更新红包显示）
      redPacketCallbacks.onRedPacketStatusUpdate.forEach(cb => cb(data))
    })
    
    // ✅ 监听私聊消息（由 App.vue 全局监听到 IndexedDB）
    // 注：私聊消息和接龙群一样，通过 App.vue 全局监听保存，不在这里重复监听
    
    // ✅ 监听私聊红包（由 App.vue 全局监听到 IndexedDB）
    // 注：私聊红包和群红包一样，通过 App.vue 全局监听保存，不在这里重复监听
    
    // ✅ 监听余额变动
    socket.on('balanceUpdated', (data) => {
      console.log('💰 [MessageCenter] 余额变动:', data)
      handleBalanceChange(data)
      
      // ✅ 私聊红包收入（type=7），通知 PrivateChat 页面
      if (data.type === 7) {
        console.log('🎉 [MessageCenter] 私聊红包领取成功，通知页面')
        redPacketCallbacks.onPrivateRedPacketReceived.forEach(cb => cb({
          amount: data.amount,
          newBalance: data.newBalance,
          timestamp: data.timestamp
        }))
      }
    })
    
    socketInitialized = true
    console.log('✅ Socket 监听器初始化完成')
  }

  /**
   * 处理 incoming 消息（统一入口）
   * @param {string} messageType - 消息类型：'group', 'private', 'groupRedPacket' 等
   * @param {object} rawData - Socket 原始数据
   */
  const handleIncomingMessage = async (messageType, rawData) => {
    // 1. 确定 conversationId
    const conversationId = getConversationId(messageType, rawData)
    if (!conversationId) {
      console.warn('⚠️ 无法确定 conversationId，跳过消息:', rawData)
      return
    }

    // 2. 格式化为标准消息对象
    const message = formatMessage(messageType, rawData)
    if (!message) {
      console.warn('⚠️ 消息格式化失败，跳过:', rawData)
      return
    }

    // 3. 添加到对话数组（带去重检查）
    addMessageToConversation(conversationId, message)

    // 4. 如果是金额相关消息，记录余额变动
    if (isBalanceRelatedMessage(messageType, message)) {
      recordBalanceChange(messageType, message)
    }

    // 5. 持久化到 IndexedDB（公开群不保存）
    const isPublicGroup = conversationId.startsWith('group_1000001') // 六合天下群ID
    if (!isPublicGroup) {
      try {
        console.log('💾 [调试] 准备保存消息:', message)
        await saveMessages([message])
        console.log(`💾 [MessageCenter] 已保存到 IndexedDB: ${conversationId}`)
      } catch (error) {
        console.error('❌ [MessageCenter] 保存失败:', error)
      }
    } else {
      console.log('ℹ️ [MessageCenter] 公开群，跳过 IndexedDB 保存')
    }

    console.log(`✅ 消息已处理: ${conversationId}`, message)
  }

  /**
   * 获取 conversationId
   */
  const getConversationId = (messageType, data) => {
    switch (messageType) {
      case 'group':
      case 'groupRedPacket':
        return `group_${data.groupId}`
      case 'private':
      case 'privateRedPacket':
        // ✅ 私聊：conversationId = 对方ID
        const currentUserId = localStorage.getItem('userId')
        const senderId = data.senderId || data.sender?.userId || data.sender?._id || data.sender || currentUserId
        
        // ✅ 私聊：receiverId 可能不存在，用 groupId 或 receiver._id 代替
        let receiverId = data.receiverId || data.receiver?.userId || data.receiver?.id || data.receiver?._id
        if (!receiverId && data.groupId) {
          receiverId = data.groupId  // ✅ 私聊：groupId 就是对方ID
        }
        
        if (!senderId || !receiverId) {
          console.warn('⚠️ 私聊消息缺少 senderId 或 receiverId:', data)
          return null
        }
        
        // 计算对方ID：如果发送者是自己，对方是receiver；否则对方是sender
        const otherUserId = String(senderId) === String(currentUserId) ? receiverId : senderId
        return otherUserId
      default:
        return null
    }
  }

  /**
   * 格式化消息为标准格式
   */
  const formatMessage = (messageType, data) => {
    const now = new Date()
    const time = now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes()
    const currentUserId = localStorage.getItem('userId')
    
    // ✅ 新标准：使用 msgId 作为唯一标识
    const msgId = data.msgId || data._id || `${messageType}_${Date.now()}`
    
    // ✅ 新标准：senderId 直接是字符串
    const senderId = data.senderId || data.sender?._id || data.sender
    
    const baseMessage = {
      id: msgId,
      time,
      senderId,
      isSelf: senderId === currentUserId,
      createdAt: data.timestamp ? new Date(data.timestamp).toISOString() : now.toISOString()
    }

    // 根据消息类型添加特定字段
    switch (messageType) {
      case 'group':
        return {
          ...baseMessage,
          type: 'text',
          content: data.content?.text || data.content,  // ✅ 新标准：content.text
          groupId: data.groupId,
          chatId: data.groupId,  // ✅ 群聊：chatId = groupId
          timestamp: data.timestamp || Date.now(),  // ✅ 添加 timestamp 用于 IndexedDB 索引
          clientMsgId: msgId
        }
      
      case 'private':
        // ✅ 私聊：chatId = 对方ID
        const pSenderId = data.senderId || data.sender?.userId || data.sender?._id
        
        // ✅ 私聊：receiverId 可能不存在，用 groupId 代替
        let pReceiverId = data.receiverId
        if (!pReceiverId && data.groupId) {
          pReceiverId = data.groupId  // ✅ 私聊：groupId 就是对方ID
        }
        
        // 计算对方ID：如果发送者是自己，对方是receiver；如果接收者是自己，对方是sender
        const otherUserId = String(pSenderId) === String(currentUserId) ? pReceiverId : pSenderId
        
        return {
          ...baseMessage,
          type: 'text',
          content: data.content?.text || data.content,
          receiverId: pReceiverId,
          chatId: otherUserId,  // ✅ 私聊：chatId = 对方ID
          timestamp: data.timestamp || Date.now(),  // ✅ 添加 timestamp
          clientMsgId: msgId
        }
      
      case 'privateRedPacket':
        // ✅ 私聊红包
        const prSenderId = data.senderId || data.sender?.userId || data.sender?._id || data.sender || currentUserId
        const prReceiverId = data.receiverId || data.receiver?.userId || data.receiver?.id
        const prRedPacketId = data.redPacketId || data.id || `${messageType}_${Date.now()}`
        
        // ✅ 私聊红包：chatId = 对方ID（和私聊文本消息一致）
        const prOtherUserId = String(prSenderId) === String(currentUserId) ? prReceiverId : prSenderId
        
        return {
          ...baseMessage,
          type: 'redPacket',
          redPacketType: data.type || 'private',
          amount: data.amount,
          count: 1,
          message: data.message || '恭喜发财，大吉大利',
          opened: data.isSelf ? false : false,  // 发送方未领取，接收方也未领取
          expired: false,
          redPacketId: prRedPacketId,
          clientMsgId: msgId,
          receiverId: prReceiverId,
          chatId: prOtherUserId,  // ✅ 私聊红包：chatId = 对方ID
          timestamp: data.timestamp || Date.now(),
          senderId: prSenderId,
          isSelf: data.isSelf || prSenderId === currentUserId
        }
      
      case 'groupRedPacket':
        // ✅ 新标准：红包数据在 content 对象中
        const gSenderId = data.senderId || data.sender?._id || data.sender || currentUserId
        const content = data.content || {}
        const redPacketData = data.success && data.data ? data.data : content
        
        // ✅ 确保 redPacketId 正确设置（优先从外层取）
        const gRedPacketId = data.redPacketId || data.id || redPacketData.redPacketId || redPacketData._id || redPacketData.id || msgId
        
        console.log('🧧 [MessageCenter] 格式化红包消息:', {
          originalData: data,
          content,
          redPacketData,
          extractedRedPacketId: gRedPacketId
        })
        
        return {
          ...baseMessage,
          type: 'redPacket',
          redPacketType: redPacketData.redPacketType || redPacketData.type || 'normal',
          amount: redPacketData.totalAmount || redPacketData.amount,
          count: redPacketData.count || 1,
          message: redPacketData.message || '恭喜发财，大吉大利',
          opened: false,
          redPacketId: gRedPacketId,
          clientMsgId: msgId,
          groupId: data.groupId,
          chatId: data.groupId,  // ✅ 添加 chatId 用于 IndexedDB 索引
          timestamp: data.timestamp || Date.now(),  // ✅ 添加 timestamp 用于 IndexedDB 索引
          senderId: gSenderId,
          isSelf: gSenderId === currentUserId,
          isChainRedPacket: redPacketData.redPacketType === 'chain' || redPacketData.type === 'chain'
        }
      
      default:
        console.warn('⚠️ 未知的消息类型:', messageType)
        return null
    }
  }

  /**
   * 检查消息是否重复
   * @param {object} message - 消息对象
   * @returns {boolean} - 是否重复
   */
  const isDuplicateMessage = (message) => {
    // ✅ 新标准：优先使用 msgId
    const msgId = message.msgId || message.id || message.clientMsgId
    if (!msgId) {
      console.warn('⚠️ 消息缺少 ID，无法去重:', message)
      return false
    }
    
    if (receivedMsgIds.has(msgId)) {
      console.log('⚠️ 检测到重复消息，已跳过:', msgId)
      return true
    }
    
    receivedMsgIds.add(msgId)
    
    // 限制 Set 大小，避免内存泄漏
    if (receivedMsgIds.size > MAX_STORED_IDS) {
      // 清理最早的 500 个 ID
      const idsArray = Array.from(receivedMsgIds)
      idsArray.slice(0, 500).forEach(id => receivedMsgIds.delete(id))
      console.log('🗑️ 清理了 500 个旧消息 ID，当前大小:', receivedMsgIds.size)
    }
    
    return false
  }

  /**
   * 添加消息到对话数组（带去重检查）
   */
  const addMessageToConversation = (conversationId, message) => {
    // ✅ 检查是否重复
    if (isDuplicateMessage(message)) {
      console.warn('⚠️ [addMessageToConversation] 检测到重复消息，跳过添加')
      return  // 重复消息，直接返回
    }
    
    // 初始化对话数组
    if (!conversations[conversationId]) {
      conversations[conversationId] = []
    }
    
    // 使用 splice 保持响应式
    conversations[conversationId].splice(
      conversations[conversationId].length,
      0,
      message
    )
  }

  /**
   * 判断是否为金额相关消息
   */
  const isBalanceRelatedMessage = (messageType, message) => {
    return messageType.includes('RedPacket') || messageType === 'transfer'
  }

  /**
   * 记录余额变动
   */
  const recordBalanceChange = (messageType, message) => {
    balanceChanges.value.push({
      id: `balance_${Date.now()}`,
      type: messageType,
      amount: message.amount,
      reason: getBalanceChangeReason(messageType, message),
      timestamp: message.createdAt,
      relatedId: message.id
    })
  }

  /**
   * 获取余额变动原因
   */
  const getBalanceChangeReason = (messageType, message) => {
    switch (messageType) {
      case 'groupRedPacket':
        return message.isSelf ? '发送红包' : '领取红包'
      case 'transfer':
        return '转账'
      default:
        return '未知变动'
    }
  }

  /**
   * ✅ 处理余额变动事件（来自 balanceUpdated）
   */
  const handleBalanceChange = async (data) => {
    console.log('💰 [handleBalanceChange] 收到余额变动:', data)
    
    // 更新用户余额
    if (data.newBalance !== undefined) {
      userBalance.value = data.newBalance
      console.log('✅ 更新余额:', data.newBalance)
    }
    
    // 根据 type 生成描述
    const typeDescriptions = {
      1: '加入接龙群',
      2: '门票收益',
      3: '抢红包',
      4: '六合下注',
      5: '六合中奖',
      6: '私聊红包转出',
      7: '私聊红包收入'
    }
    
    const description = typeDescriptions[data.type] || `其他(${data.type})`
    
    // ✅ 防御性处理：确保 timestamp 有效
    const ts = data.timestamp ? (typeof data.timestamp === 'number' ? data.timestamp * 1000 : Date.parse(data.timestamp)) : Date.now()
    
    // 记录到账单列表
    const balanceRecord = {
      id: `balance_${Date.now()}`,
      userId: localStorage.getItem('userId'),
      type: data.type,
      amount: data.amount,
      reason: description,
      newBalance: data.newBalance,
      groupId: data.groupId,
      timestamp: new Date(ts).toISOString()
    }
    
    balanceChanges.value.push(balanceRecord)
    
    // ✅ 保存到 IndexedDB
    await saveBalanceChange(balanceRecord)
    
    console.log('✅ 已记录余额变动:', description, data.amount)
  }

  /**
   * 获取指定对话的消息
   */
  const getMessages = (conversationId) => {
    return conversations[conversationId] || []
  }

  /**
   * 获取余额变动历史
   */
  const getBalanceHistory = () => {
    return balanceChanges.value
  }

  /**
   * 发送消息（统一入口）
   * ⚠️ 临时方案：后端 POST /chats/messages 未实现，仅使用 WSS 推送
   */
  const sendMessage = async (conversationId, messageData) => {
    console.log('📤 [MessageCenter] 发送消息:', conversationId, messageData)
    
    try {
      // 1. 确定消息类型
      const isGroup = conversationId.startsWith('group_')
      const groupId = isGroup ? conversationId.replace('group_', '') : null
      
      // ⚠️ 临时方案：跳过 HTTP POST，直接使用 WSS
      // TODO: 等后端实现 POST /chats/messages 后恢复
      /*
      let response
      if (isGroup) {
        response = await chainGroupAPI.sendMessage({
          groupId,
          content: messageData.content,
          type: messageData.type || 'text'
        })
      } else {
        // TODO: 私聊 API
        console.warn('⚠️ 私聊发送暂未实现')
        return
      }
      */
      
      // 2. WSS 推送（实时同步给其他人）
      if (isGroup) {
        sendGroupMessage({
          groupId,
          content: messageData.content,
          type: messageData.type || 'text',
          clientMsgId: messageData.clientMsgId || Date.now().toString()
        })
      }
      
      // 3. 乐观更新本地消息
      const currentUserId = localStorage.getItem('userId')
      const message = {
        id: `temp_${Date.now()}`,
        type: messageData.type || 'text',
        senderId: currentUserId,
        isSelf: true,
        content: messageData.content,
        time: new Date().getHours() + ':' + String(new Date().getMinutes()).padStart(2, '0'),
        direction: 'outgoing',
        clientMsgId: messageData.clientMsgId || Date.now().toString(),
        groupId: groupId
      }
      
      addMessageToConversation(conversationId, message)
      await saveMessages([message])
      
      console.log('✅ 消息发送成功（WSS + 乐观更新）:', message)
      return message
      
    } catch (error) {
      console.error('❌ 消息发送失败:', error)
      throw error
    }
  }

  /**
   * 加载历史消息
   * 策略：优先 LocalStorage → HTTP GET 后端 → WSS 增量更新
   */
  const loadHistory = async (conversationId) => {
    console.log('📚 [MessageCenter] 加载历史消息:', conversationId)
    console.log('📚 [MessageCenter] 加载时间:', new Date().toLocaleTimeString())
    console.log('🔍 [调试] conversationId 类型:', typeof conversationId)
    
    // 1. 从 IndexedDB 加载
    let rawId = conversationId
    if (conversationId.startsWith('group_')) {
      rawId = conversationId.replace('group_', '')
    } else if (conversationId.startsWith('private_')) {
      // 私聊：chatId 就是对方ID
      rawId = conversationId.replace('private_', '')
    }
    // ✅ 如果 conversationId 是纯数字（私聊对方ID），直接用
    
    console.log('🔍 [调试] rawId:', rawId)
    
    const currentUserId = localStorage.getItem('userId')
    const indexedMessages = await getMessagesByChatId(rawId, 500)
    console.log('📚 [MessageCenter] IndexedDB 中的消息数:', indexedMessages.length)
    console.log('📚 [MessageCenter] 当前用户 ID:', currentUserId)
    
    if (indexedMessages && indexedMessages.length > 0) {
      console.log('✅ [调试] 从 IndexedDB 找到消息，直接返回，不再请求后端')
      // ✅ 直接替换数组，触发响应式更新
      const processedMessages = indexedMessages.map(msg => {
        // ✅ 自动设置 direction：0=自己(右侧), 1=别人(左侧)
        if (msg.direction === undefined || msg.direction === null) {
          msg.direction = String(msg.senderId) === String(currentUserId) ? 0 : 1
        }
        return msg
      })
      
      conversations[conversationId] = processedMessages
      console.log(`✅ 从 IndexedDB 加载 ${processedMessages.length} 条消息`)
      console.log('🔍 [调试] 第一条消息:', processedMessages[0])
      return processedMessages
    }
    
    console.log('⚠️ [调试] IndexedDB 中没有消息，开始从后端请求...')
    
    // 2. HTTP GET 从后端加载（可靠）
    try {
      let response
      if (conversationId.startsWith('group_')) {
        const groupId = conversationId.replace('group_', '')
        response = await chainGroupAPI.getMessages(groupId, { limit: 50 })
      } else if (conversationId.startsWith('private_')) {
        // ✅ 私聊：没有HTTP API，只从 IndexedDB 加载
        console.log('ℹ️ [私聊] 没有后端API，仅从 IndexedDB 加载历史消息')
        conversations[conversationId] = []
        return []
      } else if (/^\d+$/.test(conversationId)) {
        // ✅ 私聊：conversationId 是纯数字（对方ID），没有HTTP API
        console.log('ℹ️ [私聊] 没有后端API，仅从 IndexedDB 加载历史消息')
        conversations[conversationId] = []
        return []
      } else {
        console.warn('⚠️ 未知的 conversationId 类型:', conversationId)
        return []
      }
      
      console.log('🔍 [调试] response:', response)
      console.log('🔍 [调试] response.messages:', response?.messages)
      console.log('🔍 [调试] response.data?.messages:', response?.data?.messages)
      
      // ✅ 兼容不同的响应格式
      const messagesData = response?.messages || response?.data?.messages || response?.data?.data?.messages
      
      if (messagesData && messagesData.length > 0) {
        console.log('📦 [调试] 后端返回的原始消息:', messagesData)
        
        const messages = messagesData.map(msg => {
          // ✅ 根据消息类型格式化
          const msgType = msg.type === 'redPacket' || msg.redPacketId ? 'privateRedPacket' : 'private'
          console.log('🔍 [调试] 格式化消息:', msg, 'msgType:', msgType)
          return formatMessage(msgType, msg)
        })
        
        console.log('✅ [调试] 格式化后的消息:', messages)
        
        // ✅ 先保存到 IndexedDB
        await saveMessages(messages)
        console.log(`✅ 已保存 ${messages.length} 条消息到 IndexedDB`)
        
        // ✅ 再加载到 conversations
        conversations[conversationId] = messages
        console.log(`✅ 从后端加载 ${messages.length} 条消息`)
        return messages
      }
    } catch (error) {
      console.error('❌ 从后端加载消息失败:', error)
    }
    
    // 3. 返回空数组
    conversations[conversationId] = []
    return []
  }

  /**
   * ✅ 注册红包事件回调（供组件订阅）
   */
  const onChainProgress = (callback) => {
    redPacketCallbacks.onChainProgress.push(callback)
    return () => {
      const index = redPacketCallbacks.onChainProgress.indexOf(callback)
      if (index > -1) redPacketCallbacks.onChainProgress.splice(index, 1)
    }
  }

  const onRedPacketClaimed = (callback) => {
    redPacketCallbacks.onRedPacketClaimed.push(callback)
    return () => {
      const index = redPacketCallbacks.onRedPacketClaimed.indexOf(callback)
      if (index > -1) redPacketCallbacks.onRedPacketClaimed.splice(index, 1)
    }
  }

  const onRedPacketStatusUpdate = (callback) => {
    redPacketCallbacks.onRedPacketStatusUpdate.push(callback)
    return () => {
      const index = redPacketCallbacks.onRedPacketStatusUpdate.indexOf(callback)
      if (index > -1) redPacketCallbacks.onRedPacketStatusUpdate.splice(index, 1)
    }
  }

  // ✅ 监听红包已领完事件
  const onRedPacketExhausted = (callback) => {
    redPacketCallbacks.onRedPacketExhausted.push(callback)
    return () => {
      const index = redPacketCallbacks.onRedPacketExhausted.indexOf(callback)
      if (index > -1) redPacketCallbacks.onRedPacketExhausted.splice(index, 1)
    }
  }

  const onMyRedPacketResult = (callback) => {
    redPacketCallbacks.onMyRedPacketResult.push(callback)
    return () => {
      const index = redPacketCallbacks.onMyRedPacketResult.indexOf(callback)
      if (index > -1) redPacketCallbacks.onMyRedPacketResult.splice(index, 1)
    }
  }
  
  // ✅ 监听私聊红包领取结果 (type=7)
  const onPrivateRedPacketReceived = (callback) => {
    redPacketCallbacks.onPrivateRedPacketReceived.push(callback)
    return () => {
      const index = redPacketCallbacks.onPrivateRedPacketReceived.indexOf(callback)
      if (index > -1) redPacketCallbacks.onPrivateRedPacketReceived.splice(index, 1)
    }
  }
  
  // ✅ 监听私聊红包发送成功
  const onPrivateRedPacketSent = (callback) => {
    redPacketCallbacks.onPrivateRedPacketSent.push(callback)
    return () => {
      const index = redPacketCallbacks.onPrivateRedPacketSent.indexOf(callback)
      if (index > -1) redPacketCallbacks.onPrivateRedPacketSent.splice(index, 1)
    }
  }

  // ✅ 监听成员被踢出事件
  const onMemberKicked = (callback) => {
    redPacketCallbacks.onMemberKicked.push(callback)
    return () => {
      const index = redPacketCallbacks.onMemberKicked.indexOf(callback)
      if (index > -1) redPacketCallbacks.onMemberKicked.splice(index, 1)
    }
  }
  
  // ✅ 监听群组信息广播
  const onGroupInfo = (callback) => {
    redPacketCallbacks.onGroupInfo.push(callback)
    return () => {
      const index = redPacketCallbacks.onGroupInfo.indexOf(callback)
      if (index > -1) redPacketCallbacks.onGroupInfo.splice(index, 1)
    }
  }
  
  // ✅ 监听成员累计领取更新
  const onMemberTotalReceivedUpdated = (callback) => {
    redPacketCallbacks.onMemberTotalReceivedUpdated.push(callback)
    return () => {
      const index = redPacketCallbacks.onMemberTotalReceivedUpdated.indexOf(callback)
      if (index > -1) redPacketCallbacks.onMemberTotalReceivedUpdated.splice(index, 1)
    }
  }

  /**
   * 显示被踢出提示卡片（参考 JoinSuccessModal 样式）
   */
  const showKickedOutModal = (data) => {
    console.log('🎭 显示被踢出提示卡片，完整数据:', data)
    console.log('📊 data.totalReceived:', data.totalReceived)
    console.log('📊 data.memberInfo?.totalReceived:', data.memberInfo?.totalReceived)
    console.log('📊 data.data?.memberInfo?.totalReceived:', data.data?.memberInfo?.totalReceived)
    
    const kickReason = data.reason || data.kickReason || '达到领取上限'
    // ✅ 兼容多种数据结构
    const totalReceived = data.totalReceived || data.memberInfo?.totalReceived || data.data?.memberInfo?.totalReceived || 0
    
    console.log('✅ 最终提取的累计领取金额:', totalReceived)
    
    // 创建弹窗
    const modal = document.createElement('div')
    modal.className = 'kicked-out-modal'
    modal.innerHTML = `
      <div class="kicked-out-content">
        <div class="kicked-out-header">
          <div class="kicked-out-icon">🎉</div>
          <h2 class="kicked-out-title">恭喜成功出局！</h2>
        </div>
        
        <div class="kicked-out-stats">
          <div class="stat-item">
            <span class="stat-label">累计领取</span>
            <span class="stat-value">¥${totalReceived}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">出局原因</span>
            <span class="stat-reason">${kickReason}</span>
          </div>
        </div>
        
        <div class="kicked-out-message">要玩继续买票进场</div>
        
        <button class="kicked-out-btn" id="confirmKickedOut">确定</button>
      </div>
    `
    
    // 添加样式（参考 JoinSuccessModal）
    const style = document.createElement('style')
    style.textContent = `
      .kicked-out-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(4px);
      }
      
      .kicked-out-content {
        background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
        border-radius: 20px;
        width: 90%;
        max-width: 400px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.3s ease-out;
      }
      
      @keyframes slideUp {
        from {
          transform: translateY(50px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      .kicked-out-header {
        padding: 24px 20px 16px;
        text-align: center;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .kicked-out-icon {
        font-size: 48px;
        margin-bottom: 12px;
        animation: bounce 0.6s ease-in-out;
      }
      
      @keyframes bounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
      }
      
      .kicked-out-title {
        color: #fff;
        font-size: 24px;
        font-weight: bold;
        margin: 0;
      }
      
      .kicked-out-stats {
        padding: 20px;
      }
      
      .stat-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .stat-item:last-child {
        border-bottom: none;
      }
      
      .stat-label {
        color: rgba(255, 255, 255, 0.9);
        font-size: 14px;
      }
      
      .stat-value {
        color: #ffd700;
        font-size: 18px;
        font-weight: bold;
      }
      
      .stat-reason {
        color: #fff;
        font-size: 14px;
      }
      
      .kicked-out-message {
        padding: 0 20px 20px;
        color: #fff;
        font-size: 16px;
        text-align: center;
        opacity: 0.95;
      }
      
      .kicked-out-btn {
        width: calc(100% - 40px);
        margin: 0 20px 24px;
        padding: 14px;
        background: #fff;
        color: #ee5a6f;
        border: none;
        border-radius: 12px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      
      .kicked-out-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      }
      
      .kicked-out-btn:active {
        transform: translateY(0);
      }
    `
    
    document.head.appendChild(style)
    document.body.appendChild(modal)
    
    // 绑定确定按钮 - 直接获取DOM元素
    const confirmBtn = modal.querySelector('#confirmKickedOut')
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        console.log('✅ 点击确定按钮，关闭弹窗')
        if (modal.parentNode) {
          document.body.removeChild(modal)
        }
        if (style.parentNode) {
          document.head.removeChild(style)
        }
      })
    } else {
      console.error('❌ 未找到确定按钮')
    }
  }

  /**
   * 清理对话数据
   */
  const clearConversation = (conversationId) => {
    if (conversations[conversationId]) {
      conversations[conversationId] = []
      console.log('🗑️ 已清理对话:', conversationId)
    }
  }
  
  /**
   * ✅ 清空所有数据（退出登录时调用）
   */
  const clearAllData = async () => {
    console.log('🗑️ 开始清空所有消息数据...')
    
    // 1. 清空内存中的对话
    for (const key of Object.keys(conversations)) {
      delete conversations[key]
    }
    console.log('✅ 已清空内存中的对话数据')
    
    // 2. 清空内存中的余额变动记录
    balanceChanges.value = []
    console.log('✅ 已清空内存中的余额变动记录')
    
    // 3. 清空消息去重 Set
    receivedMsgIds.clear()
    console.log('✅ 已清空消息去重记录')
    
    // 4. ⚠️ 暂时不清空 IndexedDB（避免误删其他用户数据）
    // try {
    //   const { clearAllMessages, clearAllBalanceChanges } = await import('@/utils/chatStorage')
    //   await clearAllMessages()
    //   await clearAllBalanceChanges()
    //   console.log('✅ 已清空 IndexedDB 中的数据')
    // } catch (error) {
    //   console.error('❌ 清空 IndexedDB 失败:', error)
    // }
    
    console.log('✅ 所有数据已清空')
  }

  return {
    conversations,
    balanceChanges,
    userBalance,
    receivedMsgIds,
    initSocketListeners,
    handleIncomingMessage,
    getMessages,
    getBalanceHistory,
    sendMessage,
    loadHistory,
    clearConversation,
    clearAllData,  // ✅ 清空所有数据（退出登录时调用）
    isDuplicateMessage,
    loadBalanceHistory,  // ✅ 导出加载函数
    // ✅ 新增：红包事件订阅
    onChainProgress,
    onRedPacketClaimed,
    onRedPacketStatusUpdate,
    onRedPacketExhausted,  // ✅ 红包已领完
    onMyRedPacketResult,
    onPrivateRedPacketReceived,  // ✅ 私聊红包领取结果 (type=7)
    onPrivateRedPacketSent,  // ✅ 私聊红包发送成功
    onMemberKicked,
    onGroupInfo,  // ✅ 群组信息广播
    onMemberTotalReceivedUpdated  // ✅ 成员累计领取更新
  }
}