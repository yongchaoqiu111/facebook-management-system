<template>
  <div class="my-invitations-page">
    <!-- 头部导航 -->
    <header class="header">
      <button class="back-btn" @click="goBack">←</button>
      <h1>我的邀请</h1>
      <div class="placeholder"></div>
    </header>

    <!-- 内容区域 -->
    <main class="content">
      <!-- 待处理邀请 -->
      <section v-if="pendingInvitations.length > 0" class="invitations-section">
        <h2 class="section-title">⏳ 待处理邀请 ({{ pendingInvitations.length }})</h2>
        
        <div 
          v-for="invitation in pendingInvitations" 
          :key="invitation._id || invitation.id"
          class="invitation-card"
        >
          <div class="invitation-header">
            <div class="inviter-info">
              <div class="inviter-avatar" :style="{ background: getAvatarColor(invitation.inviter?.username || 'I') }">
                {{ (invitation.inviter?.username || 'I').charAt(0).toUpperCase() }}
              </div>
              <div class="inviter-details">
                <div class="inviter-name">{{ invitation.inviter?.username || '未知用户' }}</div>
                <div class="invite-time">{{ formatTime(invitation.createdAt) }}</div>
              </div>
            </div>
            <div class="expire-badge" :class="{ expired: isExpired(invitation.expiresAt) }">
              {{ isExpired(invitation.expiresAt) ? '已过期' : getExpireText(invitation.expiresAt) }}
            </div>
          </div>

          <div class="group-info">
            <div class="group-icon">🐉</div>
            <div class="group-details">
              <div class="group-name">{{ invitation.group?.name || '接龙群' }}</div>
              <div class="group-desc">{{ invitation.group?.description || '暂无描述' }}</div>
            </div>
          </div>

          <div class="fee-info">
            <div class="fee-item">
              <span>门票：</span>
              <strong>{{ invitation.group?.settings?.ticketAmount || 10 }} USDT</strong>
            </div>
            <div class="fee-item">
              <span>首包：</span>
              <strong>{{ invitation.group?.settings?.firstRedPacketAmount || 300 }} USDT</strong>
            </div>
            <div class="fee-divider"></div>
            <div class="fee-item total">
              <span>合计：</span>
              <strong class="highlight">{{ (invitation.group?.settings?.ticketAmount || 10) + (invitation.group?.settings?.firstRedPacketAmount || 300) }} USDT</strong>
            </div>
          </div>

          <div class="invitation-actions">
            <button 
              class="btn-reject" 
              @click="rejectInvitation(invitation)"
              :disabled="processingInvitationId === (invitation._id || invitation.id)"
            >
              拒绝
            </button>
            <button 
              class="btn-accept" 
              @click="acceptInvitation(invitation)"
              :disabled="processingInvitationId === (invitation._id || invitation.id) || isExpired(invitation.expiresAt)"
            >
              {{ processingInvitationId === (invitation._id || invitation.id) ? '处理中...' : '接受邀请' }}
            </button>
          </div>
        </div>
      </section>

      <!-- 空状态 -->
      <div v-if="!loading && pendingInvitations.length === 0" class="empty-state">
        <div class="empty-icon">📩</div>
        <h3>暂无待处理邀请</h3>
        <p>当有人邀请您加入接龙群时，这里会显示邀请</p>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>
    </main>

    <!-- Toast 提示 -->
    <div v-if="showToast" class="toast" :class="toastType">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { chainGroupAPI } from '../api'

const router = useRouter()

// 状态
const loading = ref(false)
const pendingInvitations = ref([])
const processingInvitationId = ref(null)
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('success')

// 返回上一页
const goBack = () => {
  router.back()
}

// 显示 Toast
const showToastMessage = (message, type = 'success') => {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 3000)
}

// 生成头像背景色
const getAvatarColor = (name) => {
  const colors = [
    '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', 
    '#eb2f96', '#13c2c2', '#fa8c16', '#a0d911', '#2f54eb'
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// 格式化时间
const formatTime = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  
  // 小于 1 分钟
  if (diff < 60 * 1000) {
    return '刚刚'
  }
  // 小于 1 小时
  if (diff < 60 * 60 * 1000) {
    return Math.floor(diff / (60 * 1000)) + '分钟前'
  }
  // 小于 24 小时
  if (diff < 24 * 60 * 60 * 1000) {
    return Math.floor(diff / (60 * 60 * 1000)) + '小时前'
  }
  // 小于 7 天
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return Math.floor(diff / (24 * 60 * 60 * 1000)) + '天前'
  }
  
  return date.toLocaleDateString('zh-CN')
}

// 检查是否过期
const isExpired = (expiresAt) => {
  if (!expiresAt) return false
  return new Date() > new Date(expiresAt)
}

// 获取过期文本
const getExpireText = (expiresAt) => {
  if (!expiresAt) return ''
  const expireDate = new Date(expiresAt)
  const now = new Date()
  const diff = expireDate - now
  
  if (diff <= 0) {
    return '已过期'
  }
  
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
  
  if (days > 0) {
    return `${days}天后过期`
  } else if (hours > 0) {
    return `${hours}小时后过期`
  } else {
    const minutes = Math.floor(diff / (60 * 1000))
    return `${minutes}分钟后过期`
  }
}

// 加载待处理邀请
const loadPendingInvitations = async () => {
  loading.value = true
  try {
    const response = await chainGroupAPI.getPendingInvitations()
    console.log('✅ 加载邀请列表:', response)
    
    // 兼容不同的响应格式
    if (Array.isArray(response)) {
      pendingInvitations.value = response
    } else if (response.data && Array.isArray(response.data)) {
      pendingInvitations.value = response.data
    } else {
      pendingInvitations.value = []
    }
  } catch (error) {
    console.error('❌ 加载邀请列表失败:', error)
    showToastMessage('加载失败，请稍后重试', 'error')
  } finally {
    loading.value = false
  }
}

