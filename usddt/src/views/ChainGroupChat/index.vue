<template>
  <div class="chat-container">
    <!-- ✅ 顶部退出按钮（固定漂浮） -->
    <button class="floating-exit-btn" @click="goBack" title="退出聊天">
      ← 退出
    </button>

    <!-- 聊天头部 -->
    <ChatHeader 
      :contact="currentContact"
      :chain-group-info="chainGroupInfo"
      @back="goBack"
      @invite="showInviteModal = true"
      @share="shareGroup"
      @info="showInfoModal = true"
    />

    <!-- 接龙群状态条 -->
    <ChainStatusBar 
      :chain-group-info="chainGroupInfo"
      :wait-countdown="chainWaitCountdown"
    />
    


    <!-- 消息列表 -->
    <MessageList
      :messages="messages"
      @open-red-packet="openRedPacket"
    />

    <!-- 输入框 -->
    <ChatInput
      v-model="messageInput"
      @send="sendMessage"
      @show-red-packet="showRedPacketModalVisible = true"
    />

    <!-- 邀请弹窗 -->
    <InviteModal 
      v-if="showInviteModal"
      :group-id="currentContact?.id"
      @close="showInviteModal = false"
    />
    
    <!-- 说明弹窗 -->
    <InfoModal
      v-if="showInfoModal"
      @close="showInfoModal = false"
    />
    
    <!-- 红包弹窗 -->
    <RedPacketModal
      v-if="showRedPacketModalVisible"
      @close="showRedPacketModalVisible = false"
      @send="handleSendRedPacket"
    />
    
    <!-- 抢红包结果弹窗 -->
    <div v-if="showRedPacketResultModal" class="modal-overlay" @click="showRedPacketResultModal = false">
      <div class="red-packet-result-modal" @click.stop>
        <div class="result-header">
          <div class="result-icon">🧧</div>
          <h3>恭喜抢到红包！</h3>
        </div>
        <div class="result-body">
          <div class="result-amount">
            <span class="amount-value">{{ redPacketResult.amount }}</span>
            <span class="amount-unit">USDT</span>
          </div>
          <div class="result-message">{{ redPacketResult.message }}</div>
          <div class="result-from">来自 {{ redPacketResult.from }}</div>
          <div v-if="redPacketResult.totalReceived" class="result-total">
            累计领取: {{ redPacketResult.totalReceived }} USDT
          </div>
        </div>
        <button class="result-close-btn" @click="showRedPacketResultModal = false">开心收下</button>
      </div>
    </div>

    <!-- Toast 提示 -->
    <Toast ref="toastRef" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ChatHeader from '@/components/ChatHeader.vue'
import ChainStatusBar from './components/ChainStatusBar.vue'
import MessageList from './components/MessageList.vue'
import ChatInput from './components/ChatInput.vue'
import InviteModal from './modals/InviteModal.vue'
import InfoModal from './modals/InfoModal.vue'
import RedPacketModal from './modals/RedPacketModal.vue'
import Toast from '@/components/Toast.vue'
import { useChainGroupChat } from './composables/useChainGroupChat'
import { useMessageCenter } from '@/composables/useMessageCenter'
import { getSocket } from '@/socket'

const route = useRoute()
const chatId = route.params.id
const toastRef = ref(null)

// ✅ 使用消息中心订阅红包事件
const messageCenter = useMessageCenter()

// 接龙进度状态
const chainProgress = ref({
  totalClaimed: 0,
  threshold: 380,
  entryFee: 310,
  remainToThreshold: 380,
  isExceeded: false,
  status: 'active',
  topClaimers: []
})

const redPacketBill = ref([])

// ✅ 订阅取消函数
let unsubscribeChainProgress = null
let unsubscribeRedPacketClaimed = null
let unsubscribeRedPacketStatusUpdate = null
let unsubscribeMyRedPacketResult = null

// 使用 composable（传递 toastRef）
const {
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
  handleSendRedPacket: sendRedPacketFromComposable,
  init,
  cleanup
} = useChainGroupChat(chatId, toastRef)

// ✅ 路由实例
const router = useRouter()

// 更新接龙进度
function updateChainProgress(data) {
  chainProgress.value = {
    totalClaimed: data.totalClaimed,
    threshold: data.threshold,
    entryFee: data.entryFee,
    remainToThreshold: data.remainToThreshold,
    isExceeded: data.isExceeded,
    status: data.status,
    topClaimers: data.topClaimers || []
  }
}

