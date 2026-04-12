<template>
  <div class="profile-container">
    <!-- 头部导航 -->
    <header class="header">
      <h1>我的</h1>
      <div class="header-actions">
        <button class="action-btn" @click="openScanner">📷</button>
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
        </div>
      </div>

      <!-- 功能菜单 -->
      <div class="menu-section">
        <div class="menu-item" @click="showFeature('设置')">
          <span class="menu-icon">⚙️</span>
          <span class="menu-text">设置</span>
          <span class="menu-arrow">›</span>
        </div>
        <div class="menu-item" @click="openScanner">
          <span class="menu-icon">📷</span>
          <span class="menu-text">扫一扫</span>
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

    <!-- 分享菜单弹窗 -->
    <div v-if="showShareModal" class="modal-overlay" @click="showShareModal = false">
      <div class="share-modal" @click.stop>
        <div class="modal-header">
          <h3>分享我的ID</h3>
          <button class="close-btn" @click="showShareModal = false">×</button>
        </div>
        
        <!-- 二维码卡片 -->
        <div v-if="qrCodeDataUrl" class="qrcode-card">
          <img :src="qrCodeDataUrl" alt="用户ID二维码" class="qrcode-image" />
          <div class="qrcode-user-id">{{ user.id }}</div>
          <div class="qrcode-hint">扫码添加好友</div>
        </div>
        
        <!-- 分享选项 -->
        <div v-else class="share-options">
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

    <!-- 扫码弹窗 -->
    <div v-if="showScanner" class="scanner-fullscreen" @click="closeScanner">
      <div class="scanner-content" @click.stop>
        <div class="scanner-header">
          <h3>扫一扫</h3>
          <button class="close-btn" @click="closeScanner">×</button>
        </div>
        <div class="scanner-camera">
          <div id="qr-reader"></div>
        </div>
        <div class="scanner-hint">
          <p>将二维码放入框内，即可自动扫描</p>
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
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from '@/utils/toast'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { getSocket } from '@/socket'

