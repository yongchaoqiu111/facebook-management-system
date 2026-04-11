import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { joinGroup, leaveGroup } from '@/socket'
import { useMessageCenter } from '@/composables/useMessageCenter'

/**
 * 接龙群聊天逻辑 Composable
 */
export function useChainGroupChat(chatId) {
  const router = useRouter()
  
  // 使用消息中心
  const { 
    getMessages, 
    sendMessage: sendMsg, 
    loadHistory 
  } = useMessageCenter()
  
  // 状态
  const currentContact = ref(null)
  const chainGroupInfo = ref(null)
  const messageInput = ref('')
  const showInviteModal = ref(false)
  const showInfoModal = ref(false)
  const showRedPacketModalVisible = ref(false)
  const showRedPacketResultModal = ref(false)
  const redPacketResult = ref({
    amount: 0,
    message: '',
    from: '',
    totalReceived: null
  })
  const chainWaitCountdown = ref('')
  
  const currentUserId = computed(() => 'current_user')

  // 返回
  const goBack = () => {
    router.push('/home')
  }

  // 分享群组
  const shareGroup = async () => {
    try {
      if (!chainGroupInfo.value) {
        alert('当前不是接龙群')
        return
      }
      
      const groupName = currentContact.value?.name || '接龙群'
      const groupId = currentContact.value?.id
      
      const inviteLink = `${window.location.origin}/invite?group=${groupId}`
      
      if (navigator.share) {
        await navigator.share({
          title: `加入${groupName}`,
          text: `邀请你加入${groupName}，一起参与接龙红包游戏！`,
          url: inviteLink
        })
      } else {
        await navigator.clipboard.writeText(inviteLink)
        alert('邀请链接已复制到剪贴板')
      }
    } catch (error) {
      console.error('分享失败:', error)
      alert('分享失败，请重试')
    }
  }

  // 加载接龙群信息
  const loadChainGroupInfo = async (groupId) => {
    try {
      // 模拟加载接龙群信息
      chainGroupInfo.value = {
        id: groupId,
        name: '接龙群',
        memberInfo: {
          canGrabAfter: new Date(Date.now() + 60000).toISOString()
        }
      }
    } catch (error) {
      console.error('加载接龙群信息失败:', error)
    }
  }

  // 加载聊天记录
  const loadChatHistory = async () => {
    await loadHistory(`group_${chatId}`)
    console.log('历史消息加载完成')
  }

  // 发送消息
  const sendMessage = async () => {
    if (!messageInput.value.trim()) return
    
    try {
      await sendMsg(`group_${chatId}`, {
        content: messageInput.value.trim(),
        type: 'text',
        clientMsgId: Date.now().toString() + Math.random().toString(36).substr(2, 9)
      })
      
      messageInput.value = ''
    } catch (error) {
      console.error('发送消息失败:', error)
      alert('发送失败，请重试')
    }
  }

  // 打开红包
  const openRedPacket = async (message) => {
    console.log('🔴 点击红包:', message)
    alert('红包功能暂未实现')
  }

  // 处理发送红包
  const handleSendRedPacket = async (redPacketData) => {
    console.log('🧧 发送接龙红包:', redPacketData)
    alert('红包发送功能暂未实现')
  }

  // 清理
  const cleanup = () => {
    leaveGroup(chatId)
  }

  // 加载聊天数据
  const init = async () => {
    // 初始化联系人
    currentContact.value = {
      id: chatId,
      name: '接龙群',
      avatar: '🐉',
      isGroup: true
    }
    
    // 加载接龙群信息
    await loadChainGroupInfo(chatId)
    
    // 加载聊天记录
    await loadChatHistory()
    
    // 加入群组
    joinGroup(chatId)
  }

  // 从消息中心获取消息
  const messages = computed(() => {
    return getMessages(`group_${chatId}`)
  })

  return {
    currentContact,
    chainGroupInfo,
    messages,
    messageInput,
    showInviteModal,
    showInfoModal,
    showRedPacketModalVisible,
    showRedPacketResultModal,
    redPacketResult,
    chainWaitCountdown,
    goBack,
    shareGroup,
    openRedPacket,
    sendMessage,
    handleSendRedPacket,
    init,
    cleanup
  }
}
