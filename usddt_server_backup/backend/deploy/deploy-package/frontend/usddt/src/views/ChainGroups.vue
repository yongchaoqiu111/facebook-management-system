<template>
  <div class="chain-groups-page">
    <!-- 头部 -->
    <div class="page-header">
      <button class="back-btn" @click="goBack">←</button>
      <h2>🐉 接龙群</h2>
      <div class="header-actions">
        <button class="icon-btn" @click="goToIncomeCenter" title="收益中心">💰</button>
        <button class="icon-btn" @click="goToMyInvitations" title="我的邀请">📩</button>
        <button class="create-btn" @click="goToCreatePage">+ 创建</button>
      </div>
    </div>
    
    <!-- 重要提示 -->
    <div class="important-notice">
      <div class="notice-icon">⚠️</div>
      <div class="notice-content">
        <div class="notice-title">玩法公告</div>
        <div class="notice-text">
          接龙群规则：进入先扣费，然后抢红包，累计达到阈值出局。<br>
          被踢出后可重新缴费进群继续游戏。
        </div>
      </div>
    </div>

    <!-- 接龙群列表 -->
    <div class="groups-list" v-if="!loading">
      <div 
        v-for="group in chainGroups" 
        :key="group._id"
        class="group-card"
        @click="joinGroup(group)"
      >
        <div class="group-info">
          <div class="group-avatar">🐉</div>
          <div class="group-details">
            <h3 class="group-name">{{ group.name }}</h3>
            <p class="group-desc">{{ group.description || '暂无描述' }}</p>
            <div class="group-meta">
              <span>
                门票：
                <svg class="currency-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v12M9 9h6a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v0a2 2 0 0 1 2-2h6"/>
                </svg>
                {{ group.settings.ticketAmount }}
              </span>
              <span>
                首包：
                <svg class="currency-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v12M9 9h6a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v0a2 2 0 0 1 2-2h6"/>
                </svg>
                {{ group.settings.firstRedPacketAmount }}
              </span>
            </div>
          </div>
        </div>
        <div class="group-rules">
          <div class="rule-item">
            <span class="rule-label">踢出阈值</span>
            <span class="rule-value">
              <svg class="currency-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v12M9 9h6a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v0a2 2 0 0 1 2-2h6"/>
              </svg>
              {{ group.settings.kickThreshold }}
            </span>
          </div>
          <div class="rule-item">
            <span class="rule-label">等待时间</span>
            <span class="rule-value">{{ group.settings.waitHours }}小时</span>
          </div>
        </div>
        <div class="group-actions">
          <button class="join-btn" @click.stop="joinGroup(group)">进入群聊</button>
          <button class="share-btn" @click.stop="shareGroup(group)" title="分享">📤</button>
        </div>
      </div>

      <div v-if="chainGroups.length === 0" class="empty-state">
        <div class="empty-icon">🐉</div>
        <p>暂无接龙群</p>
        <p class="empty-hint">点击右上角创建接龙群</p>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-else class="loading-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 创建接龙群弹窗 -->
    <div v-if="showCreateModal" class="modal-overlay" @click="showCreateModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>🐉 创建接龙群</h3>
          <button class="close-btn" @click="showCreateModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>群名称</label>
            <input 
              v-model="createForm.name"
              type="text"
              placeholder="请输入群名称"
              maxlength="20"
            />
          </div>
          <div class="form-group">
            <label>群描述（可选）</label>
            <input 
              v-model="createForm.description"
              type="text"
              placeholder="请输入群描述"
              maxlength="50"
            />
          </div>
          <div class="form-group">
            <label>门票金额（USDT）</label>
            <input 
              v-model.number="createForm.ticketAmount"
              type="number"
              :min="1"
              step="0.01"
            />
          </div>
          <div class="form-group">
            <label>首包金额（USDT）</label>
            <input 
              v-model.number="createForm.firstRedPacketAmount"
              type="number"
              :min="100"
              step="0.01"
            />
          </div>
          <div class="form-group">
            <label>踢出阈值（USDT）</label>
            <input 
              v-model.number="createForm.kickThreshold"
              type="number"
              :min="100"
              step="0.01"
            />
          </div>
          <div class="form-group">
            <label>等待时间（小时）</label>
            <input 
              v-model.number="createForm.waitHours"
              type="number"
              :min="1"
              :max="24"
            />
          </div>
          <div class="info-box">
            <p>💡 说明：</p>
            <ul>
              <li>进群需缴纳门票 + 首包金额</li>
              <li>系统自动代发红包供成员抢</li>
              <li>新人需等待指定时间才能抢红包</li>
              <li>累计抢到阈值金额会被自动踢出</li>
            </ul>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showCreateModal = false">取消</button>
          <button class="btn-confirm" @click="createChainGroup" :disabled="creating">
            {{ creating ? '创建中...' : '确认创建' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 确认加入接龙群弹窗 -->
    <div v-if="showJoinConfirmModal && selectedGroup" class="modal-overlay" @click="showJoinConfirmModal = false">
      <div class="modal-content join-confirm-modal" @click.stop>
        <div class="modal-header">
          <h3>🐉 加入接龙群</h3>
          <button class="close-btn" @click="showJoinConfirmModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="group-summary">
            <div class="group-name-large">{{ selectedGroup.name }}</div>
            <div class="group-desc-small">{{ selectedGroup.description || '暂无描述' }}</div>
          </div>
          
          <div class="fee-breakdown">
            <h4>💰 费用明细</h4>
            <div class="fee-item">
              <span class="fee-label">🎫 门票金额</span>
              <span class="fee-value">{{ selectedGroup.settings.ticketAmount }} USDT</span>
            </div>
            <div class="fee-item">
              <span class="fee-label">🧧 首包金额</span>
              <span class="fee-value">{{ selectedGroup.settings.firstRedPacketAmount }} USDT</span>
            </div>
            <div class="fee-divider"></div>
            <div class="fee-item total">
              <span class="fee-label">合计支付</span>
              <span class="fee-value highlight">{{ selectedGroup.settings.ticketAmount + selectedGroup.settings.firstRedPacketAmount }} USDT</span>
            </div>
          </div>
          
          <div class="rules-info">
            <h4>📋 群规则</h4>
            <div class="rule-row">
              <span>⏰ 等待时间：</span>
              <strong>{{ selectedGroup.settings.waitHours }} 小时</strong>
            </div>
            <div class="rule-row">
              <span>🚫 踢出阈值：</span>
              <strong>{{ selectedGroup.settings.kickThreshold }} USDT</strong>
            </div>
            <div class="rule-row">
              <span>👥 当前人数：</span>
              <strong>{{ selectedGroup.memberCount }} 人</strong>
            </div>
          </div>
          
          <div class="warning-box">
            <p>⚠️ 注意：</p>
            <ul>
              <li>进群后需等待 {{ selectedGroup.settings.waitHours }} 小时才能抢红包</li>
              <li>累计抢到 {{ selectedGroup.settings.kickThreshold }} USDT 会被自动踢出</li>
              <li>被踢出后可重新缴费进群</li>
            </ul>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showJoinConfirmModal = false">取消</button>
          <button class="btn-confirm" @click="confirmJoinGroup" :disabled="joining">
            {{ joining ? '处理中...' : (isAlreadyJoined ? '进入群聊' : '确认支付并加入') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toast 提示 -->
    <div v-if="showToast" class="toast" :class="toastType">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { chainGroupAPI } from '../api'
import { getSocket, joinChainGroupViaSocket, onChainGroupJoined } from '../socket'
import { showToast } from '@/utils/toast'

const router = useRouter()

// 状态
const loading = ref(false)
const chainGroups = ref([])
const showCreateModal = ref(false)
const showJoinConfirmModal = ref(false)
const selectedGroup = ref(null)
const creating = ref(false)
const joining = ref(false)
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('success')
const forcePayMode = ref(false)  // ✅ 强制付费模式（领取红包后被踢出）

// ✅ 判断是否已加入该群
const isAlreadyJoined = computed(() => {
  // ✅ 如果处于强制付费模式，认为未加入
  if (forcePayMode.value) return false
  
  if (!selectedGroup.value) return false
  const currentUserId = localStorage.getItem('userId')
  return selectedGroup.value.members?.some(member => 
    member.userId === currentUserId || member._id === currentUserId
  )
})

// 创建表单
const createForm = ref({
  name: '',
  description: '',
  ticketAmount: 10,
  firstRedPacketAmount: 300,
  kickThreshold: 380,
  waitHours: 3
})

// 返回上一页
const goBack = () => {
  router.push('/home')
}

// 跳转到创建页面
const goToCreatePage = () => {
  router.push('/create-chain-group')
}

// 跳转到我的邀请
const goToMyInvitations = () => {
  router.push('/my-invitations')
}

// 跳转到收益中心
const goToIncomeCenter = () => {
  router.push('/income-center')
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

// 加载接龙群列表
const loadChainGroups = async () => {
  loading.value = true
  try {
    const response = await chainGroupAPI.getChainGroups()
    if (response && Array.isArray(response)) {
      chainGroups.value = response
    } else if (response.data && Array.isArray(response.data)) {
      chainGroups.value = response.data
    }
  } catch (error) {
    console.error('加载接龙群列表失败:', error)
    showToastMessage('加载失败，请稍后重试', 'error')
  } finally {
    loading.value = false
  }
}

// 查看群详情
const viewGroupDetail = (group) => {
  // 跳转到接龙群聊天页面
  router.push(`/chain-group/${group._id}`) // 🐉 接龙群独立路由
}

// 加入接龙群
const joinGroup = (group) => {
  console.log('🐉 ========== 点击加入群聊 ==========')
  console.log('群名称:', group.name)
  console.log('群ID:', group._id)
  
  selectedGroup.value = group
  showJoinConfirmModal.value = true
  
  // 强制触发更新
  setTimeout(() => {
    console.log('✅ 1秒后检查 - selectedGroup:', selectedGroup.value?.name)
    console.log('✅ 1秒后检查 - showJoinConfirmModal:', showJoinConfirmModal.value)
  }, 1000)
  
  console.log('=========================================')
}

// ✅ 分享群组
const shareGroup = async (group) => {
  const shareText = `邀请你加入接龙群：${group.name}\n门票：${group.settings.ticketPrice} USDT\n首包：${group.settings.firstPacketAmount} USDT`
  
  try {
    // 尝试使用系统分享
    if (navigator.share) {
      await navigator.share({
        title: group.name,
        text: shareText,
        url: window.location.href
      })
    } else {
      // 复制到剪贴板
      await navigator.clipboard.writeText(shareText)
      showToast('已复制到剪贴板！', 'success')
    }
  } catch (error) {
    console.error('分享失败:', error)
    // 降级方案：复制到剪贴板
    try {
      await navigator.clipboard.writeText(shareText)
      showToast('已复制到剪贴板！', 'success')
    } catch (e) {
      showToast('分享功能暂不可用', 'error')
    }
  }
}

// 确认加入接龙群
const confirmJoinGroup = async () => {
  if (!selectedGroup.value) return
  
  joining.value = true
  
  try {
    // 🔥 通过 WebSocket 检查用户状态（是否被踢出）
    const currentUserId = localStorage.getItem('userId')
    const socket = getSocket()
    
    console.log('🔍 WebSocket 检查用户状态:', { groupId: selectedGroup.value._id, userId: currentUserId })
    
    // 发送 WebSocket 事件
    socket.emit('chat:checkChainStatus', {
      groupId: selectedGroup.value._id
    })
    
    // 等待响应
    const statusResponse = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.off('chainStatusResponse', handler)
        reject(new Error('检查状态超时'))
      }, 5000)
      
      const handler = (data) => {
        clearTimeout(timeout)
        socket.off('chainStatusResponse', handler)
        resolve(data)
      }
      
      socket.once('chainStatusResponse', handler)
    })
    
    console.log('✅ 用户状态响应:', statusResponse)
    
    // 🔥 如果用户被踢出，提示并阻止进群
    if (statusResponse && statusResponse.status === 'kicked') {
      console.log('⚠️ 用户已被踢出')
      const needPay = confirm(
        `⚠️ 您已被踢出群组\n\n` +
        `累计领取: ${statusResponse.totalReceived} / ${statusResponse.kickThreshold} USDT\n\n` +
        `需要重新缴费才能再次加入，是否继续？`
      )
      
      if (!needPay) {
        joining.value = false
        return
      }
      
      // 用户确认付费，通过 WebSocket 重新进群
      console.log('🔄 WebSocket 重新加入接龙群:', selectedGroup.value._id)
      joinChainGroupViaSocket(selectedGroup.value._id, false)
      
      // 监听进群结果
      const handleJoined = (data) => {
        console.log('✅ 重新进群成功:', data)
        showToastMessage('重新进群成功！您已发送首包红包')
        showJoinConfirmModal.value = false
        selectedGroup.value = null
        
        // 刷新列表
        loadChainGroups()
        
        // 跳转到接龙群聊天页面
        setTimeout(() => {
          router.push(`/chain-group/${data.groupId || selectedGroup.value?._id}`)
        }, 1000)
      }
      
      onChainGroupJoined(handleJoined)
      
      // 5秒后移除监听
      setTimeout(() => {
        const socket = getSocket()
        if (socket) {
          socket.off('chainGroupJoined', handleJoined)
        }
      }, 5000)
      
      joining.value = false
      return
    }
    
    // 🐉 使用 WebSocket 方式加入接龙群（正常进群）
    console.log('🚀 通过 WebSocket 加入接龙群:', selectedGroup.value._id)
    
    // 监听加入结果
    const handleJoined = (data) => {
      console.log('✅ 进群成功:', data)
      showToastMessage('进群成功！您已发送首包红包')
      showJoinConfirmModal.value = false
      selectedGroup.value = null
      
      // 刷新列表
      loadChainGroups()
      
      // 跳转到接龙群聊天页面
      setTimeout(() => {
        router.push(`/chain-group/${data.groupId || selectedGroup.value?._id}`)
      }, 1000)
    }
    
    // 临时监听一次
    onChainGroupJoined(handleJoined)
    
    // 发送加入请求
    joinChainGroupViaSocket(selectedGroup.value._id, false)
    
    // 5秒后移除监听，防止内存泄漏
    setTimeout(() => {
      const socket = getSocket()
      if (socket) {
        socket.off('chainGroupJoined', handleJoined)
      }
    }, 5000)
    
  } catch (error) {
    console.error('加入接龙群失败:', error)
    const errorMsg = error.message || '加入失败，请检查余额是否充足'
    showToastMessage(errorMsg, 'error')
  } finally {
    joining.value = false
  }
}

// 创建接龙群
const createChainGroup = async () => {
  // 验证表单
  if (!createForm.value.name.trim()) {
    showToastMessage('请输入群名称', 'error')
    return
  }
  
  if (createForm.value.ticketAmount < 1) {
    showToastMessage('门票金额至少为 1 USDT', 'error')
    return
  }
  
  if (createForm.value.firstRedPacketAmount < 100) {
    showToastMessage('首包金额至少为 100 USDT', 'error')
    return
  }
  
  creating.value = true
  
  try {
    const response = await chainGroupAPI.createChainGroup(createForm.value)
    
    if (response) {
      showToastMessage('创建成功！')
      showCreateModal.value = false
      
      // 重置表单
      createForm.value = {
        name: '',
        description: '',
        ticketAmount: 10,
        firstRedPacketAmount: 300,
        kickThreshold: 380,
        waitHours: 3
      }
      
      // 刷新列表
      await loadChainGroups()
    }
  } catch (error) {
    console.error('创建接龙群失败:', error)
    const errorMsg = error.response?.data?.msg || error.message || '创建失败，请稍后重试'
    showToastMessage(errorMsg, 'error')
  } finally {
    creating.value = false
  }
}

// 生命周期
onMounted(() => {
  loadChainGroups()
})
</script>

<style scoped>
.chain-groups-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

/* 头部 */
.page-header {
  padding: 16px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.back-btn, .create-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  font-size: 20px;
  cursor: pointer;
  border-radius: 50%;
  transition: background-color 0.3s;
}

.back-btn:hover, .create-btn:hover {
  background: #f0f0f0;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: #f5f7fa;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover {
  background: #e0e0e0;
  transform: scale(1.1);
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

/* 重要提示 */
.important-notice {
  margin: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
  border: 2px solid #f39c12;
  border-radius: 12px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.notice-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.notice-content {
  flex: 1;
}

.notice-title {
  font-size: 16px;
  font-weight: 700;
  color: #d35400;
  margin-bottom: 8px;
}

.notice-text {
  font-size: 14px;
  color: #856404;
  line-height: 1.6;
}

.notice-text strong {
  color: #d35400;
}

/* 群列表 */
.groups-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.group-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  cursor: pointer;
  transition: all 0.3s;
}

.group-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
}

.group-info {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.group-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.group-details {
  flex: 1;
}

.group-name {
  margin: 0 0 4px 0;
  font-size: 16px;
  color: #333;
}

.group-desc {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #999;
}

.group-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #666;
}

.group-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.currency-icon {
  width: 14px;
  height: 14px;
  color: #2ed573;
}

.group-rules {
  display: flex;
  gap: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 12px;
}

.rule-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rule-label {
  font-size: 11px;
  color: #999;
}

.rule-value {
  font-size: 14px;
  font-weight: bold;
  color: #ff6b6b;
}

.join-btn {
  flex: 1;
  padding: 12px;
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.join-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
}

/* ✅ 分享按钮 */
.share-btn {
  width: 44px;
  height: 44px;
  background: #f0f0f0;
  border: none;
  border-radius: 8px;
  font-size: 1.3rem;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
}

.share-btn:hover {
  background: #e0e0e0;
  transform: scale(1.05);
}

.group-actions {
  display: flex;
  gap: 8px;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-hint {
  font-size: 13px;
  margin-top: 8px;
}

/* 加载状态 */
.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #ff6b6b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 450px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 15px;
  transition: border-color 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #ff6b6b;
}

.info-box {
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  padding: 12px;
  border-radius: 8px;
  margin-top: 16px;
}

.info-box p {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: bold;
  color: #856404;
}

.info-box ul {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: #856404;
}

.info-box li {
  margin-bottom: 4px;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  gap: 12px;
}

.btn-cancel, .btn-confirm {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-cancel {
  background: #f0f0f0;
  color: #666;
}

.btn-cancel:hover {
  background: #e0e0e0;
}

.btn-confirm {
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
}

.btn-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 加入确认弹窗特殊样式 */
.join-confirm-modal {
  max-width: 500px;
}

.group-summary {
  text-align: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f0f0f0;
}

.group-name-large {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.group-desc-small {
  font-size: 14px;
  color: #999;
}

.fee-breakdown {
  background: linear-gradient(135deg, #fff9e6, #fff3cd);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.fee-breakdown h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #856404;
}

.fee-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  font-size: 15px;
}

.fee-label {
  color: #856404;
}

.fee-value {
  font-weight: bold;
  color: #d35400;
  font-size: 16px;
}

.fee-divider {
  height: 1px;
  background: linear-gradient(to right, transparent, #ffc107, transparent);
  margin: 8px 0;
}

.fee-item.total {
  padding-top: 16px;
  font-size: 16px;
}

.fee-item.total .fee-label {
  font-weight: bold;
  color: #856404;
}

.fee-item.total .fee-value.highlight {
  font-size: 20px;
  color: #e74c3c;
}

.rules-info {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.rules-info h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #333;
}

.rule-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  font-size: 14px;
  color: #666;
  border-bottom: 1px dashed #e0e0e0;
}

.rule-row:last-child {
  border-bottom: none;
}

.rule-row strong {
  color: #333;
}

.warning-box {
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  padding: 16px;
  border-radius: 8px;
}

.warning-box p {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: bold;
  color: #856404;
}

.warning-box ul {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: #856404;
  line-height: 1.8;
}

.warning-box li {
  margin-bottom: 4px;
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
