<template>
  <div class="chat-container">
    <!-- ✅ 顶部退出按钮（固定漂浮） -->
    <button class="floating-exit-btn" @click="goBack" title="退出聊天">
      ← 退出
    </button>

    <!-- 消息列表 -->
    <div class="messages" ref="messagesContainer">
      <div 
        v-for="msg in messages" 
        :key="msg.id || msg.clientMsgId"
        :class="['message-item', isSelfMessage(msg) ? 'self' : 'other']"
      >
        <!-- 别人的消息：头像在左 -->
        <div v-if="!isSelfMessage(msg)" class="message-avatar">👤</div>
        
        <!-- 红包消息 -->
        <div 
          v-if="msg.type === 'redPacket'" 
          :class="[
            'red-packet-card', 
            { 
              'red-packet-opened': msg.opened, 
              'red-packet-expired': msg.expired
            }
          ]"
          @click="openRedPacket(msg)"
        >
          <div class="packet-header">
            <span class="icon">🧧</span>
            <span class="title">{{ getPacketTitle(msg) }}</span>
          </div>
          <div class="packet-body">
            {{ msg.expired ? '已过期，无法领取' : '恭喜发财 大吉大利' }}
          </div>
          <div class="packet-footer">
            <span>{{ msg.amount }} USDT</span>
            <span>{{ msg.time }}</span>
          </div>
        </div>
        
        <!-- 文本消息 -->
        <div v-else class="text-message">
          <div class="bubble">{{ msg.content }}</div>
          <div class="time">{{ msg.time }}</div>
        </div>
        
        <!-- 自己的消息：头像在右 -->
        <div v-if="isSelfMessage(msg)" class="message-avatar self-avatar">😊</div>
      </div>
    </div>

    <!-- ✅ 底部 Footer（只包含输入框） -->
    <footer class="chat-footer">
      <!-- 输入框区域 -->
      <div class="input-area">
        <input 
          v-model="messageInput" 
          placeholder="输入消息..."
          @keyup.enter="sendMessage"
          @focus="handleInputFocus"
        />
        <button class="send-btn-ios" @click="sendMessage" :disabled="!messageInput.trim()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="white"/>
          </svg>
        </button>
      </div>
    </footer>
    
    <!-- ✅ 底部工具栏（透明，在 footer 外面） -->
    <div class="toolbar">
      <button class="tool-icon" @click="startVoiceCall" title="语音通话">📞</button>
      <button class="tool-icon" @click="startVideoCall" title="视频通话">📹</button>
      <button class="tool-icon" @click="showRedPacketModal = true" title="红包">🧧</button>
      <button class="tool-icon" title="图片">🖼️</button>
      <button class="tool-icon" title="表情">😎</button>
    </div>
    
    <!-- 红包弹窗 -->
    <div v-if="showRedPacketModal" class="modal-overlay" @click.self="showRedPacketModal = false">
      <div class="modal-content">
        <h3>发送私聊红包</h3>
        <div class="form-group">
          <label>红包金额 (USDT)</label>
          <input type="number" v-model.number="redPacketAmount" placeholder="10" min="1" step="0.01" />
        </div>
        <div class="form-group">
          <label>祝福语（可选）</label>
          <input type="text" v-model="redPacketBlessing" placeholder="恭喜发财，大吉大利" />
        </div>
        <div class="modal-actions">
          <button class="cancel-btn" @click="showRedPacketModal = false">取消</button>
          <button class="confirm-btn" @click="sendRedPacket" :disabled="sending">{{ sending ? '发送中...' : '发送' }}</button>
        </div>
      </div>
    </div>
    
    <!-- 🧧 红包弹窗 -->
    <div v-if="showOpenRedPacketModal" class="red-packet-modal" :class="{ show: showOpenRedPacketModal }" @click="closeRedPacketModal">
      <div class="red-packet-modal-box" @click.stop>
        <!-- 未领取状态 - 显示红包封面和“开”按钮 -->
        <div v-if="!currentRedPacket?.opened" class="red-packet-unopened">
          <div class="red-packet-cover-header">
            <span class="red-packet-icon">🧧</span>
          </div>
          <div class="red-packet-cover-title">恭喜发财 大吉大利</div>
          <button class="red-packet-open-btn" :disabled="opening" @click="doOpenRedPacket">
            {{ opening ? '开...' : '开' }}
          </button>
          <div v-if="openError" class="open-error">{{ openError }}</div>
        </div>
        
        <!-- 已领取状态 - 上红下白 -->
        <div v-else class="red-packet-opened-result">
          <div class="red-packet-top">
            <div class="red-packet-cover-header">
              <span class="red-packet-icon">🧧</span>
            </div>
            <div class="red-packet-cover-title">{{ isSender ? '红包已被领取' : '红包已领取' }}</div>
          </div>
          <div class="red-packet-bottom">
            <div class="result-amount">
              <span class="result-amount-value">{{ openedAmount }}</span>
              <span class="result-amount-unit">USDT</span>
            </div>
            <div class="result-hint">
              {{ isSender ? (contact.name || '对方') + '已领取' : '你已领取' }}
            </div>
            <button class="result-close-btn" @click="closeRedPacketModal">确定</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- ✅ 红包发送成功弹窗 -->
    <div v-if="showSendSuccessModal" class="red-packet-success-modal" :class="{ show: showSendSuccessModal }">
      <div class="success-content">
        <div class="success-icon">✅</div>
        <div class="success-title">红包发送成功！</div>
        <div class="success-amount">总金额：{{ sendSuccessData.amount }} USDT</div>
        <div class="success-count">发给 {{ sendSuccessData.to }}</div>
        <button class="success-btn" @click="showSendSuccessModal = false">确定</button>
      </div>
    </div>
    
    <!-- ✅ Toast 提示 -->
    <Toast ref="toastRef" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSocket } from '@/socket'