// 更新红包账单
function updateRedPacketBill(data) {
  const record = {
    id: data._id || Date.now().toString(),
    userId: data.userId,
    username: data.username || '用户' + data.userId.substr(-4),
    amount: data.amount,
    time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  
  redPacketBill.value.push(record)
}

// 更新红包状态
function updateRedPacketStatus(data) {
  console.log('🔄 红包状态变更:', data)
  // TODO: 根据业务需求处理状态变更
}

// 显示我的抢红包结果
async function showMyResult(data) {
  console.log('🎉 抢红包结果:', data)
  console.log('📊 [调试] data.totalReceived:', data.totalReceived)
  console.log('📊 [调试] chainGroupInfo.value:', chainGroupInfo.value)
  console.log('📊 [调试] chainGroupInfo.value?.memberInfo:', chainGroupInfo.value?.memberInfo)
  
  redPacketResult.value = {
    amount: data.amount,
    message: data.message,
    from: data.from,
    balance: data.balance,
    totalReceived: data.totalReceived || 0
  }
  
  // ✅ 更新累计领取金额（顶部状态栏）
  if (data.totalReceived !== undefined && data.totalReceived !== null && chainGroupInfo.value) {
    if (!chainGroupInfo.value.memberInfo) {
      chainGroupInfo.value.memberInfo = {}
    }
    const oldValue = chainGroupInfo.value.memberInfo.totalReceived
    chainGroupInfo.value.memberInfo.totalReceived = Number(data.totalReceived)
    console.log('📊 [调试] 更新前:', oldValue, '-> 更新后:', chainGroupInfo.value.memberInfo.totalReceived)
    // 强制触发响应式更新
    chainGroupInfo.value = { ...chainGroupInfo.value }
    console.log('📊 更新累计领取金额:', data.totalReceived)
    console.log('📊 [调试] 更新后 chainGroupInfo.value:', chainGroupInfo.value)
  } else {
    console.warn('⚠️ [调试] 未执行更新逻辑')
    console.warn('⚠️ [调试] data.totalReceived:', data.totalReceived)
    console.warn('⚠️ [调试] chainGroupInfo.value:', chainGroupInfo.value)
  }
  
  // ✅ 更新消息列表中的红包状态（变色）
  // ⚠️ 接龙红包不应该在这里变色，等待 chainRedPacketProgress (status='completed') 时才变色
  if (data.redPacketId) {
    const messagesList = messageCenter.getMessages(`group_${chatId}`)
    const targetMsg = messagesList.find(m => m.redPacketId === data.redPacketId)
    if (targetMsg) {
      // ✅ 接龙红包：不立即变色，只记录领取结果
      console.log('⏭️ 跳过接龙红包变色，等待接龙完成')
      
      // ✅ 保存到 LocalStorage（不修改 opened 状态）
      const { saveChatHistory } = await import('@/utils/storage')
      const rawId = chatId
      saveChatHistory(rawId, messagesList)
    }
  }
  
  showRedPacketResultModal.value = true
}

onMounted(() => {
  // ✅ 设置全局变量，供 MessageCenter 检测被踢出
  window._currentChatId = chatId
  
  init()
  
  // ✅ 订阅消息中心的红包事件
  unsubscribeChainProgress = messageCenter.onChainProgress((data) => {
    console.log('📊 接龙进度更新:', data)
    updateChainProgress(data)
  })
  
  unsubscribeRedPacketClaimed = messageCenter.onRedPacketClaimed((data) => {
    console.log('💰 有人领取红包:', data)
    updateRedPacketBill(data)
  })
  
  unsubscribeRedPacketStatusUpdate = messageCenter.onRedPacketStatusUpdate((data) => {
    console.log('🔄 红包状态变更:', data)
    updateRedPacketStatus(data)
  })
  
  unsubscribeMyRedPacketResult = messageCenter.onMyRedPacketResult((data) => {
    console.log('🎉 我抢到了红包:', data)
    showMyResult(data)
    
    // 🔄 刷新接龙群信息（更新 totalReceived）
    if (chatId) {
      loadChainGroupInfo(chatId)
    }
  })
  
  // ✅ 监听被踢出群组事件（由 MessageCenter 触发）
  const handleKickedFromGroup = (event) => {
    console.log('⚠️ [ChainGroupChat] 收到被踢出事件:', event.detail)
    toastRef.value?.error('您已被移出该群组')
    setTimeout(() => {
      router.push('/home')
    }, 1500)
  }
  window.addEventListener('kickedFromGroup', handleKickedFromGroup)
  
  // 保存监听器引用，用于卸载时移除
  window._handleKickedFromGroup = handleKickedFromGroup
  
  // ✅ 监听 errorMessage 事件（处理红包重复领取等错误）
  const socket = getSocket()
  if (socket) {
    const handleErrorMessage = (data) => {
      console.log('⚠️ [ChainGroupChat] 收到错误消息:', data)
      
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
      
      console.log('🔍 [ChainGroupChat] 解析后的消息:', msg)
      
      // ✅ 如果是因为重复领取红包，退出群组并标记需要付费
      if (msg.includes('Already opened')) {
        console.log('🚫 检测到重复领取红包，退出群组')
        toastRef.value?.error('红包已领取，请重新付费进群')
        
        // ✅ 标记该群组需要付费（存入 localStorage）
        const userId = localStorage.getItem('userId')
        if (userId && chatId) {
          localStorage.setItem(`needPay_${userId}_${chatId}`, 'true')
          console.log('✅ 已标记群组需要付费:', chatId)
          
          // ✅ 更新群组缓存：从 members 中移除当前用户
          const groupsCache = localStorage.getItem(`groups_${userId}`)
          if (groupsCache) {
            try {
              const groups = JSON.parse(groupsCache)
              const targetGroup = groups.find(g => g._id === chatId || g.id === chatId)
              if (targetGroup && targetGroup.members) {
                // 从 members 中移除当前用户
                targetGroup.members = targetGroup.members.filter(m => 
                  m.userId !== userId && m._id !== userId
                )
                console.log('✅ 已从缓存中移除当前用户')
                
                // 保存更新后的缓存
                localStorage.setItem(`groups_${userId}`, JSON.stringify(groups))
                console.log('✅ 已更新群组缓存')
              }
            } catch (error) {
              console.error('❌ 更新群组缓存失败:', error)
            }
          }
        }
        
        // ✅ 退出群组，返回首页
        setTimeout(() => {
          router.push('/home')
        }, 1500)
      } else if (msg.includes('Not a member')) {
        // ✅ 如果不在群里（被踢出），直接退出
        console.log('🚫 检测到不在群组中，退出页面')
        toastRef.value?.error('您已被移出该群组')
        
        setTimeout(() => {
          router.push('/home')
        }, 1500)
      } else if (msg) {
        // 其他错误消息
        toastRef.value?.error(msg)
      }
    }
    
    socket.on('errorMessage', handleErrorMessage)
    
    // 保存监听器引用
    window._handleChainErrorMessage = handleErrorMessage
  }
})

onUnmounted(() => {
  // ✅ 取消订阅，防止内存泄漏
  if (unsubscribeChainProgress) unsubscribeChainProgress()
  if (unsubscribeRedPacketClaimed) unsubscribeRedPacketClaimed()
  if (unsubscribeRedPacketStatusUpdate) unsubscribeRedPacketStatusUpdate()
  if (unsubscribeMyRedPacketResult) unsubscribeMyRedPacketResult()
  
  // ✅ 移除被踢出事件监听
  if (window._handleKickedFromGroup) {
    window.removeEventListener('kickedFromGroup', window._handleKickedFromGroup)
    delete window._handleKickedFromGroup
  }
  
  // ✅ 移除 errorMessage 监听
  const socket = getSocket()
  if (socket && window._handleChainErrorMessage) {
    socket.off('errorMessage', window._handleChainErrorMessage)
    delete window._handleChainErrorMessage
  }
  
  // ✅ 清除全局变量
  delete window._currentChatId
  
  cleanup()
})

// 处理发送红包（包装一层，添加 Toast 提示）
async function handleSendRedPacket(redPacketData) {
  try {
    await sendRedPacketFromComposable(redPacketData)
    toastRef.value?.success('红包发送成功！')
  } catch (error) {
    console.error('❌ 发送红包失败:', error)
    toastRef.value?.error(error.message || '发送红包失败，请重试')
  }
}
</script>

<style scoped>
.chat-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  overflow: visible;
  position: relative;
}