// 接受邀请
const acceptInvitation = async (invitation) => {
  const invitationId = invitation._id || invitation.id
  const groupId = invitation.group?._id || invitation.group?.id
  
  if (!groupId) {
    showToastMessage('群组信息异常', 'error')
    return
  }
  
  // 确认接受
  const totalFee = (invitation.group?.settings?.ticketAmount || 10) + 
                   (invitation.group?.settings?.firstRedPacketAmount || 300)
  
  if (!confirm(`确认接受邀请并加入群聊吗？\n\n将扣除 ${totalFee} USDT（门票+首包）`)) {
    return
  }
  
  processingInvitationId.value = invitationId
  
  try {
    // 先接受邀请
    await chainGroupAPI.acceptInvitation(invitationId)
    
    showToastMessage('✅ 已接受邀请，正在进群...')
    
    // 然后调用进群接口（会自动扣费和发红包）
    const joinResponse = await chainGroupAPI.joinChainGroup(groupId)
    
    console.log('✅ 进群成功:', joinResponse)
    
    // 从列表中移除
    pendingInvitations.value = pendingInvitations.value.filter(
      inv => (inv._id || inv.id) !== invitationId
    )
    
    // 延迟跳转到群聊
    setTimeout(() => {
      router.push(`/chat/${groupId}`)
    }, 1500)
  } catch (error) {
    console.error('❌ 接受邀请失败:', error)
    
    let errorMsg = '操作失败'
    if (error.response?.data?.msg) {
      errorMsg = error.response.data.msg
    } else if (error.message) {
      errorMsg = error.message
    }
    
    // 特殊处理余额不足
    if (errorMsg.includes('balance') || errorMsg.includes('余额')) {
      showToastMessage('❌ 余额不足，请先到钱包充值', 'error')
    } else {
      showToastMessage('❌ ' + errorMsg, 'error')
    }
  } finally {
    processingInvitationId.value = null
  }
}

// 拒绝邀请
const rejectInvitation = async (invitation) => {
  const invitationId = invitation._id || invitation.id
  
  if (!confirm('确认拒绝此邀请吗？')) {
    return
  }
  
  processingInvitationId.value = invitationId
  
  try {
    await chainGroupAPI.rejectInvitation(invitationId)
    
    showToastMessage('已拒绝邀请')
    
    // 从列表中移除
    pendingInvitations.value = pendingInvitations.value.filter(
      inv => (inv._id || inv.id) !== invitationId
    )
  } catch (error) {
    console.error('❌ 拒绝邀请失败:', error)
    showToastMessage('操作失败，请稍后重试', 'error')
  } finally {
    processingInvitationId.value = null
  }
}

// 生命周期
onMounted(() => {
  loadPendingInvitations()
})
</script>

<style scoped>
.my-invitations-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

/* 头部导航 */
.header {
  background: white;
  border-bottom: 1px solid #e0e0e0;
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: #f5f7fa;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.5rem;
  color: #667eea;
  transition: background-color 0.3s ease;
}

.back-btn:hover {
  background: #e0e0e0;
}

.header h1 {
  color: #333;
  font-size: 1.3rem;
  margin: 0;
}

.placeholder {
  width: 40px;
}

/* 内容区域 */
.content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* 邀请区块 */
.invitations-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 1.1rem;
  color: #333;
  margin: 0 0 16px 0;
  padding-left: 8px;
}

/* 邀请卡片 */
.invitation-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.invitation-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.invitation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.inviter-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.inviter-avatar {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 18px;
  flex-shrink: 0;
}

.inviter-details {
  min-width: 0;
}

.inviter-name {
  font-weight: 600;
  color: #333;
  font-size: 15px;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.invite-time {
  font-size: 12px;
  color: #999;
}

.expire-badge {
  padding: 6px 12px;
  background: #e6f7ff;
  color: #1890ff;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.expire-badge.expired {
  background: #f5f5f5;
  color: #999;
}

/* 群组信息 */
.group-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%);
  border-radius: 10px;
  margin-bottom: 16px;
}

.group-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.group-details {
  flex: 1;
  min-width: 0;
}

.group-name {
  font-weight: 600;
  color: #333;
  font-size: 15px;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.group-desc {
  font-size: 13px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 费用信息 */
.fee-info {
  background: #f8f9fa;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
}

.fee-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
  color: #666;
}

.fee-item strong {
  color: #333;
}

.fee-divider {
  height: 1px;
  background: #e0e0e0;
  margin: 8px 0;
}

.fee-item.total {
  font-size: 16px;
  padding-top: 12px;
}

.fee-item.total .highlight {
  color: #ff4757;
  font-size: 18px;
}

/* 操作按钮 */
.invitation-actions {
  display: flex;
  gap: 12px;
}

.btn-reject,
.btn-accept {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-reject {
  background: #f5f5f5;
  color: #666;
}

.btn-reject:hover:not(:disabled) {
  background: #e0e0e0;
}

.btn-accept {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-accept:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-reject:disabled,
.btn-accept:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #999;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-state h3 {
  color: #333;
  margin: 0 0 12px 0;
  font-size: 18px;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: #999;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Toast */
.toast {
  position: fixed;
  top: 20%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 12px 24px;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  z-index: 2000;
  animation: slideIn 0.3s ease-out;
}

.toast.success {
  background: rgba(0, 0, 0, 0.8);
}

.toast.error {
  background: rgba(255, 0, 0, 0.8);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
</style>