import { useMessageCenter } from '@/composables/useMessageCenter'
import { saveMessages } from '@/utils/chatStorage'
import Toast from '@/components/Toast.vue'
import { showToast } from '@/utils/toast'
import './PrivateChat.css'  // ✅ 引入外部CSS文件

const route = useRoute()
const router = useRouter()
const chatId = route.params.id

const navigate = (path) => {
  router.push(path)
}

// 红包相关状态
const showRedPacketModal = ref(false)
const redPacketAmount = ref(10)
const redPacketBlessing = ref('')
const sending = ref(false)
const messagesContainer = ref(null)
const messageInput = ref('')
const contact = ref({
  avatar: '👤',
  name: '好友'
})

// 🧧 拆红包弹窗状态
const showOpenRedPacketModal = ref(false)
const currentRedPacket = ref(null)
const openedAmount = ref(0)
const openError = ref('')
const opening = ref(false) // ✅ 防止重复点击

// ✅ Toast 引用
const toastRef = ref(null)

// ✅ 订阅红包领取结果回调（统一事件监听）
let unsubscribeMyRedPacketResult = null

// ✅ 红包发送成功弹窗
const showSendSuccessModal = ref(false)
const sendSuccessData = ref({ amount: 0, to: '' })

// 📞 音视频通话相关
const startVoiceCall = () => {
  console.log('📞 [PrivateChat] 发起语音通话')
  const callId = generateCallId()
  router.push({
    path: '/call',
    query: {
      callId,
      callerId: chatId,
      callerName: contact.value.name,
      callerAvatar: contact.value.avatar,
      type: 'audio'
    }
  })
}

const startVideoCall = () => {
  console.log('📹 [PrivateChat] 发起视频通话')
  const callId = generateCallId()
  router.push({
    path: '/call',
    query: {
      callId,
      callerId: chatId,
      callerName: contact.value.name,
      callerAvatar: contact.value.avatar,
      type: 'video'
    }
  })
}

// 生成唯一通话 ID
const generateCallId = () => {
  return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// ✅ 从 WebSocket 获取好友信息
const socket = getSocket()
if (socket) {
  // 监听好友列表更新
  socket.on('friendListUpdated', (data) => {
    console.log('👥 [PrivateChat] 收到好友列表:', data)
    
    // 查找当前聊天对象的信息
    const friend = data.friends?.find(f => f.userId === chatId || f._id === chatId)
    if (friend) {
      contact.value = {
        avatar: friend.avatar || '👤',
        name: friend.username || friend.name || '好友'
      }
      console.log('✅ [PrivateChat] 找到好友信息:', contact.value)
    } else {
      console.log('⚠️ [PrivateChat] 未找到好友信息, chatId:', chatId)
    }
  })
}

// 使用消息中心
const { 
  getMessages, 
  sendMessage: sendMsg, 
  loadHistory,
  initSocketListeners,
  userBalance,
  onMyRedPacketResult  // ✅ 订阅红包领取结果（本地弹窗用）
} = useMessageCenter()

const currentUserId = computed(() => localStorage.getItem('userId'))
const messages = computed(() => getMessages(chatId))

// ✅ 判断是否是发送方
const isSender = computed(() => {
  if (!currentRedPacket.value) return false
  return String(currentRedPacket.value.senderId) === String(currentUserId.value)
})

// ✅ iOS 键盘适配：输入框聚焦时滚动
const handleInputFocus = (e) => {
  setTimeout(() => {
    e.target.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest'
    })
  }, 300)
}

// 返回
const goBack = () => {
  router.push('/home')
}