/* ✅ 顶部退出按钮样式 */
.floating-exit-btn {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.floating-exit-btn:hover {
  background: rgba(0, 0, 0, 0.8);
  transform: scale(1.05);
}

.floating-exit-btn:active {
  transform: scale(0.95);
}

/* ✅ 消息列表容器（由 MessageList 组件内部管理滚动） */
.chat-messages {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;  /* ✅ 禁止外层滚动 */
}
</style>

<style>
/* 全局样式 - 红包弹窗（不能scoped，因为是动态创建的DOM） */
.modal-overlay {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  background: rgba(255, 255, 255, 0.1) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 9999 !important;
}

/* 红包账单弹窗 */
.red-packet-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}

.red-packet-modal.show {
  opacity: 1;
  visibility: visible;
}

.red-packet-modal-content {
  width: 320px;
  background: linear-gradient(135deg, #ff4757 0%, #ff3742 100%);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  transform: scale(0.8);
  transition: all 0.3s ease;
}

.red-packet-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}

.red-packet-modal.show {
  opacity: 1;
  visibility: visible;
}

.red-packet-modal-content {
  width: 320px;
  background: linear-gradient(135deg, #ff4757 0%, #ff3742 100%);
  border-radius: 16px;
  padding: 40px 30px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  transform: scale(0.8) translateY(20px);
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.red-packet-modal.show .red-packet-modal-content {
  transform: scale(1) translateY(0);
}

/* 红包封面样式 */
.red-packet-cover {
  text-align: center;
}

.red-packet-cover-header {
  margin-bottom: 30px;
}

.red-packet-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 15px;
  animation: bounce 1s ease-in-out;
}

.red-packet-cover-title {
  font-size: 20px;
  font-weight: 600;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  margin-bottom: 40px;
}

.red-packet-open-btn {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffeb3b 0%, #fbc02d 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 36px;
  font-weight: 800;
  color: #d32f2f;
  margin: 0 auto;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  animation: pulse 2s infinite;
}

.red-packet-open-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 12px 25px rgba(0, 0, 0, 0.4);
}

