<template>
  <div class="contacts-container">
    <!-- 搜索框 -->
    <div class="search-section">
      <div class="search-row">
        <input 
          type="text" 
          class="search-input" 
          v-model="searchKeyword"
          placeholder="搜索"
          style="text-align: center;"
        >
      </div>
    </div>

    <!-- 内容区域 -->
    <main class="content">
      <!-- 可能想认识的人 -->
      <div class="maybe-know-section" @click="showAddFriendModal">
        <span class="maybe-know-text">可能想认识的人</span>
        <span class="maybe-know-arrow">›</span>
      </div>
      
      <!-- 白色分隔条 -->
      <div class="section-divider"></div>

      <!-- 好友请求 -->
      <div class="contacts-section" v-if="friendRequests.length > 0">
        <div class="section-header">好友请求</div>
        <div 
          v-for="request in friendRequests" 
          :key="request.id"
          class="contact-item request-item"
        >
          <div class="contact-avatar">{{ request.avatar }}</div>
          <div class="contact-info">
            <div class="contact-name">{{ request.name }}</div>
            <div class="contact-id">{{ request.message || '请求添加你为好友' }}</div>
          </div>
          <div class="request-actions">
            <button class="accept-btn" @click="acceptFriendRequest(request)">接受</button>
            <button class="reject-btn" @click="rejectFriendRequest(request)">拒绝</button>
          </div>
        </div>
      </div>
      
      <!-- 好友列表 -->
      <div class="contacts-section" v-if="filteredContacts.length > 0">
        <div class="section-header">好友列表 ({{ filteredContacts.length }})</div>
        <div 
          v-for="contact in filteredContacts" 
          :key="contact.id"
          class="contact-item"
          @click="navigateToContact(contact.id)"
        >
          <div class="contact-avatar">{{ contact.avatar }}</div>
          <div class="contact-info">
            <div class="contact-name">{{ contact.name }}</div>
            <div class="contact-id">{{ contact.id }}</div>
          </div>
        </div>
      </div>
      
      <!-- 空状态 -->
      <div v-if="filteredContacts.length === 0 && friendRequests.length === 0" style="text-align: center; color: #999; padding: 40px;">
        暂无好友
      </div>
    </main>

    <!-- 添加好友弹窗 -->
    <div class="modal" v-if="showModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>添加好友</h3>
          <button class="close-btn" @click="showModal = false">&times;</button>
        </div>
        <form class="search-user-form" @submit.prevent="searchUser">
          <input 
            type="text" 
            class="search-user-input" 
            v-model="searchUserId" 
            placeholder="输入用户ID"
          >
          <button type="submit" class="search-user-btn">搜索</button>
        </form>
        <div class="search-results">
          <div 
            v-for="user in searchResults" 
            :key="user.id"
            class="search-result-item"
          >
            <div class="search-result-info">
              <div class="contact-avatar">{{ user.avatar }}</div>
              <div>
                <div style="font-weight: 500;">{{ user.name }}</div>
                <div style="font-size: 0.8rem; color: #666;">{{ user.id }}</div>
              </div>
            </div>
            <button class="add-friend-btn" @click="addFriend(user)">添加</button>
          </div>
          <div v-if="searchResults.length === 0 && hasSearched" style="text-align: center; color: #999; padding: 20px;">
            未找到用户
          </div>
        </div>
      </div>
    </div>

    <!-- Toast 提示 -->
    <Toast ref="toastRef" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { friendAPI, chatAPI } from '../api'
import Toast from '../components/Toast.vue'
import { getSocket } from '../socket'
import { useFriendStore } from '../stores/friendStore'

const router = useRouter()
const toastRef = ref(null)
const showModal = ref(false)
const searchUserId = ref('')
const searchResults = ref([])
const hasSearched = ref(false)
const loading = ref(true)

// ✅ 搜索关键词
const searchKeyword = ref('')

// ✅ 使用全局好友 Store
const friendStore = useFriendStore()
const friendRequests = computed(() => friendStore.friendRequests)

// 联系人数据
const allContacts = ref([])
const groups = ref([])

// ✅ 过滤后的联系人列表
const filteredContacts = computed(() => {
  if (!searchKeyword.value) {
    return allContacts.value
  }
  
  const keyword = searchKeyword.value.toLowerCase()
  return allContacts.value.filter(contact => 
    contact.name.toLowerCase().includes(keyword) ||
    contact.id.toLowerCase().includes(keyword)
  )
})

// ✅ 处理搜索输入
const handleSearch = () => {
  // computed 会自动更新，这里可以添加防抖等逻辑
}

