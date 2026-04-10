<template>
  <div class="profile-container">
    <!-- 头部导航 -->
    <header class="header">
      <h1>我的</h1>
      <div class="header-actions">
        <button class="action-btn">⚙️</button>
      </div>
    </header>

    <!-- 内容区域 -->
    <main class="content">
      <!-- 个人信息 -->
      <div class="profile-header">
        <div class="avatar-section">
          <div class="profile-avatar">MY</div>
        </div>
        <div class="info-section">
          <div class="top-row">
            <div class="profile-name">{{ user.name }}</div>
            <div class="profile-id" @click="copyUserId">用户ID: {{ user.id }} <span class="copy-hint">点击复制</span></div>
          </div>
          <div class="middle-row">
            <button class="share-btn" @click="showShareModal = true">分享我的ID</button>
            <button class="edit-profile-btn" @click="showEditModal = true">编辑资料</button>
          </div>
          <div class="profile-stats">
            <div class="stat-item">
              <div class="stat-number">{{ user.friends }}</div>
              <div class="stat-label">好友</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{{ user.groups }}</div>
              <div class="stat-label">群组</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{{ user.messages }}</div>
              <div class="stat-label">消息</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 功能菜单 -->
      <div class="menu-section">
        <div class="menu-item" @click="showFeature('设置')">
          <span class="menu-icon">⚙️</span>
          <span class="menu-text">设置</span>
          <span class="menu-arrow">›</span>
        </div>
        <div class="menu-item" @click="showFeature('隐私')">
          <span class="menu-icon">🔒</span>
          <span class="menu-text">隐私</span>
          <span class="menu-arrow">›</span>
        </div>
        <div class="menu-item" @click="showFeature('帮助与反馈')">
          <span class="menu-icon">❓</span>
          <span class="menu-text">帮助与反馈</span>
          <span class="menu-arrow">›</span>
        </div>
        <div class="menu-item" @click="showFeature('关于我们')">
          <span class="menu-icon">ℹ️</span>
          <span class="menu-text">关于我们</span>
          <span class="menu-arrow">›</span>
        </div>
      </div>

      <div class="menu-section">
        <div class="menu-item" @click="logout" style="color: #ff4757;">
          <span class="menu-icon">🚪</span>
          <span class="menu-text">退出登录</span>
          <span class="menu-arrow">›</span>
        </div>
      </div>
    </main>

    <!-- 底部导航 -->
    <footer class="bottom-nav">
      <div class="nav-item" @click="navigate('/home')">
        <div class="nav-icon">💬</div>
        <div class="nav-label">消息</div>
      </div>
      <div class="nav-item" @click="navigate('/contacts')">
        <div class="nav-icon">👥</div>
        <div class="nav-label">联系人</div>
      </div>
      <div class="nav-item" @click="navigate('/wallet')">
        <div class="nav-icon">💰</div>
        <div class="nav-label">钱包</div>
      </div>
      <div class="nav-item active" @click="navigate('/profile')">
        <div class="nav-icon">👤</div>
        <div class="nav-label">我的</div>
      </div>
    </footer>

    <!-- 分享菜单弹窗 -->
    <div v-if="showShareModal" class="modal-overlay" @click="showShareModal = false">
      <div class="share-modal" @click.stop>
        <div class="modal-header">
          <h3>分享我的ID</h3>
          <button class="close-btn" @click="showShareModal = false">×</button>
        </div>
        <div class="share-options">
          <div class="share-option" @click="copyAndShare">
            <div class="share-icon">📋</div>
            <div class="share-text">复制ID</div>
          </div>
          <div class="share-option" @click="generateQRCode">
            <div class="share-icon">📱</div>
            <div class="share-text">生成二维码</div>
          </div>
          <div class="share-option" @click="shareToWechat">
            <div class="share-icon">💬</div>
            <div class="share-text">分享到微信</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑资料弹窗 -->
    <div class="modal" v-if="showEditModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>编辑资料</h3>
          <button class="close-btn" @click="showEditModal = false">&times;</button>
        </div>
        <form @submit.prevent="saveProfile">
          <div class="form-group">
            <label for="profileName">昵称</label>
            <input type="text" id="profileName" v-model="user.name" required>
          </div>
          <div class="form-group">
            <label for="profileSignature">个性签名</label>
            <input type="text" id="profileSignature" v-model="user.signature" placeholder="请输入个性签名">
          </div>
          <div class="form-group">
            <label for="profilePhone">手机号</label>
            <input type="tel" id="profilePhone" v-model="user.phone" placeholder="请输入手机号">
          </div>
          <button type="submit" class="save-btn">保存</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from '@/utils/toast'

const router = useRouter()
const showEditModal = ref(false)
const showShareModal = ref(false)

// 用户数据
const user = ref({
  name: '加载中...',
  id: '',
  friends: 0,
  groups: 0,
  messages: 0,
  signature: '',
  phone: ''
})

// 加载用户信息
onMounted(() => {
  const userData = localStorage.getItem('user')
  if (userData) {
    const parsedUser = JSON.parse(userData)
    user.value = {
      name: parsedUser.username || '用户',
      id: parsedUser.userId || parsedUser.id || '',
      phone: parsedUser.phone || '',
      friends: 0,
      groups: 0,
      messages: 0
    }
  }
})

// 复制用户ID
const copyUserId = () => {
  navigator.clipboard.writeText(user.value.id).then(() => {
    showToast('用户ID已复制到剪贴板', 'success')
  }).catch(err => {
    console.error('复制失败:', err)
    showToast('复制失败，请手动复制', 'error')
  })
}

