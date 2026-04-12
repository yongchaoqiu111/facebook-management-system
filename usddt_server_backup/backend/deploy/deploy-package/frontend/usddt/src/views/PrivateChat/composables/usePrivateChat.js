import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { initSocket, joinRoom, sendPrivateMessage, onPrivateMessage, disconnectSocket } from '@/socket'
import { useMessageCenter } from '@/composables/useMessageCenter'

/**
 * 私聊逻辑 Composable
 */
export function usePrivateChat(chatId) {
  const router = useRouter()
  
  // ✅ 使用消息中心
  const { conversations, loadHistory } = useMessageCenter()
  
  // 状态
  const contact = ref(null)
  const messageInput = ref('')
  const messagesContainer = ref(null)
  
  // ✅ 计算属性：直接从 conversations 获取消息
  const currentUserId = localStorage.getItem('userId')
  const ids = [currentUserId, chatId].sort()
  const conversationId = `private_${ids[0]}_${ids[1]}`
  const messages = computed(() => conversations[conversationId] || [])
  
  // 返回
  const goBack = () => {
    router.push('/home')
  }
  
  // 发送消息
  const sendMessage = () => {
    if (!messageInput.value.trim()) return
    
    sendPrivateMessage({
      receiverId: chatId,
      content: messageInput.value
    })
    
    messageInput.value = ''
    scrollToBottom()
  }
  
  // 滚动到底部
  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    }, 100)
  }
  
  // 加载聊天记录
  const loadChatHistory = async () => {
    // ✅ 使用消息中心加载历史
    await loadHistory(conversationId)
    scrollToBottom()
  }
  
  // 初始化
  const init = () => {
    // 初始化联系人
    contact.value = {
      id: chatId,
      name: '好友',
      avatar: '👤'
    }
    
    // 加载历史消息
    loadChatHistory()
  }
  
  // 清理
  const cleanup = () => {
    // 注意：不断开 Socket，保持全局连接
  }
  
  return {
    contact,
    messages,
    messageInput,
    messagesContainer,
    goBack,
    sendMessage,
    init,
    cleanup
  }
}