// 获取联系人列表
const fetchContacts = async () => {
  loading.value = true
  try {
    console.log('📥 [Contacts] 获取好友列表...')
    
    // ✅ 优先从 localStorage 读取缓存
    let friendIds = JSON.parse(localStorage.getItem('friendIds') || '[]')
    
    // 如果缓存为空，才从 store 或 API 获取
    if (!friendIds || friendIds.length === 0) {
      // 尝试从 store 读取
      friendIds = friendStore.friendIds
      
      // 如果 store 也为空，请求 API
      if (!friendIds || friendIds.length === 0) {
        console.log('⚠️ [Contacts] 无缓存数据，请求 API...')
        const response = await friendAPI.getFriends()
        
        if (Array.isArray(response.data)) {
          friendIds = response.data
        } else if (Array.isArray(response)) {
          friendIds = response
        }
        
        // 保存到 localStorage 和 store
        if (friendIds.length > 0) {
          localStorage.setItem('friendIds', JSON.stringify(friendIds))
          friendStore.setFriendIds(friendIds)
        }
      }
    }
    
    console.log('👥 [Contacts] 好友ID数组:', friendIds)
    
    if (friendIds.length > 0) {
      // ✅ 确保所有 friendId 都是字符串（过滤无效数据）
      const validFriendIds = friendIds
        .filter(id => id)  // 过滤空值
        .map(id => {
          // 如果是对象，提取 id 或 _id 或 userId 字段
          if (typeof id === 'object' && id !== null) {
            return String(id.id || id._id || id.userId || '')
          }
          return String(id)
        })
        .filter(id => id.length > 0)  // 过滤空字符串
      
      console.log('✅ [Contacts] 清洗后的好友ID:', validFriendIds)
      
      // 🆕 根据 ID 数组构建联系人列表（需要从 Store 或 API 获取详情）
      const friends = validFriendIds.map(friendId => {
        // ✅ 确保 friendId 是字符串
        const idStr = String(friendId)
        
        // 尝试从 friendStore 获取详情
        const detail = friendStore.getFriendDetail(idStr)
        
        // ✅ 从 localStorage 读取备注
        const cachedFriends = JSON.parse(localStorage.getItem('friendDetails') || '{}')
        const remark = cachedFriends[idStr]?.remark
        
        return {
          id: idStr,
          name: remark || detail?.username || `用户${idStr.slice(-4)}`,
          avatar: detail?.avatar || '👤',
          status: friendStore.onlineStatus[idStr] ? 'online' : 'offline',
          unreadCount: 0
        }
      })
      
      allContacts.value = friends
      
      console.log('✅ [Contacts] 加载好友列表:', friends.length, '条')
      console.log('✅ [Contacts] 好友详情:', friends)
      
      // 🆕 批量获取缺失的好友详情
      await friendStore.fetchFriendDetails(validFriendIds, async (ids) => {
        // TODO: 调用 API 获取用户详情
        console.log('🌐 获取好友详情:', ids)
        return [] // 暂时返回空，后续实现
      })
      
      // 重新渲染（详情更新后）
      setTimeout(() => {
        const cachedFriends = JSON.parse(localStorage.getItem('friendDetails') || '{}')
        const updatedFriends = validFriendIds.map(friendId => {
          // ✅ 确保 friendId 是字符串
          const idStr = String(friendId)
          
          const detail = friendStore.getFriendDetail(idStr)
          const remark = cachedFriends[idStr]?.remark
          return {
            id: idStr,
            name: remark || detail?.username || `用户${idStr.slice(-4)}`,
            avatar: detail?.avatar || '👤',
            status: friendStore.onlineStatus[idStr] ? 'online' : 'offline',
            unreadCount: 0
          }
        })
        allContacts.value = updatedFriends
      }, 500)
    } else {
      console.warn('⚠️ [Contacts] 没有好友数据')
      allContacts.value = []
    }
    
    // 获取群聊列表（优先从缓存读取）
    const currentUserId = localStorage.getItem('userId')
    const cachedGroups = localStorage.getItem(`groups_${currentUserId}`)
    
    if (cachedGroups) {
      console.log('💾 [Contacts] 从缓存读取群组列表')
      const groupList = JSON.parse(cachedGroups)
      groups.value = groupList.map(group => ({
        id: group.id,
        name: group.name,
        avatar: group.avatar || '👥',
        members: group.memberCount || 0
      }))
    }
  } catch (error) {
    console.error('❌ [Contacts] 获取联系人列表失败:', error)
    console.error('❌ [Contacts] 错误详情:', error.response?.data || error.message)
  } finally {
    loading.value = false
  }
}

