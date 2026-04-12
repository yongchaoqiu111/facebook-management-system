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
      <div class="header-placeholder"></div>
    </header>

    <!-- 好友信息卡片 -->
    <div class="friend-card" v-if="friend">
      <div class="friend-header">
        <div class="friend-avatar">
          <img v-if="friend.avatarUrl" :src="friend.avatarUrl" alt="avatar" />
          <span v-else class="avatar-placeholder">{{ (friend.username || friend.name || '?').charAt(0) }}</span>
        </div>
        <div class="friend-info">
          <div class="friend-name">{{ friend.username || friend.name || '好友' }}</div>
          <div class="friend-id">{{ friend.userId || friend.id }}</div>
        </div>
      </div>
    </div>

    <!-- 发消息按钮 -->
    <button class="action-btn message-btn" @click="sendMessage">
      发消息
    </button>

    <!-- 音视频通话按钮 -->
    <button class="action-btn call-btn" @click="startCall">
      音视频通话
    </button>

    <!-- 删除好友按钮 -->
    <button class="action-btn delete-btn" @click="confirmDelete">
      删除好友
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSocket } from '@/socket'

const route = useRoute()
const router = useRouter()
const contactId = route.params.id

// ✅ 默认显示数据，防止加载慢导致空白
const friend = ref({
  userId: contactId,
  username: '好友',
  avatarUrl: ''
})
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
    const friends = JSON.parse(sessionStorage.getItem('friends') || '[]')
    console.log('📦 [ContactDetail] sessionStorage 中的好友:', friends.length, '个')
    const foundFriend = friends.find(f => f.userId === contactId || f.id === contactId)
    if (foundFriend) {
      console.log('✅ [ContactDetail] 从本地存储找到好友:', foundFriend)
      friend.value = foundFriend
    } else {
      console.log('⚠️ [ContactDetail] 本地存储未找到好友')
    }
  } catch (e) {
    console.error('❌ [ContactDetail] 加载好友信息失败:', e)
  }
}

const goBack = () => {
  router.push('/contacts')
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
</script>

<style scoped>
.contact-detail-container {
  min-height: 100vh;
  background: #fff;
  padding: 0;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
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
}

.friend-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e5e5e5;
  color: #666;
  font-size: 24px;
  font-weight: 500;
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
</style>
