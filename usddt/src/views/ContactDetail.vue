<template>
  <div class="contact-detail-container">
    <!-- 头部 -->
    <header class="detail-header">
      <button class="back-btn" @click="goBack">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <h2>联系人</h2>
      <button class="logout-btn" @click="handleLogout">退出</button>
    </header>

    <!-- 好友信息卡片 -->
    <div class="friend-card" v-if="friend">
      <div class="friend-header">
        <div class="friend-avatar">
          <span class="avatar-icon">👤</span>
        </div>
        <div class="friend-info">
          <div class="friend-name" @click="showEditRemark = true">{{ friend.remark || friend.username || friend.name || '好友' }}</div>
          <div class="friend-id">{{ friend.userId || friend.id }}</div>
        </div>
      </div>
    </div>

    <!-- 发消息按钮 -->
    <button class="action-btn message-btn" @click="sendMessage">
      发消息
    </button>

    <!-- 删除好友按钮 -->
    <button class="action-btn delete-btn" @click="confirmDelete">
    删除好友
    </button>

 
    
    <!-- 备注编辑弹窗 -->
    <div v-if="showEditRemark" class="modal-overlay" @click="showEditRemark = false">
      <div class="remark-modal" @click.stop>
        <div class="modal-header">
          <h3>修改备注</h3>
          <button class="close-btn" @click="showEditRemark = false">×</button>
        </div>
        <div class="modal-body">
          <input 
            v-model="editRemarkText" 
            type="text" 
            placeholder="请输入备注"
            class="remark-input"
            maxlength="20"
          />
          <div class="char-count">{{ editRemarkText.length }}/20</div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="showEditRemark = false">取消</button>
          <button class="confirm-btn" @click="saveRemark">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSocket } from '@/socket'
import { useFriendStore } from '@/stores/friendStore'

const route = useRoute()
const router = useRouter()
const friendStore = useFriendStore()
const contactId = route.params.id

// ✅ 默认显示数据，防止加载慢导致空白
const friend = ref({
  userId: contactId,
  username: '好友',
  avatarUrl: ''
})
const showEditRemark = ref(false)
const editRemarkText = ref('')
const socket = getSocket()

onMounted(() => {
  console.log('👤 [ContactDetail] 页面加载, contactId:', contactId)
  loadFriendInfo()
  
  if (socket) {
    socket.on('friendListUpdated', (data) => {
      console.log('👥 [ContactDetail] 收到好友列表:', data)
      const foundFriend = data.friends?.find(f => f.userId === contactId || f._id === contactId)
      if (foundFriend) {
        console.log('✅ [ContactDetail] 找到好友信息:', foundFriend)
        friend.value = foundFriend
      } else {
        console.log('⚠️ [ContactDetail] 未找到好友信息')
      }
    })
  }
})

const loadFriendInfo = () => {
  console.log('🔍 [ContactDetail] 开始加载好友信息...')
  try {
    // ✅ 优先从 friendStore 读取
    const friends = friendStore.friendIds
    console.log('📦 [ContactDetail] friendStore 中的好友ID:', friends.length, '个')
    
    // 从 localStorage 读取缓存的好友详情
    const cachedFriends = JSON.parse(localStorage.getItem('friendDetails') || '{}')
    const foundFriend = cachedFriends[contactId]
    
    if (foundFriend) {
      console.log('✅ [ContactDetail] 从缓存找到好友:', foundFriend)
      friend.value = {
        userId: contactId,
        username: foundFriend.username || `用户${contactId.slice(-4)}`,
        avatarUrl: foundFriend.avatar || '',
        remark: foundFriend.remark || ''
      }
    } else {
      console.log('⚠️ [ContactDetail] 缓存未找到好友，使用默认信息')
      friend.value = {
        userId: contactId,
        username: `用户${contactId.slice(-4)}`,
        avatarUrl: '',
        remark: ''
      }
    }
  } catch (e) {
    console.error('❌ [ContactDetail] 加载好友信息失败:', e)
  }
}

// ✅ 保存备注
const saveRemark = () => {
  const newRemark = editRemarkText.value.trim()
  
  // 更新本地显示
  friend.value.remark = newRemark
  
  // 保存到 localStorage
  const cachedFriends = JSON.parse(localStorage.getItem('friendDetails') || '{}')
  if (!cachedFriends[contactId]) {
    cachedFriends[contactId] = {}
  }
  cachedFriends[contactId].remark = newRemark
  localStorage.setItem('friendDetails', JSON.stringify(cachedFriends))
  
  // 通过 WebSocket 同步到后端（可选）
  if (socket && socket.connected) {
    socket.emit('friend:updateRemark', {
      friendId: contactId,
      remark: newRemark
    })
  }
  
  showEditRemark.value = false
  console.log('✅ [ContactDetail] 备注已保存:', newRemark)
}