// 发送消息
const sendMessage = async () => {
  console.log('📤 [sendMessage] 触发发送消息')
  console.log('📤 [sendMessage] messageInput:', messageInput.value)
  console.log('📤 [sendMessage] chatId:', chatId)
  
  if (!messageInput.value.trim()) {
    console.log('⚠️ [sendMessage] 消息为空，不发送')
    return
  }
  
  try {
    const currentUserId = localStorage.getItem('userId')
    const now = new Date()
    const time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0')
    
    // ✅ 乐观更新：先在本地显示消息
    const tempMessage = {
      id: `temp_${Date.now()}`,
      type: 'text',
      content: messageInput.value.trim(),
      senderId: currentUserId,
      isSelf: true,
      direction: 0,  // 0=自己
      time: time,
      timestamp: now.toISOString(),
      chatId: chatId,
      clientMsgId: `msg_${Date.now()}`
    }
    
    // ✅ 添加到 conversations（单例模式，会自动响应式更新）
    const { conversations } = useMessageCenter()
    if (!conversations[chatId]) {
      conversations[chatId] = []
    }
    conversations[chatId].push(tempMessage)
    
    // ✅ 保存到 IndexedDB
    await saveMessages([tempMessage])
    console.log('✅ 乐观更新：消息已添加到本地')
    
    // ✅ 私聊标准接口：通过 WebSocket 发送消息
    const socket = getSocket()
    socket.emit('chat:privateMessage', {
      receiverId: chatId,  // 接收者ID
      content: messageInput.value.trim(),
      type: 'text',
      clientMsgId: tempMessage.clientMsgId
    })
    
    console.log('✅ 私聊消息已通过 WSS 发送')
    
    // 清空输入框
    messageInput.value = ''
    
  } catch (error) {
    console.error('❌ [sendMessage] 发送消息失败:', error)
  }
}

// ✅ 发送私聊红包（使用 WebSocket）
const sendRedPacket = async () => {
  if (!redPacketAmount.value || redPacketAmount.value <= 0) {
    showToast('请输入有效的红包金额', 'warning')
    return
  }
  
  const socket = getSocket()
  if (!socket || !socket.connected) {
    showToast('WebSocket 未连接，请稍后重试', 'error')
    return
  }
  
  sending.value = true
  
  try {
    const socket = getSocket()
    
    console.log('📤 发送私聊红包:', {
      receiverId: chatId,
      amount: redPacketAmount.value,
      message: redPacketBlessing.value || '恭喜发财，大吉大利'
    })
    
    // 通过 WebSocket 发送私聊红包
    socket.emit('chat:sendPrivateRedPacket', {
      receiverId: chatId,
      amount: redPacketAmount.value,
      message: redPacketBlessing.value || '恭喜发财，大吉大利'
    })
    
    // 关闭弹窗，由消息中心统一处理消息添加和成功提示
    showRedPacketModal.value = false
    
    // ✅ 不再立即显示成功弹窗，等待 MessageCenter 收到 privateRedPacket 消息后再显示
    
    redPacketAmount.value = 10
    redPacketBlessing.value = ''
    sending.value = false
    
  } catch (error) {
    console.error('❌ 私聊红包发送异常:', error)
    showToast(error.message || '发送失败', 'error')
    sending.value = false
  }
}

// 🧧 打开红包
const openRedPacket = async (message) => {
  console.log('🔴 点击红包:', message)
  
  // ✅ 判断是否是自己发的红包
  const currentUserId = localStorage.getItem('userId')
  const isSender = String(message.senderId) === String(currentUserId)
  
  // ✅ 如果是发送方，直接显示发送成功状态（不发请求）
  if (isSender) {
    currentRedPacket.value = message
    openedAmount.value = message.amount || 0  // 显示总金额
    openError.value = ''
    // 标记为已发送（不是已领取）
    if (!message.opened) {
      message.opened = true  // 让弹窗显示已领取状态
      message.openedAmount = message.amount  // 显示总金额
    }
    showOpenRedPacketModal.value = true
    return
  }
  
  // ✅ 如果已经领取过，直接显示结果页，不发请求
  if (message.opened) {
    currentRedPacket.value = message
    // ✅ 发送方显示总金额，接收方显示自己领取的金额
    openedAmount.value = isSender ? message.amount : (message.openedAmount || 0)
    openError.value = ''
    showOpenRedPacketModal.value = true
    return
  }
  
  if (message.expired) {
    showOpenRedPacketModal.value = true
    openError.value = '该红包已过期，无法领取'
    return
  }
  
  // 显示拆红包弹窗（未领取状态）
  currentRedPacket.value = message
  showOpenRedPacketModal.value = true
  openedAmount.value = 0
  openError.value = ''
}

