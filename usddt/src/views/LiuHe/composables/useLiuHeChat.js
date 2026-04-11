import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { initSocket, joinGroup, onGroupMessage, onGroupRedPacket } from '@/socket'
import { saveMessages, getMessagesByChatId } from '@/utils/chatStorage'

// ✅ API 基础 URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

const LIUHE_GROUP_ID = '69d4ac8...' // 六合天下群ID

/**
 * 六合天下聊天逻辑 Composable
 */
export function useLiuHeChat() {
  // 状态
  const chatMessages = ref([])
  const messageInput = ref('')
  const showLiveCard = ref(false)
  const showBillCard = ref(false)
  const latestLotteryResult = ref(null)
  const marqueeText = ref('')
  
  // 计算属性
  const currentUserId = computed(() => localStorage.getItem('userId'))
  
  // 发送消息
  const sendMessage = async () => {
    if (!messageInput.value.trim()) return
    
    const msg = {
      id: `liuhe_${Date.now()}`,
      type: 'text',
      content: messageInput.value,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      isSelf: true,
      chatId: LIUHE_GROUP_ID,  // ✅ 添加 chatId
      timestamp: Date.now(),  // ✅ 添加 timestamp
      senderId: currentUserId.value,
      groupId: LIUHE_GROUP_ID
    }
    
    chatMessages.value.push(msg)
    
    // ✅ 保存到 IndexedDB
    try {
      await saveMessages([msg])
      console.log('💾 [LiuHe] 已保存到 IndexedDB')
    } catch (error) {
      console.error('❌ [LiuHe] 保存失败:', error)
    }
    
    messageInput.value = ''
  }
  
  // 获取开奖结果（带缓存）
  const getLatestLotteryResult = async () => {
    const cached = localStorage.getItem('liuhe_lottery_result')
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (parsed.cacheDate === new Date().toISOString().split('T')[0]) {
          latestLotteryResult.value = parsed.data
          updateMarqueeText()
          return
        }
      } catch (e) {
        console.warn('解析缓存失败')
      }
    }
    
    // 请求后端
    try {
      const response = await axios.get(`${API_BASE_URL}/lottery/latest`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      
      if (response.data.success) {
        latestLotteryResult.value = response.data.data
        
        // 缓存
        localStorage.setItem('liuhe_lottery_result', JSON.stringify({
          data: response.data.data,
          cacheDate: new Date().toISOString().split('T')[0]
        }))
        
        updateMarqueeText()
      }
    } catch (error) {
      console.error('获取开奖结果失败:', error)
    }
  }
  
  // 更新跑马灯文字
  const updateMarqueeText = () => {
    if (latestLotteryResult.value) {
      const result = latestLotteryResult.value
      marqueeText.value = `🎉 第${result.lotteryPeriod}期 | 特码: ${result.specialNumber} (${result.specialZodiac})`
    }
  }
  
  // 加载聊天记录
  const loadChatHistory = async () => {
    // ✅ 从 IndexedDB 加载
    const indexedMessages = await getMessagesByChatId(LIUHE_GROUP_ID, 500)
    if (indexedMessages && indexedMessages.length > 0) {
      chatMessages.value = indexedMessages.filter(msg => msg.type !== 'system')
      console.log(`✅ [LiuHe] 从 IndexedDB 加载 ${indexedMessages.length} 条消息`)
    }
  }
  
  // 初始化
  const init = () => {
    loadChatHistory()
    getLatestLotteryResult()
    
    initSocket()
    joinGroup(LIUHE_GROUP_ID)
    
    // 监听群消息
    onGroupMessage(async (data) => {
      if (String(data.groupId) === String(LIUHE_GROUP_ID)) {
        const msg = {
          id: data._id || `liuhe_${Date.now()}`,
          type: 'text',
          content: data.content,
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          isSelf: false,
          chatId: LIUHE_GROUP_ID,  // ✅ 添加 chatId
          timestamp: data.timestamp || Date.now(),  // ✅ 添加 timestamp
          senderId: data.senderId || data.sender?._id,
          groupId: LIUHE_GROUP_ID
        }
        
        chatMessages.value.push(msg)
        
        // ✅ 保存到 IndexedDB
        try {
          await saveMessages([msg])
          console.log('💾 [LiuHe] 收到消息已保存')
        } catch (error) {
          console.error('❌ [LiuHe] 保存失败:', error)
        }
      }
    })
  }
  
  // 清理
  const cleanup = () => {
    // 清理工作
  }
  
  return {
    chatMessages,
    messageInput,
    showLiveCard,
    showBillCard,
    latestLotteryResult,
    marqueeText,
    currentUserId,
    sendMessage,
    getLatestLotteryResult,
    init,
    cleanup
  }
}