const goBack = () => {
  router.push('/contacts')
}

// ✅ 退出登录
const handleLogout = () => {
  if (confirm('确定要退出登录吗？')) {
    // 清除 localStorage
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
    localStorage.removeItem('walletInfo')
    localStorage.removeItem('balances')
    localStorage.removeItem('friendIds')
    localStorage.removeItem('friendDetails')
    
    // 断开 Socket
    const socket = getSocket()
    if (socket) {
      socket.disconnect()
    }
    
    // 跳转到登录页
    router.push('/login')
  }
}

const sendMessage = () => {
  router.push(`/chat/${contactId}`)
}

const startCall = () => {
  showToast('音视频通话功能开发中...', 'info')
}

const confirmDelete = () => {
  if (confirm('确定要删除该好友吗？')) {
    deleteFriend()
  }
}

const deleteFriend = () => {
  if (!socket) {
    showToast('连接失败，无法删除好友', 'error')
    return
  }
  
  socket.emit('friend:remove', {
    friendId: contactId
  })
  
  socket.once('friendRemoved', (data) => {
    showToast('已删除好友', 'success')
    router.push('/contacts')
  })
  
  socket.once('errorMessage', (error) => {
    showToast(error.msg || '删除失败', 'error')
  })
  
  setTimeout(() => {
    showToast('删除好友请求超时，请检查网络连接', 'warning', 3000)
  }, 10000)
}

const navigateTo = (path) => {
  router.push(path)
}
</script>

<style scoped>
.contact-detail-container {
  min-height: 100vh;
  background: #fff;
  padding: 0;
  padding-bottom: env(safe-area-inset-bottom);
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  padding-top: calc(16px + env(safe-area-inset-top));
  background: #fff;
  border-bottom: 1px solid #e5e5e5;
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: #000;
  display: flex;
  align-items: center;
}

.detail-header h2 {
  font-size: 17px;
  font-weight: 500;
  margin: 0;
  color: #000;
}

.logout-btn {
  background: none;
  border: none;
  color: #ff3b30;
  font-size: 15px;
  cursor: pointer;
  padding: 4px 8px;
}

.logout-btn:active {
  opacity: 0.6;
}

.header-placeholder {
  width: 32px;
}

.friend-card {
  background: #fff;
  padding: 20px 16px;
  border-bottom: 8px solid #f5f5f5;
}

.friend-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.friend-avatar {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e5e5e5;
}

.avatar-icon {
  font-size: 32px;
}

.friend-info {
  flex: 1;
}

.friend-name {
  font-size: 18px;
  font-weight: 500;
  color: #000;
  margin-bottom: 4px;
}

.friend-id {
  font-size: 14px;
  color: #999;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(100% - 32px);
  margin: 12px 16px;
  padding: 14px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
}

.message-btn {
  background: #007aff;
  color: #fff;
  margin-top: 30vh;
}

.call-btn {
  background: #fff;
  color: #000;
  border: 1px solid #e5e5e5;
}

.delete-btn {
  background: #fff;
  color: #ff3b30;
  border: 1px solid #e5e5e5;
  margin-top: 20px;
}

.action-btn:active {
  opacity: 0.7;
}

/* 底部导航 */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  display: flex;
  justify-content: space-around;
  padding: 8px 0;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
  border-top: 1px solid #e5e5e5;
  z-index: 1000;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 4px 12px;
  transition: all 0.2s;
}

.nav-item:hover {
  transform: scale(1.05);
}

.nav-item:active {
  transform: scale(0.95);
}

.nav-icon {
  font-size: 24px;
  line-height: 1;
}

.nav-label {
  font-size: 12px;
  color: #666;
}

.nav-item.active .nav-label {
  color: #007aff;
  font-weight: 500;
}

/* ✅ 备注编辑弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.remark-modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 360px;
  overflow: hidden;
}

.remark-modal .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e5e5;
}

.remark-modal .modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.remark-modal .close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
}

.remark-modal .modal-body {
  padding: 20px;
}

.remark-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 15px;
  outline: none;
}

.remark-input:focus {
  border-color: #007aff;
}

.char-count {
  text-align: right;
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

.remark-modal .modal-footer {
  display: flex;
  border-top: 1px solid #e5e5e5;
}

.cancel-btn,
.confirm-btn {
  flex: 1;
  padding: 14px;
  border: none;
  font-size: 16px;
  cursor: pointer;
}

.cancel-btn {
  background: white;
  color: #007aff;
  border-right: 1px solid #e5e5e5;
}

.confirm-btn {
  background: white;
  color: #007aff;
  font-weight: 500;
}

.cancel-btn:active,
.confirm-btn:active {
  background: #f5f5f5;
}
</style>