// 获取好友请求列表


// ✅ 设置 WebSocket 监听
let socketListeners = []

const setupWebSocketListeners = () => {
  const socket = getSocket()
  
  // 监听好友请求发送成功
  const friendRequestSentHandler = (data) => {
    console.log('✅ [Contacts] 好友请求已发送:', data)
    toastRef.value?.success(data.msg || '好友请求已发送')
    // 关闭弹窗
    showModal.value = false
    searchResults.value = []
    hasSearched.value = false
  }
  socket.on('friendRequestSent', friendRequestSentHandler)
  socketListeners.push({ event: 'friendRequestSent', handler: friendRequestSentHandler })
  
  // 监听收到好友请求
  const friendRequestReceivedHandler = (data) => {
    console.log('📨 [Contacts] 收到好友请求:', data)
    console.log('📨 [Contacts] 数据类型:', typeof data)
    console.log('📨 [Contacts] 数据详情:', JSON.stringify(data, null, 2))
    
    // ✅ 直接添加到列表，不依赖 API
    const newRequest = {
      id: data._id || data.id,
      name: data.fromUser?.username || data.sender?.username || '有人',
      avatar: data.fromUser?.avatar || data.sender?.avatar || '👤',
      message: data.message || '请求添加你为好友'
    }
    
    // 检查是否已存在
    const exists = friendRequests.value.some(req => req.id === newRequest.id)
    if (!exists) {
      friendRequests.value.unshift(newRequest)  // 添加到开头
      console.log('✅ [Contacts] 已添加新好友请求到列表')
    } else {
      console.log('⚠️ [Contacts] 好友请求已存在，跳过')
    }
    
    // 显示 Toast 提示
    toastRef.value?.info(`${newRequest.name} 请求添加你为好友`)
  }
  socket.on('friendRequestReceived', friendRequestReceivedHandler)
  socketListeners.push({ event: 'friendRequestReceived', handler: friendRequestReceivedHandler })
  
  // 监听好友列表更新
  const friendListUpdatedHandler = (data) => {
    console.log('👥 [Contacts] 好友列表更新:', data)
    fetchContacts()
  }
  socket.on('friendListUpdated', friendListUpdatedHandler)
  socketListeners.push({ event: 'friendListUpdated', handler: friendListUpdatedHandler })
  
  // 监听好友请求被接受
  const friendRequestAcceptedHandler = (data) => {
    console.log('✅ [Contacts] 好友请求被接受:', data)
    toastRef.value?.success('好友请求已被接受')
    
    // ✅ 从 store 中移除已接受的请求
    if (data.friendId || data.requestId) {
      const requestToRemove = friendRequests.value.find(req => 
        req.id === data.requestId || req.fromUser?.userId === data.friendId
      )
      if (requestToRemove) {
        friendStore.removeFriendRequest(requestToRemove.id)
      }
    }
    
    // ⚠️ 不调用 fetchContacts()，等待 friendListUpdated 广播
  }
  socket.on('friendRequestAccepted', friendRequestAcceptedHandler)
  socketListeners.push({ event: 'friendRequestAccepted', handler: friendRequestAcceptedHandler })
  
  // 监听好友请求被拒绝
  const friendRequestRejectedHandler = (data) => {
    console.log('❌ [Contacts] 好友请求被拒绝:', data)
    toastRef.value?.warning('好友请求被拒绝')
    
    // ✅ 从列表中移除已拒绝的请求
    if (data.requestId) {
      friendRequests.value = friendRequests.value.filter(req => req.id !== data.requestId)
      console.log('✅ [Contacts] 已从列表中移除已拒绝的请求')
    }
  }
  socket.on('friendRequestRejected', friendRequestRejectedHandler)
  socketListeners.push({ event: 'friendRequestRejected', handler: friendRequestRejectedHandler })
  
  // 监听错误消息
  const errorMessageHandler = (data) => {
    console.log('⚠️ [Contacts] 收到错误消息:', data)
    
    let msg = ''
    
    // Socket.IO 会将数组参数展开，所以 data 可能是：
    // 1. 对象: {msg: '...'} - 后端发送 ['...', ...] 时
    // 2. 字符串: '...' - 后端发送单个字符串时
    // 3. 数组: [...] - 后端发送嵌套数组时（较少见）
    
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      // 对象格式: {msg: '...'}
      msg = data.msg || data.message || ''
    } else if (Array.isArray(data) && data.length > 0) {
      // 数组格式: [{msg: '...'}] 或 ['...']
      const firstItem = data[0]
      if (typeof firstItem === 'object' && firstItem !== null) {
        msg = firstItem.msg || firstItem.message || ''
      } else {
        msg = String(firstItem)
      }
    } else if (typeof data === 'string') {
      // 字符串格式
      msg = data
    }
    
    console.log('🔍 [Contacts] 解析后的消息:', msg)
    
    // 🆕 如果是成功消息（后端用 errorMessage 发送提示）
    if (msg === '已发送好友请求' || msg.includes('好友请求已发送')) {
      toastRef.value?.success(msg)
      showModal.value = false
      searchResults.value = []
      hasSearched.value = false
    } else if (msg) {
      toastRef.value?.error(msg || '操作失败')
    }
  }
  socket.on('errorMessage', errorMessageHandler)
  socketListeners.push({ event: 'errorMessage', handler: errorMessageHandler })
}