const router = useRouter()
const showEditModal = ref(false)
const showShareModal = ref(false)
const showScanner = ref(false)
const qrCodeDataUrl = ref('')

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
  // ✅ 使用在线二维码生成服务
  const userId = user.value.id
  if (userId) {
    const encodedData = encodeURIComponent(userId)
    qrCodeDataUrl.value = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedData}`
    console.log('✅ 二维码生成成功')
  } else {
    showToast('用户ID不存在', 'error')
  }
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

// ✅ 打开扫码器
const openScanner = async () => {
  showScanner.value = true
  
  // 等待 DOM 更新后初始化扫描器
  setTimeout(async () => {
    try {
      // ✅ 强制请求摄像头权限并指定后置摄像头
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      
      // 停止流，因为 html5-qrcode 会自己创建流
      stream.getTracks().forEach(track => track.stop())

      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          videoConstraints: {
            facingMode: { exact: 'environment' }
          },
          rememberLastUsedCamera: true,
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
        },
        false // 不显示详细日志
      )
    
      scanner.render(onScanSuccess, onScanFailure)
      
      // 保存扫描器实例以便清理
      window.qrScanner = scanner
    } catch (err) {
      console.error('❌ 摄像头启动失败:', err)
      showToast('无法访问摄像头，请检查权限设置', 'error')
      closeScanner()
    }
  }, 300)
}

// ✅ 扫码成功回调
const onScanSuccess = (decodedText) => {
  console.log('✅ 扫码成功:', decodedText)
  
  // 停止扫描器
  if (window.qrScanner) {
    window.qrScanner.clear()
    delete window.qrScanner
  }
  
  closeScanner()
  
  // 判断是好友ID还是钱包地址
  if (/^\d{8}$/.test(decodedText)) {
    // 8位数字，认为是好友ID，直接发送好友请求
    showToast(`正在添加好友: ${decodedText}`, 'success')
    sendFriendRequest(decodedText)
  } else if (/^T[a-zA-Z0-9]{33}$/.test(decodedText)) {
    // TRON地址格式（T开头34位），跳转到转账页面
    showToast('识别到钱包地址，跳转转账页面', 'success')
    router.push(`/wallet/transfer?address=${decodedText}`)
  } else {
    showToast(`无法识别的二维码内容`, 'error')
  }
}

// ✅ 发送好友请求
const sendFriendRequest = async (userId) => {
  try {
    const socket = getSocket()
    socket.emit('chat:addFriend', {
      userId: userId,
      message: '通过扫码添加好友'
    })
    
    // 监听响应
    const handleResponse = (data) => {
      if (data.success) {
        showToast('好友请求已发送', 'success')
      } else {
        showToast(data.msg || '发送失败', 'error')
      }
      socket.off('friendRequestSent', handleResponse)
      socket.off('errorMessage', handleError)
    }
    
    const handleError = (data) => {
      showToast(data.msg || '发送失败', 'error')
      socket.off('friendRequestSent', handleResponse)
      socket.off('errorMessage', handleError)
    }
    
    socket.on('friendRequestSent', handleResponse)
    socket.on('errorMessage', handleError)
    
    // 5秒后超时
    setTimeout(() => {
      socket.off('friendRequestSent', handleResponse)
      socket.off('errorMessage', handleError)
    }, 5000)
  } catch (error) {
    console.error('发送好友请求失败:', error)
    showToast('发送失败', 'error')
  }
}

// ✅ 扫码失败回调
const onScanFailure = (error) => {
  // 静默失败，不显示错误
  // console.warn('扫码失败:', error)
}

// ✅ 关闭扫码器
const closeScanner = () => {
  // 停止扫描器
  if (window.qrScanner) {
    window.qrScanner.clear()
    delete window.qrScanner
  }
  
  showScanner.value = false
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
    // 🚪 使用统一的清理工具
    try {
      const { logoutCleanup } = await import('@/utils/logout')
      await logoutCleanup()
      console.log('✅ 已执行退出清理')
    } catch (error) {
      console.error('❌ 退出清理失败:', error)
    }
    
    // 跳转到登录页
    router.push('/login')
  }
}

// ✅ 页面卸载时清理
onUnmounted(() => {
  if (window.qrScanner) {
    window.qrScanner.clear()
    delete window.qrScanner
  }
})
</script>

<style scoped>
.profile-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 内容区域 */
.content {
  flex: 1;
  overflow-y: auto;
  /* ✅ 防止底部导航遮挡：底部导航高度(70px) + 安全区 */
  padding-bottom: calc(20px + 70px + env(safe-area-inset-bottom));
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

/* ✅ 扫码全屏样式 */
.scanner-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  z-index: 9999;
  display: flex;
  flex-direction: column;
}

.scanner-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
}

.scanner-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(to bottom, rgba(0,0,0,0.6), transparent);
}

.scanner-header h3 {
  color: white;
  font-size: 1.1rem;
  margin: 0;
}

.scanner-header .close-btn {
  background: rgba(255,255,255,0.2);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scanner-camera {
  flex: 1;
  position: relative;
  overflow: hidden;
}

#qr-reader {
  width: 100% !important;
  height: 100% !important;
  border: none !important;
}

#qr-reader video {
  object-fit: cover !important;
  width: 100vw !important;
  height: 100vh !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  z-index: 9998 !important;
}

#qr-reader__scan_region {
  background: transparent !important;
}

#qr-reader__dashboard {
  display: none !important;
}

.scanner-hint {
  position: absolute;
  bottom: 40px;
  left: 0;
  right: 0;
  text-align: center;
  z-index: 10;
}

.scanner-hint p {
  color: white;
  font-size: 0.95rem;
  background: rgba(0,0,0,0.5);
  padding: 12px 24px;
  border-radius: 20px;
  display: inline-block;
}

/* ✅ 二维码卡片样式 */
.qrcode-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
}

.qrcode-image {
  width: 250px;
  height: 250px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.qrcode-user-id {
  margin-top: 16px;
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  text-align: center;
}

.qrcode-hint {
  margin-top: 8px;
  font-size: 0.9rem;
  color: #999;
  text-align: center;
}
</style>