.red-packet-open-btn:active {
  transform: scale(0.95);
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-20px);
  }
  60% {
    transform: translateY(-10px);
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 12px 25px rgba(0, 0, 0, 0.4);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  }
}

/* 抢红包结果弹窗 - 全新设计 */
.modal-overlay {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  background: rgba(255, 255, 255, 0.1) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 9999 !important;
}

.red-packet-result-modal {
  width: 340px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.result-header {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  padding: 30px 20px 20px;
  text-align: center;
}

.result-icon {
  font-size: 60px;
  margin-bottom: 10px;
  animation: bounce 1s ease infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.result-header h3 {
  margin: 0;
  color: #ffffff;
  font-size: 20px;
  font-weight: 600;
}

.result-body {
  padding: 30px 20px;
  text-align: center;
}

.result-amount {
  margin: 10px 0 20px;
}

.amount-value {
  font-size: 52px;
  font-weight: bold;
  color: #ff4d4f;
  margin-right: 6px;
}

.amount-unit {
  font-size: 20px;
  color: #ff4d4f;
  font-weight: 600;
}

.result-message {
  font-size: 16px;
  color: #666;
  margin: 15px 0 8px;
}

.result-from {
  font-size: 14px;
  color: #999;
  margin-bottom: 10px;
}

.result-total {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #f0f0f0;
  font-size: 15px;
  font-weight: 600;
  color: #ff4d4f;
}

.result-close-btn {
  width: calc(100% - 40px);
  margin: 0 20px 25px;
  padding: 14px;
  background: linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%);
  color: white;
  border: none;
  border-radius: 25px;
  font-size: 17px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.result-close-btn:hover {
  background: linear-gradient(135deg, #ff7875 0%, #ff4d4f 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(255, 77, 79, 0.4);
}

/* 红包发送成功弹窗 */
.red-packet-success-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}

.red-packet-success-modal.show {
  opacity: 1;
  visibility: visible;
}

.success-content {
  background: #ffffff;
  border-radius: 16px;
  padding: 40px 30px;
  text-align: center;
  max-width: 320px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateY(-30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.success-icon {
  font-size: 64px;
  margin-bottom: 15px;
}

.success-title {
  font-size: 22px;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
}

.success-amount,
.success-count {
  font-size: 15px;
  color: #666;
  margin-bottom: 10px;
}

.success-btn {
  width: 100%;
  padding: 14px;
  margin-top: 25px;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  color: white;
  border: none;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.success-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(255, 107, 107, 0.4);
}

/* 红包账单样式 */
.red-packet-bill {
  width: 100%;
  max-width: 400px;
}

.red-packet-bill-header {
  text-align: center;
  margin-bottom: 20px;
}

.red-packet-bill-info {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 20px;
}

.red-packet-bill-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
}

.red-packet-bill-item:last-child {
  margin-bottom: 0;
}

.red-packet-bill-list {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 20px;
}

.red-packet-bill-list-title {
  font-size: 16px;
  font-weight: 600;
  color: white;
  margin-bottom: 15px;
  text-align: center;
}

.red-packet-bill-summary {
  text-align: center;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  margin: 15px 0;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.red-packet-bill-list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 14px;
}

.red-packet-bill-list-item:last-child {
  border-bottom: none;
}

.red-packet-bill-user-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.red-packet-bill-user {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  margin-bottom: 4px;
}

.red-packet-bill-time {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
}

.red-packet-bill-amount {
  color: #ffeb3b;
  font-weight: 700;
  font-size: 16px;
}
</style>