// 清理 WebSocket 监听器
const cleanupWebSocketListeners = () => {
  const socket = getSocket()
  socketListeners.forEach(({ event, handler }) => {
    socket.off(event, handler)
  })
  socketListeners = []
  console.log('✅ [Contacts] Socket 监听器已清理')
}

onMounted(() => {
  fetchContacts()
  setupWebSocketListeners()
  
  // ✅ 请求浏览器通知权限
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      console.log('🔔 通知权限:', permission)
    })
  }
})

onUnmounted(() => {
  // ✅ 清理 Socket 监听器，避免内存泄漏
  cleanupWebSocketListeners()
})

// 跳转到聊天页面
const goToChat = (contact) => {
  // 判断是联系人还是群组
  // 联系人：跳转到联系人详情页
  // 群组：直接跳转到聊天页面
  if (contact.members) {
    // 有 members 字段说明是群组，直接进入聊天
    router.push(`/chat/${contact.id}`)
  } else {
    // 联系人，跳转到联系人详情页
    router.push(`/contact/${contact.id}`)
  }
}

// 导航
const navigate = (path) => {
  router.push(path)
}

// 显示添加好友弹窗
const showAddFriendModal = () => {
  showModal.value = true
}

// ✅ 刷新所有数据
const refreshAll = async () => {
  console.log('🔄 [Contacts] 手动刷新所有数据...')
  toastRef.value?.info('正在刷新...')
  
  await Promise.all([
    fetchContacts(),
    fetchFriendRequests()
  ])
  
  toastRef.value?.success('刷新成功')
}

// 搜索用户
const searchUser = async () => {
  if (!searchUserId.value) {
    toastRef.value?.warning('请输入用户ID或用户名')
    return
  }
  
  try {
    // 调用搜索用户的API
    const response = await friendAPI.searchUsers(searchUserId.value)
    console.log('🔍 搜索结果:', response)
    hasSearched.value = true
    
    if (response && Array.isArray(response) && response.length > 0) {
      searchResults.value = response.map(user => ({
        id: user.userId || user._id,
        name: user.username,
        avatar: user.avatar || user.username.substring(0, 2).toUpperCase()
      }))
      console.log('✅ 处理后的结果:', searchResults.value)
      toastRef.value?.success(`找到 ${searchResults.value.length} 个用户`)
    } else {
      searchResults.value = []
      toastRef.value?.info('未找到用户，请检查输入的ID或用户名')
    }
  } catch (error) {
    console.error('搜索用户失败:', error)
    toastRef.value?.error('搜索失败，请稍后重试')
    searchResults.value = []
  }
}

// 添加好友
const addFriend = (user) => {
  console.log('🔥 [Contacts] 点击添加好友');
  console.log('🔥 [Contacts] user:', user);
  
  if (!user || !user.id) {
    console.error('❌ [Contacts] user 或 user.id 为空');
    toastRef.value?.error('用户信息错误');
    return;
  }
  
  const socket = getSocket();
  if (!socket || !socket.connected) {
    console.error('❌ [Contacts] WebSocket 未连接');
    toastRef.value?.error('网络连接异常');
    return;
  }
  
  console.log('📨 [Contacts] 发送 chat:addFriend 事件');
  console.log('📨 [Contacts] userId:', user.id);
  
  socket.emit('chat:addFriend', {
    userId: String(user.id),
    message: '你好，我想加你好友'
  });
  
  console.log('✅ [Contacts] 事件已发送');
  toastRef.value?.info('请求已发送，等待对方同意');
}