// 复制并分享
const copyAndShare = () => {
  const shareText = `我的用户ID是：${user.value.id}\n快来添加我为好友吧！`
  
  navigator.clipboard.writeText(user.value.id).then(() => {
    showToast('用户ID已复制到剪贴板', 'success')
  }).catch(err => {
    console.error('复制失败:', err)
    showToast('复制失败，请手动复制', 'error')
  })
  
  showShareModal.value = false
}

// 生成二维码
const generateQRCode = () => {
  showShareModal.value = false
  showToast('二维码生成功能开发中...', 'info')
}

// 分享到微信
const shareToWechat = () => {
  showShareModal.value = false
  showToast('分享到微信功能开发中...', 'info')
}

// 导航
const navigate = (path) => {
  router.push(path)
}

// 显示功能开发中
const showFeature = (feature) => {
  showToast(`${feature}功能开发中...`, 'info')
}

// 跳转到通知页面
const goToNotifications = () => {
  showToast('消息通知功能开发中...', 'info')
}

// 保存资料
const saveProfile = () => {
  showToast('资料保存成功！', 'success')
  showEditModal.value = false
}

// 退出登录
const logout = async () => {
  if (confirm('确定要退出登录吗？')) {
    const userId = localStorage.getItem('userId')
    
    // ✅ 清空 MessageCenter 的所有数据（内存 + IndexedDB）
    try {
      const { useMessageCenter } = await import('@/composables/useMessageCenter')
      const messageCenter = useMessageCenter()
      await messageCenter.clearAllData()
      console.log('✅ 已清空 MessageCenter 数据')
    } catch (error) {
      console.error('❌ 清空 MessageCenter 数据失败:', error)
    }
    
    // 清除群组列表缓存
    if (userId) {
      localStorage.removeItem(`groups_${userId}`)
      
      // 清除 joined_ 前缀的群组状态缓存
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i)
        if (key.startsWith(`joined_${userId}_`)) {
          localStorage.removeItem(key)
        }
      }
    }
    
    // 清除其他登录数据
    localStorage.removeItem('token')
    localStorage.removeItem('userId')
    localStorage.removeItem('user')
    localStorage.removeItem('userObjectId')
    localStorage.removeItem('tokenExpiresAt')
    
    console.log('✅ 已清除所有登录缓存')
    router.push('/login')
  }
}
</script>

<style scoped>
.profile-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
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

.header h1 {
  color: #667eea;
  font-size: 1.5rem;
}

.header-actions {
  display: flex;
  gap: 15px;
}

.action-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: #f5f7fa;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  transition: background-color 0.3s ease;
}

.action-btn:hover {
  background: #e0e0e0;
}

/* 内容区域 */
.content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.profile-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 30px 20px;
  color: white;
  display: flex;
  align-items: center;
  gap: 20px;
  border-radius: 20px;
  margin-bottom: 20px;
}

.avatar-section {
  flex-shrink: 0;
}

.profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #667eea;
  font-size: 2rem;
  font-weight: 600;
  border: 3px solid white;
}

.info-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.top-row {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.profile-name {
  font-size: 1.5rem;
  font-weight: 600;
}

.profile-id {
  font-size: 0.9rem;
  opacity: 0.9;
  cursor: pointer;
}

.copy-hint {
  font-size: 0.7rem;
  opacity: 0.7;
  margin-left: 5px;
}

.middle-row {
  display: flex;
  gap: 10px;
}

.share-btn {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid white;
  color: white;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.3s ease;
}

.share-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.profile-stats {
  display: flex;
  gap: 30px;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 1.2rem;
  font-weight: 600;
}

.stat-label {
  font-size: 0.8rem;
  opacity: 0.8;
}

.edit-profile-btn {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid white;
  color: white;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.3s ease;
  white-space: nowrap;
}

.edit-profile-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.menu-section {
  background: white;
  margin-bottom: 20px;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.menu-item:hover {
  background: #f8f9fa;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-icon {
  font-size: 1.2rem;
  margin-right: 15px;
}

.menu-text {
  flex: 1;
  font-weight: 500;
  color: #333;
}

.menu-arrow {
  font-size: 1rem;
  color: #999;
}

/* 底部导航 */
.bottom-nav {
  background: white;
  border-top: 1px solid #e0e0e0;
  padding: 15px 10px;
  display: flex;
  justify-content: space-around;
  position: sticky;
  bottom: 0;
  z-index: 100;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  color: #666;
  transition: color 0.3s ease;
}

.nav-item.active {
  color: #667eea;
}

.nav-icon {
  font-size: 1.3rem;
}

.nav-label {
  font-size: 0.7rem;
}

/* 弹窗 */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 20px;
  padding: 30px;
  width: 90%;
  max-width: 400px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h3 {
  color: #667eea;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #999;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 1rem;
}

.form-group input:focus {
  border-color: #667eea;
}

.save-btn {
  width: 100%;
  padding: 15px;
  background: #667eea;
  color: white;
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.save-btn:hover {
  background: #5a6fd8;
}

/* 分享弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.share-modal {
  background: white;
  border-radius: 20px 20px 0 0;
  width: 100%;
  max-width: 500px;
  padding: 20px;
}

.share-options {
  display: flex;
  justify-content: space-around;
  padding: 20px 0;
}

.share-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  padding: 15px;
  border-radius: 10px;
  transition: background-color 0.3s ease;
}

.share-option:hover {
  background: #f5f7fa;
}

.share-icon {
  font-size: 2rem;
  margin-bottom: 10px;
}

.share-text {
  font-size: 0.9rem;
  color: #333;
}
</style>