// 🧧 执行拆红包
const doOpenRedPacket = async () => {
  // ✅ 防止重复点击
  if (opening.value) {
    console.log('⚠️ 正在领取中，请勿重复点击')
    return
  }
  
  const socket = getSocket()
  if (!socket || !socket.connected) {
    openError.value = 'WebSocket 未连接'
    return
  }
  
  if (!currentRedPacket.value) {
    openError.value = '红包数据异常'
    return
  }
  
  opening.value = true
  
  // 发送领取请求
  try {
    const redPacketIdToSend = String(currentRedPacket.value.redPacketId || currentRedPacket.value.id)
    console.log('📤 发送领取请求，redPacketId:', redPacketIdToSend)
    
    socket.emit('chat:openPrivateRedPacket', {
      redPacketId: redPacketIdToSend
    })
  } catch (error) {
    console.error('❌ 打开红包异常:', error)
    openError.value = '操作失败，请重试'
    opening.value = false
  }
}

// 关闭红包弹窗
const closeRedPacketModal = () => {
  showOpenRedPacketModal.value = false
  currentRedPacket.value = null
  openedAmount.value = 0
  openError.value = ''
}

// 判断是否为自己的消息
const isSelfMessage = (msg) => {
  const currentUserId = localStorage.getItem('userId')
  
  if (msg.direction !== undefined && msg.direction !== null) {
    return msg.direction === 0
  }
  
  if (msg.isSelf !== undefined && msg.isSelf !== null) {
    return msg.isSelf === true
  }
  
  return msg.senderId === currentUserId
}

// ✅ 自动滚动到底部（和接龙群一样）
watch(() => messages.value.length, () => {
  setTimeout(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  }, 100)
})

// 获取红包标题
const getPacketTitle = (msg) => {
  if (msg.expired) return '已过期'
  if (msg.opened) return '已领取'
  return '私聊红包'
}

onMounted(async () => {
  console.log('✅ 私聊页面加载:', chatId)
  
  const currentUserId = localStorage.getItem('userId')
  const socket = getSocket()
  
  // ✅ 加入两个房间：自己的ID 和 对方ID
  if (socket && socket.connected) {
    socket.emit('joinGroup', currentUserId)  // 加入自己的房间
    socket.emit('joinGroup', chatId)  // 加入对方的房间
    console.log('✅ 已加入房间:', currentUserId, '和', chatId)
  }
  
  // 初始化消息中心
  initSocketListeners()
  
  // ✅ 监听 errorMessage 事件（余额不足等错误）
  if (socket) {
    const handleErrorMessage = (data) => {
      console.log('⚠️ [PrivateChat] 收到消息:', data)
      
      let msg = ''
      if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        msg = data.msg || data.message || ''
      } else if (Array.isArray(data) && data.length > 0) {
        const firstItem = data[0]
        if (typeof firstItem === 'object' && firstItem !== null) {
          msg = firstItem.msg || firstItem.message || ''
        } else {
          msg = String(firstItem)
        }
      } else if (typeof data === 'string') {
        msg = data
      }
      
      console.log('🔍 [PrivateChat] 解析后的消息:', msg)
      
      if (msg) {
        // ✅ 判断是成功还是错误消息
        if (msg.includes('成功') || msg.includes('已发送')) {
          // 成功消息 - 绿色 Toast
          if (toastRef.value) {
            toastRef.value.success(msg)
          }
        } else {
          // 错误消息 - 红色 Toast
          if (toastRef.value) {
            toastRef.value.error(msg)
          }
        }
      }
      
      sending.value = false
    }
    
    socket.on('errorMessage', handleErrorMessage)
    
    // 组件卸载时移除监听
    onUnmounted(() => {
      socket.off('errorMessage', handleErrorMessage)
    })
  }
  
  // ✅ 订阅红包领取结果回调（统一事件监听）
  unsubscribeMyRedPacketResult = onMyRedPacketResult((data) => {
    console.log('🎉 [PrivateChat] 收到红包领取结果:', data)
    
    // ✅ 更新本地消息状态
    const targetMsg = currentRedPacket.value
    if (targetMsg) {
      targetMsg.opened = true
      targetMsg.openedAmount = data.amount || 0
      targetMsg.title = '已领取'
      
      // 保存到 IndexedDB
      saveMessages([targetMsg]).then(() => {
        console.log('✅ 已保存红包状态到 IndexedDB')
      })
    }
    
    openedAmount.value = data.amount || 0
    opening.value = false
    
    // 3秒后自动关闭
    setTimeout(() => {
      closeRedPacketModal()
    }, 3000)
  })
  
  // 加载历史消息
  await loadHistory(chatId)
  
  // 滚动到底部
  setTimeout(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  }, 100)
})

onUnmounted(() => {
  console.log('私聊页面卸载')
  
  // ✅ 取消订阅红包领取结果回调
  if (unsubscribeMyRedPacketResult) {
    unsubscribeMyRedPacketResult()
    unsubscribeMyRedPacketResult = null
  }
})
</script>