// 接受好友请求
const acceptFriendRequest = async (request) => {
  try {
    console.log('✅ 接受好友请求:', request.id)
    
    // ✅ 立即从 store 中移除，防止重复点击
    friendStore.removeFriendRequest(request.id)
    
    // ✅ 通过 WebSocket 接受
    const socket = getSocket()
    socket.emit('chat:acceptFriend', {
      requestId: request.id
    })
    
    toastRef.value?.success('正在处理...')
    
  } catch (error) {
    console.error('接受好友请求失败:', error)
    toastRef.value?.error('操作失败')
  }
}

// ✅ 跳转到联系人详情
const navigateToContact = (contactId) => {
  router.push(`/contact/${contactId}`)
}

// 拒绝好友请求
const rejectFriendRequest = async (request) => {
  try {
    console.log('❌ 拒绝好友请求:', request.id)
    
    // ✅ 通过 WebSocket 拒绝
    const socket = getSocket()
    socket.emit('chat:rejectFriend', {
      requestId: request.id
    })
    
    // ✅ 从 store 中移除
    friendStore.removeFriendRequest(request.id)
    
    toastRef.value?.info('已拒绝好友请求')
    
  } catch (error) {
    console.error('拒绝好友请求失败:', error)
    toastRef.value?.error('操作失败')
  }
}
</script>

<style scoped>
.contacts-container {
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
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header h1 {
  color: #333;
  font-size: 1.5rem;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

/* 搜索框区域 */
.search-section {
  background: transparent;
  padding: 10px 20px 15px;
  position: sticky;
  top: 58px; /* header height */
  z-index: 99;
}

.search-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.search-input {
  flex: 1;
  width: auto;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  outline: none;
  background: transparent;
  color: #333;
}

.search-input::placeholder {
  color: #999;
}

.search-input:focus {
  background: transparent;
}

.add-friend-btn {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-friend-btn:hover {
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  transform: translateY(-1px);
}

.add-friend-btn:active {
  transform: scale(0.96);
}

/* 可能想认识的人 */
.maybe-know-section {
  background: transparent;
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: background 0.2s;
}

.maybe-know-section:hover {
  background: #f9f9f9;
}

.maybe-know-text {
  color: #999;
  font-size: 1rem;
}

.maybe-know-arrow {
  color: #999;
  font-size: 1.2rem;
}

/* 白色分隔条 */
.section-divider {
  height: 8px;
  background: white;
  width: 100%;
  flex-shrink: 0;
}

.action-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: #667eea;
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: bold;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.action-btn:hover {
  background: #5568d3;
  transform: scale(1.05);
}

/* 内容区域 */
.content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.contacts-section {
  margin-bottom: 30px;
}

.section-header {
  font-size: 0.9rem;
  color: #999;
  margin-bottom: 10px;
  padding: 0 20px;
}

.contact-item {
  background: white;
  border-radius: 10px;
  padding: 15px;
  margin: 0 0.5% 10px;
  display: flex;
  align-items: center;
  gap: 15px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.contact-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.contact-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
  font-weight: 500;
}

.contact-info {
  flex: 1;
  min-width: 0;
}

.contact-name {
  font-weight: 500;
  margin-bottom: 5px;
}

.contact-id {
  font-size: 0.8rem;
  color: #666;
}

.contact-status {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #2ed573;
  margin-left: 10px;
}

.contact-status.offline {
  background: #999;
}

/* 未读消息小红点 */
.contact-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.unread-badge {
  background: #ff4d4f;
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 12px;
  min-width: 18px;
  text-align: center;
  font-weight: 500;
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

.search-user-form {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.search-user-input {
  flex: 1;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
}

.search-user-btn {
  padding: 12px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
}

.search-results {
  max-height: 300px;
  overflow-y: auto;
}

.search-result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  border-bottom: 1px solid #f0f0f0;
}

.search-result-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.add-friend-btn {
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.9rem;
}

/* ✅ 搜索框样式 */
.search-section {
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #f0f0f0;
}

.search-input {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  font-size: 0.95rem;
  outline: none;
  transition: all 0.3s;
}

.search-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* ✅ 空状态提示 */
.empty-tip {
  text-align: center;
  padding: 40px 20px;
  color: #999;
  font-size: 0.9rem;
}

/* 好友请求样式 */
.request-item {
  justify-content: space-between;
}

.request-actions {
  display: flex;
  gap: 8px;
}

.accept-btn {
  padding: 6px 12px;
  background: #2ed573;
  color: white;
  border: none;
  border-radius: 15px;
  cursor: pointer;
  font-size: 0.8rem;
}

.reject-btn {
  padding: 6px 12px;
  background: #ff4757;
  color: white;
  border: none;
  border-radius: 15px;
  cursor: pointer;
  font-size: 0.8rem;
}
</style>
