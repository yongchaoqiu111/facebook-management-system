<template>
  <div class="friend-detail-container">
    <!-- 头部导航 -->
    <header class="header">
      <button class="back-btn" @click="goBack">←</button>
      <h1>详细资料</h1>
      <div class="placeholder"></div>
    </header>

    <!-- 内容区域 -->
    <main class="content">
      <!-- 用户信息卡片 -->
      <div class="profile-card">
        <div class="avatar-section">
          <img :src="friendInfo.avatar || '/default-avatar.png'" :alt="friendInfo.username" class="avatar" />
        </div>
        <div class="info-section">
          <div class="username-row">
            <span class="username">{{ friendInfo.username }}</span>
            <span class="gender-icon" v-if="friendInfo.gender">{{ friendInfo.gender === 'male' ? '👨' : '👩' }}</span>
          </div>
          <div class="user-id">用户ID：{{ friendInfo.id }}</div>
        </div>
      </div>

      <!-- 功能菜单 -->
      <div class="menu-section">
        <div class="menu-item" @click="showFeature('朋友圈')">
          <span class="menu-icon">📷</span>
          <span class="menu-text">朋友圈</span>
          <span class="menu-arrow">›</span>
        </div>
        <div class="menu-item" @click="showFeature('视频号')">
          <span class="menu-icon">🎬</span>
          <span class="menu-text">视频号</span>
          <span class="menu-arrow">›</span>
        </div>
      </div>

      <!-- 发消息按钮 -->
      <button class="message-btn" @click="startChat">
        <span class="message-icon">💬</span>
        <span>发消息</span>
      </button>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from '@/utils/toast'
import { useFriendStore } from '@/stores/friendStore'

const route = useRoute()
const router = useRouter()
const friendStore = useFriendStore()

// 用户ID
const userId = ref(route.params.id)

// 好友信息
const friendInfo = ref({
  id: userId.value,
  username: `用户${userId.value.slice(-4)}`,
  avatar: '',
  gender: ''
})

// 返回上一页
const goBack = () => {
  router.back()
}

// 显示功能开发中
const showFeature = (feature) => {
  showToast(`${feature}功能开发中...`, 'info')
}

// 跳转到私聊页面
const startChat = () => {
  router.push(`/chat/private/${userId.value}`)
}

// 加载好友详情
onMounted(async () => {
  // 尝试从 store 获取详情
  const detail = friendStore.getFriendDetail(userId.value)
  
  if (detail) {
    friendInfo.value = {
      id: detail.userId || detail.id,
      username: detail.username || `用户${userId.value.slice(-4)}`,
      avatar: detail.avatar || '',
      gender: detail.gender || ''
    }
  } else {
    // TODO: 从 API 获取好友详情
    console.log('⚠️ Store 中无详情，请求 API 获取:', userId.value)
  }
})
</script>

<style scoped>
.friend-detail-container {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: env(safe-area-inset-bottom);
}

/* 头部导航 */
.header {
  position: sticky;
  top: 0;
  background: white;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e0e0e0;
  z-index: 10;
}

.back-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 32px;
}

.header h1 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

.placeholder {
  width: 32px;
}

/* 内容区域 */
.content {
  padding: 16px;
}

/* 用户信息卡片 */
.profile-card {
  background: white;
  border-radius: 12px;
  padding: 24px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.avatar-section .avatar {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  object-fit: cover;
}

.info-section {
  flex: 1;
}

.username-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.username {
  font-size: 1.3rem;
  font-weight: 600;
  color: #333;
}

.gender-icon {
  font-size: 1.2rem;
}

.user-id {
  font-size: 0.9rem;
  color: #999;
}

/* 功能菜单 */
.menu-section {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 16px;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:active {
  background: #f5f5f5;
}

.menu-icon {
  font-size: 1.3rem;
  margin-right: 12px;
}

.menu-text {
  flex: 1;
  font-size: 1rem;
  color: #333;
}

.menu-arrow {
  font-size: 1.2rem;
  color: #ccc;
}

/* 发消息按钮 */
.message-btn {
  width: 100%;
  padding: 14px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.2s;
}

.message-btn:active {
  background: #5568d3;
}

.message-icon {
  font-size: 1.3rem;
}
</style>
