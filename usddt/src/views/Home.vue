<template>
  <div class="home-container">
    <!-- 内容区域 -->
    <main class="content">
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
          <button class="add-group-btn" @click="navigate('/create-chain-group')">
            +
          </button>
        </div>
      </div>
      
      <!-- 消息列表 -->
      <div class="contacts-container">
        <!-- 🌟 群组列表 -->
        <div class="contacts-section">
          <div class="section-header">群组</div>
          
          <!-- ✅ 我的接龙群卡片 -->
          <div 
            class="contact-item group-item my-groups-card"
            @click="navigate('/chain-groups')"
          >
            <div class="contact-avatar">🐉</div>
            <div class="contact-info">
              <div class="contact-name">我的群组</div>
              <div class="contact-preview">查看我加入的接龙群</div>
            </div>
            <div class="contact-time">›</div>
          </div>
          
          <!-- 🔥 固定卡片1：六合天下 -->
          <div 
            class="contact-item group-item"
            @click="showChainGroupConfirm({ id: '1000001', name: '六合天下', avatar: '🎲' })"
          >
            <div class="contact-avatar">🎲</div>
            <div class="contact-info">
              <div class="contact-name">六合天下</div>
              <div class="contact-preview">六合彩红包接龙群</div>
            </div>
            <div class="contact-time"></div>
          </div>
          
          <!-- 🔥 固定卡片3：红包接龙 -->
          <div 
            class="contact-item group-item"
            @click="showChainGroupConfirm({ id: '1000002', name: '红包接龙', avatar: '🧧' })"
          >
            <div class="contact-avatar">🧧</div>
            <div class="contact-info">
              <div class="contact-name">红包接龙</div>
              <div class="contact-preview">普通红包接龙群</div>
            </div>
            <div class="contact-time"></div>
          </div>
        </div>
        
        <!-- 最近消息 -->
        <div class="contacts-section">
          <div class="section-header">最新消息</div>
          
          <!-- 好友列表（动态） -->
          <div 
            v-for="contact in contacts" 
            :key="contact.id"
            class="contact-item"
            @click="openChat(contact)"
          >
            <div class="contact-avatar">{{ contact.avatar }}</div>
            <div class="contact-info">
              <div class="contact-name">{{ contact.name }}</div>
              <div class="contact-preview">{{ contact.preview }}</div>
            </div>
            <div class="contact-time">{{ contact.time }}</div>
          </div>
        </div>
      </div>
    </main>

    <!-- 创建群聊弹窗 -->
    <div class="modal" v-if="showModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>创建群聊</h3>
          <button class="close-btn" @click="showModal = false">&times;</button>
        </div>
        <div class="create-group-content">
          <div class="form-group">
            <label for="groupName">群聊名称</label>
            <input 
              type="text" 
              id="groupName" 
              v-model="groupName" 
              placeholder="请输入群聊名称"
              required
            >
          </div>
          
          <div class="form-group">
            <label>选择好友（至少选择2位）</label>
            <div class="friends-list">
              <div 
                v-for="friend in availableFriends" 
                :key="friend.id"
                :class="['friend-item', { selected: selectedFriends.includes(friend.id) }]"
                @click="toggleFriendSelection(friend.id)"
              >
                <div class="contact-avatar">{{ friend.avatar }}</div>
                <div class="friend-info">
                  <div class="friend-name">{{ friend.name }}</div>
                  <div class="friend-id">{{ friend.id }}</div>
                </div>
                <div class="friend-checkbox" :class="{ checked: selectedFriends.includes(friend.id) }">
                  {{ selectedFriends.includes(friend.id) ? '✓' : '' }}
                </div>
              </div>
            </div>
          </div>
          
          <div class="selected-count">
            已选择 {{ selectedFriends.length }} 位好友
          </div>
          
          <button 
            class="create-group-btn" 
            @click="createGroup"
            :disabled="selectedFriends.length < 2"
          >
            创建群聊
          </button>
        </div>
      </div>
    </div>
    
    <!-- 🐉 接龙群确认卡片 - 底部弹出 -->
    <div v-if="showChainConfirmModal && selectedChainGroup" class="chain-modal-overlay" @click="showChainConfirmModal = false">
      <div class="chain-modal-content" @click.stop>
        <div class="chain-modal-header">
          <h3>🐉 加入接龙群</h3>
          <button class="chain-close-btn" @click="showChainConfirmModal = false; selectedChainGroup = null">✕</button>
        </div>
        <div class="chain-modal-body">
          <div class="group-summary">
            <div class="group-name-large">{{ selectedChainGroup.name }}</div>
          </div>
          
          <div class="fee-breakdown">
            <h4>💰 费用明细</h4>
            <div class="fee-item">
              <span class="fee-label">🎫 门票金额</span>
              <span class="fee-value">{{ selectedChainGroup.settings.ticketAmount }} USDT</span>
            </div>
            <div class="fee-item">
              <span class="fee-label">🧧 首包金额</span>
              <span class="fee-value">{{ selectedChainGroup.settings.firstRedPacketAmount }} USDT</span>
            </div>
            <div class="fee-divider"></div>
            <div class="fee-item total">
              <span class="fee-label">合计支付</span>
              <span class="fee-value highlight">{{ selectedChainGroup.settings.ticketAmount + selectedChainGroup.settings.firstRedPacketAmount }} USDT</span>
            </div>
          </div>
          
          <div class="rules-info">
            <h4>📋 群规则</h4>
            <div class="rule-item">
              <span>⏰ 等待时间：</span>
              <span>{{ selectedChainGroup.settings.waitHours }} 小时后可抢红包</span>
            </div>
            <div class="rule-item">
              <span>🚫 踢出阈值：</span>
              <span>累计抢到 {{ selectedChainGroup.settings.kickThreshold }} USDT 自动踢出</span>
            </div>
          </div>
          
          <div class="warning-box">
            <strong>⚠️ 注意：</strong>
            <ul>
              <li>进群后需等待 {{ selectedChainGroup.settings.waitHours }} 小时才能抢红包</li>
              <li>累计抢到 {{ selectedChainGroup.settings.kickThreshold }} USDT 会被自动踢出</li>
              <li>被踢出后可重新缴费进群</li>
            </ul>
          </div>
        </div>
        <div class="chain-modal-footer">
          <button class="btn-cancel" @click="showChainConfirmModal = false; selectedChainGroup = null">取消</button>
          <button class="btn-confirm" @click="confirmJoinChainGroup" :disabled="joiningChain">
            {{ joiningChain ? '处理中...' : '我同意并加入' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ✅ 进群成功提示卡片 -->
    <JoinSuccessModal 
      v-if="showJoinSuccessModal && selectedChainGroup"
      :visible="showJoinSuccessModal"
      :group-name="selectedChainGroup.name"
      :settings="selectedChainGroup.settings"
      @close="showJoinSuccessModal = false"
      @ok="handleJoinSuccessOk"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { chatAPI, friendAPI, chainGroupAPI } from '@/api'
import JoinSuccessModal from '@/components/JoinSuccessModal.vue'
import { getSocket, joinChainGroupViaSocket, onChainGroupJoined } from '@/socket'
import { showToast } from '@/utils/toast'

// 🐉 接龙群固定配置（写死在代码里，不需要缓存）
const CHAIN_GROUP_CONFIG = {
  '1000001': {
    name: '六合天下',
    ticketAmount: '10',  // 门票 10 USDT
    firstPacketAmount: '300',  // 首包 300 USDT
    waitHours: '3',  // 等待 3 小时
    kickThreshold: '380',  // 踢出阈值 380 USDT
    description: '六合彩红包接龙群'
  },
  '1000002': {
    name: '红包接龙',
    ticketAmount: '10',  // 门票 10 USDT
    firstPacketAmount: '300',  // 首包 300 USDT
    waitHours: '3',  // 等待 3 小时
    kickThreshold: '380',  // 踢出阈值 380 USDT
    description: '普通红包接龙群'
  }
}

// ✅ 固定的群组列表（直接写死，不请求）
const FIXED_GROUPS = [
  {
    id: '1000001',
    name: '六合天下',
    avatar: '🎲',
    memberCount: 0,  // TODO: 可以从后端获取
    preview: '六合彩红包接龙群',
    time: '',
    isChainGroup: true,
    isJoined: false,  // 需要根据用户状态判断
    isPublic: true,
    settings: {
      isChainRedPacket: true,
      ticketAmount: '10',
      firstPacketAmount: '300',
      waitHours: '3',
      kickThreshold: '380'
    }
  },
  {
    id: '1000002',
    name: '红包接龙',
    avatar: '🧧',
    memberCount: 0,
    preview: '普通红包接龙群',
    time: '',
    isChainGroup: true,
    isJoined: false,
    isPublic: true,
    settings: {
      isChainRedPacket: true,
      ticketAmount: '10',
      firstPacketAmount: '300',
      waitHours: '3',
      kickThreshold: '380'
    }
  }
]

const router = useRouter()
const showModal = ref(false)
const groupName = ref('')
const selectedFriends = ref([])
const loading = ref(true)

// 🐉 接龙群确认弹窗
const showChainConfirmModal = ref(false)
const selectedChainGroup = ref(null)
const joiningChain = ref(false)

// ✅ 进群成功提示卡片
const showJoinSuccessModal = ref(false)

// ✅ WebSocket 取消订阅函数
let unsubscribeChainGroupJoined = null

// 联系人数据
const contacts = ref([])
const pinnedContacts = ref([])
const groupChats = ref([])

// ✅ 从 IndexedDB 加载私聊消息列表
const loadPrivateChats = async () => {
  try {
    const { getDB } = await import('@/utils/chatStorage')
    const db = await getDB()
    const allMessages = await db.getAll('messages')
    
    console.log('🔍 [Home] IndexedDB 中的所有消息数:', allMessages.length)
    
    // 按 chatId 分组，获取最新消息
    const chatMap = new Map()
    allMessages.forEach(msg => {
      if (!msg.chatId) return
      
      // 只加载私聊消息（chatId 是纯数字）
      if (/^\d+$/.test(msg.chatId)) {
        const chatId = msg.chatId
        if (!chatMap.has(chatId)) {
          chatMap.set(chatId, [])
        }
        chatMap.get(chatId).push(msg)
      }
    })
    
    console.log('🔍 [Home] 私聊对话数:', chatMap.size)
    
    // 转换为 contacts 格式
    const privateContacts = []
    for (const [chatId, messages] of chatMap) {
      // 按时间排序，获取最新消息
      messages.sort((a, b) => new Date(b.createdAt || b.time) - new Date(a.createdAt || a.time))
      const latestMsg = messages[0]
      
      privateContacts.push({
        id: chatId,
        type: 'private',
        name: chatId,
        avatar: '👤',
        preview: latestMsg.type === 'redPacket' ? '[红包]' : (latestMsg.content || ''),
        time: formatTime(latestMsg.createdAt || latestMsg.time)
      })
    }
    
    // 按时间排序
    privateContacts.sort((a, b) => {
      const msgA = chatMap.get(a.id)[0]
      const msgB = chatMap.get(b.id)[0]
      return new Date(msgB.createdAt || msgB.time) - new Date(msgA.createdAt || msgA.time)
    })
    
    contacts.value = privateContacts
    console.log('✅ [Home] 加载联系人列表:', privateContacts.length, '个')
  } catch (error) {
    console.error('❌ [Home] 加载联系人失败:', error)
  }
}

// ✅ 监听 WebSocket 好友列表更新，更新联系人列表
const setupFriendListListener = () => {
  const socket = getSocket()
  if (!socket) return
  
  socket.on('friendListUpdated', (data) => {
    console.log('👥 [Home] 收到好友列表更新:', data)
    
    // 🆕 兼容两种格式：{friendIds: [...]} 或 {friends: [...]}
    let friendList = []
    
    if (data.friends && Array.isArray(data.friends)) {
      // 对象数组格式
      friendList = data.friends
    } else if (data.friendIds && Array.isArray(data.friendIds)) {
      // ID 数组格式，需要转换为对象
      friendList = data.friendIds.map(id => ({
        userId: id,
        username: `用户${id.slice(-4)}`,
        avatar: '👤'
      }))
    } else if (Array.isArray(data)) {
      // 直接是数组
      friendList = data.map(item => 
        typeof item === 'string' ? {
          userId: item,
          username: `用户${item.slice(-4)}`,
          avatar: '👤'
        } : item
      )
    }
    
    if (friendList.length === 0) {
      console.warn('⚠️ [Home] 好友列表为空')
      contacts.value = []
      return
    }
    
    // 🔥 直接用好友列表作为联系人
    contacts.value = friendList.map(friend => ({
      id: friend._id || friend.id || friend.userId,
      type: 'private',
      name: friend.username || friend.name || '未命名',
      avatar: friend.avatar || '👤',
      preview: '暂无消息',
      time: ''
    }))
    
    console.log('✅ [Home] 已更新联系人列表:', contacts.value.length, '个')
    
    // 然后加载消息预览
    loadMessagePreviews()
  })
  
  // 🔥 立即请求一次好友列表
  console.log('🔍 [Home] 主动请求好友列表...')
  socket.emit('getFriendList')
}

// 🔥 从 IndexedDB 加载消息预览
const loadMessagePreviews = async () => {
  try {
    const { getDB } = await import('@/utils/chatStorage')
    const db = await getDB()
    const allMessages = await db.getAll('messages')
    
    // 按 chatId 分组
    const chatMap = new Map()
    allMessages.forEach(msg => {
      if (!msg.chatId || !/^\d+$/.test(msg.chatId)) return
      
      if (!chatMap.has(msg.chatId)) {
        chatMap.set(msg.chatId, [])
      }
      chatMap.get(msg.chatId).push(msg)
    })
    
    // 更新 contacts 中的消息预览
    contacts.value = contacts.value.map(contact => {
      const messages = chatMap.get(contact.id)
      if (!messages || messages.length === 0) return contact
      
      // 按时间排序，获取最新消息
      messages.sort((a, b) => new Date(b.createdAt || b.time) - new Date(a.createdAt || a.time))
      const latestMsg = messages[0]
      
      return {
        ...contact,
        preview: latestMsg.type === 'redPacket' ? '[红包]' : (latestMsg.content || ''),
        time: formatTime(latestMsg.createdAt || latestMsg.time)
      }
    })
    
    console.log('✅ [Home] 已加载消息预览')
  } catch (error) {
    console.error('❌ [Home] 加载消息预览失败:', error)
  }
}

// ✅ 计算属性：显示所有群组（包括未加入的接龙群）
const joinedGroupChats = computed(() => {
  // 🐉 显示所有群组，让用户可以看到并选择加入
  return groupChats.value
})

console.log('所有群组:', groupChats.value.length)
console.log('已加入群组:', joinedGroupChats.value.length)

// 可用好友列表（用于创建群聊）
const availableFriends = ref([])

// 获取聊天列表（改为从 WebSocket 接收）
const fetchChats = async () => {
  loading.value = true
  try {
    // ✅ 不再主动请求，等待 WebSocket 广播
    console.log('⏳ [Home] 等待 WebSocket 推送群组列表...')
  } catch (error) {
    console.error('初始化失败:', error)
  } finally {
    loading.value = false
  }
}

// ✅ 设置 WebSocket 监听（已移至 App.vue 全局监听）
const setupWebSocketListeners = () => {
  // ⚠️ 所有 WebSocket 监听已移至 App.vue 全局处理
  // Home 页面不再需要单独注册监听器
  console.log('✅ [Home] WebSocket 监听由 App.vue 全局管理')
}

// ✅ 设置接龙群加入结果监听
const setupChainGroupJoinListener = () => {
  unsubscribeChainGroupJoined = onChainGroupJoined((data) => {
    console.log('🎉 [Home] 收到加入接龙群成功事件:', data)
    
    joiningChain.value = false
    
    if (data.success) {
      // ✅ 进群成功，更新缓存
      const currentUserId = localStorage.getItem('userId')
      const groupId = selectedChainGroup.value?.id
      
      if (groupId) {
        localStorage.setItem(`joined_${currentUserId}_${groupId}`, '1')
        console.log(`💾 已更新缓存: joined_${currentUserId}_${groupId} = 1`)
        
        // 保存关键数据到 sessionStorage
        sessionStorage.setItem('justJoinedChainGroup', JSON.stringify({
          groupId: groupId,
          redPacket: data.redPacket,
          canGrabAfter: data.canGrabAfter,
          remainingBalance: data.remainingBalance,
          groupInfo: data.group
        }))
        
        console.log('✅ 进群成功，红包数据:', data.redPacket)
        console.log('⏰ 可抢红包时间:', data.canGrabAfter)
        
        // ✅ 显示进群成功提示卡片
        showJoinSuccessModal.value = true
      }
    } else {
      // 进群失败
      console.error('❌ 进群失败:', data.message)
      showToast('❌ 加入失败\n\n' + (data.message || '未知错误'), 'error', 3000)
    }
  })
}

// 格式化时间
const formatTime = (isoString) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  const now = new Date()
  const diff = now - date
  
  // 今天
  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  
  // 昨天
  if (diff < 2 * 24 * 60 * 60 * 1000) {
    return '昨天'
  }
  
  // 更早
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

// 获取好友列表（用于创建群聊，改为从 WebSocket 接收）
const fetchFriends = async () => {
  // ✅ 不再主动请求，等待 WebSocket 广播 friendListUpdated
  console.log('⏳ [Home] 等待 WebSocket 推送好友列表...')
}

onMounted(() => {
  // ✅ 直接使用固定的群组列表
  groupChats.value = FIXED_GROUPS.map(group => {
    // 检查用户是否已加入
    const currentUserId = localStorage.getItem('userId')
    const isJoined = localStorage.getItem(`joined_${currentUserId}_${group.id}`) === '1'
    
    return {
      ...group,
      isJoined: isJoined
    }
  })
  
  console.log('✅ 固定群组列表已加载:', groupChats.value.length, '个')
  
  // ✅ 监听好友列表更新
  setupFriendListListener()
  
  fetchFriends()
  setupWebSocketListeners()
  
  // ✅ 注册 WebSocket 监听器（仅用于接龙群加入结果）
  setupChainGroupJoinListener()
})

onUnmounted(() => {
  // ⚠️ 不清理 Socket 监听器（保持全局监听）
  // WebSocket 事件应该持续监听，即使离开页面也能接收更新
  // 这样回到页面时数据仍然是最新的
  
  // ✅ 只清理接龙群加入结果的订阅
  if (unsubscribeChainGroupJoined) {
    unsubscribeChainGroupJoined()
  }
  
  console.log('✅ Home 页面卸载，但 Socket 监听保持')
})

// 打开聊天
const openChat = async (contact) => {
  const chatId = contact.id || contact._id || contact.userId
  
  if (!chatId) {
    showToast('聊天数据异常', 'error')
    return
  }
  
  // ✅ 优先判断：如果是私聊消息（type === 'private'），直接跳转私聊页面
  if (contact.type === 'private') {
    console.log('💬 [Home] 打开私聊:', chatId)
    router.push(`/chat/${chatId}`)
    return
  }
  
  // ✅ 额外判断：chatId 是纯数字也是私聊
  if (/^\d+$/.test(chatId)) {
    console.log('💬 [Home] 打开私聊（纯数字ID）:', chatId)
    router.push(`/chat/${chatId}`)
    return
  }
  
  // ✅ 特殊处理：六合天下群直接跳转到六合页面
  if (chatId === '69d4ac8de8e03b8ae3397bab') {
    router.push('/liuhe')
    return
  }
  
  // ✅ 检查是否是接龙群且缓存显示已加入
  const currentUserId = localStorage.getItem('userId')
  const cacheKey = `joined_${currentUserId}_${chatId}`
  const isJoined = localStorage.getItem(cacheKey) === '1'
  
  if (isJoined) {
    // 🔥 接龙群需要检查是否被踢出
    const socket = getSocket()
    console.log('🔍 Home - WebSocket 检查接龙群状态:', { groupId: chatId })
    
    socket.emit('chat:checkChainStatus', { groupId: chatId })
    
    try {
      const statusResponse = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('超时')), 3000)
        const handler = (data) => {
          clearTimeout(timeout)
          socket.off('chainStatusResponse', handler)
          resolve(data)
        }
        socket.once('chainStatusResponse', handler)
      })
      
      if (statusResponse?.status === 'kicked') {
        console.log('⚠️ 用户已被踢出，清除缓存')
        localStorage.removeItem(cacheKey)  // 清除缓存
        showToast(`您已被踢出群组\n累计领取: ${statusResponse.totalReceived}/${statusResponse.kickThreshold} USDT`, 'warning', 3000)
        router.push('/chain-groups')
        return
      }
      
      // 状态正常，直接进入
      console.log('✅ 已是成员，直接进入聊天页')
      router.push(`/chain-group/${chatId}`)
      return
    } catch (error) {
      console.error('检查状态失败，降级使用缓存:', error)
      // 超时或错误，直接使用缓存
      router.push(`/chain-group/${chatId}`)
      return
    }
  }
  
  // 不是成员，从固定配置读取信息，显示确认卡片
  const config = CHAIN_GROUP_CONFIG[chatId] || {
    name: contact.name,
    ticketAmount: 10,
    firstRedPacketAmount: 300,
    waitHours: 3,
    kickThreshold: 380
  }
  
  selectedChainGroup.value = {
    id: chatId,
    name: config.name,
    settings: {
      ticketAmount: config.ticketAmount,
      firstRedPacketAmount: config.firstRedPacketAmount,
      waitHours: config.waitHours,
      kickThreshold: config.kickThreshold
    }
  }
  showChainConfirmModal.value = true
}

// 导航
const navigate = (path) => {
  router.push(path)
}

// 🐉 显示接龙群确认弹窗
const showChainGroupConfirm = async (group) => {
  const groupId = group.id || group._id || group.userId
  console.log('🐉 点击群组:', group.name, groupId)
  
  if (!groupId) {
    showToast('群组数据异常，无法加载', 'error')
    return
  }
  
  // ✅ 特殊处理：六合天下群直接跳转到六合页面
    if (groupId === '1000001') {
      console.log('🎴 检测到六合天下群，跳转到六合页面')
      router.push('/liuhe')
      return
    }
  
    // ✅ 先通过 WebSocket 检查用户状态
    const currentUserId = localStorage.getItem('userId')
    const socket = getSocket()
    
    console.log('🔍 Home(群组卡片) - WebSocket 检查用户状态:', { groupId, userId: currentUserId })
    
    socket.emit('chat:checkChainStatus', {
      groupId: groupId
    })
    
    try {
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
      
      console.log('✅ Home(群组卡片) - 用户状态响应:', statusResponse)
      
      if (statusResponse && statusResponse.status === 'kicked') {
        console.log('⚠️ Home(群组卡片) - 用户已被踢出')
        showToast(
          `⚠️ 您已被踢出群组\n\n` +
          `累计领取: ${statusResponse.totalReceived} / ${statusResponse.kickThreshold} USDT\n\n` +
          `请前往“我的群组”重新缴费进群`
        )
        router.push('/chain-groups')
        return
      }
      
      const cacheKey = `joined_${currentUserId}_${groupId}`
      const isJoined = localStorage.getItem(cacheKey) === '1'
      
      if (isJoined && statusResponse.status === 'normal') {
        console.log('✅ 已是成员（状态正常），直接进入聊天页')
        router.push(`/chain-group/${groupId}`)
        return
      }
    } catch (error) {
      console.error('❌ Home(群组卡片) - 检查状态失败:', error)
      const cacheKey = `joined_${currentUserId}_${groupId}`
      const isJoined = localStorage.getItem(cacheKey) === '1'
      
      if (isJoined) {
        console.log('✅ 已是成员（缓存=1，降级），直接进入聊天页')
        router.push(`/chain-group/${groupId}`)
        return
      }
    }
  
    // 不是成员，从固定配置读取信息，显示确认卡片
    const config = CHAIN_GROUP_CONFIG[groupId] || {
      name: group.name,
      ticketAmount: 10,
      firstRedPacketAmount: 300,
      waitHours: 3,
      kickThreshold: 380
    }
  
    selectedChainGroup.value = {
      id: groupId,
      name: config.name,
      settings: {
        ticketAmount: config.ticketAmount,
        firstRedPacketAmount: config.firstRedPacketAmount,
        waitHours: config.waitHours,
        kickThreshold: config.kickThreshold
      }
    }
  
    showChainConfirmModal.value = true
}

// 🐉 确认加入接龙群
const confirmJoinChainGroup = async () => {
  if (!selectedChainGroup.value || !selectedChainGroup.value.id) return
  
  joiningChain.value = true
  const groupId = selectedChainGroup.value.id
  const groupName = selectedChainGroup.value.name
  const groupSettings = selectedChainGroup.value.settings
  
  try {
    // 先关闭确认弹窗
    showChainConfirmModal.value = false
    // ❌ 不要立即清空 selectedChainGroup，等显示成功卡片后再清空
    // selectedChainGroup.value = null
    
    // ✅ 打印当前用户 ID
    const currentUserId = localStorage.getItem('userId')
    console.log('👤 当前用户 ID:', currentUserId)
    
    // ✅ 检查 Socket 连接状态
    const socket = getSocket()
    if (!socket || !socket.connected) {
      console.error('❌ Socket 未连接')
      showToast('❌ 网络连接失败，请刷新页面后重试', 'error')
      joiningChain.value = false
      return
    }
    
    // ✅ 使用 WebSocket 方式加入接龙群
    console.log('🚀 正在通过 WebSocket 加入接龙群:', groupId)
    joinChainGroupViaSocket(groupId, true, (error) => {
      // 处理错误回调
      console.log('❌ 加入接龙群错误回调:', error)
      joiningChain.value = false
      
      const errorMsg = error.msg || error.message || '加入失败'
      
      if (errorMsg.includes('balance') || errorMsg.includes('余额')) {
        showToast('❌ 余额不足\n\n进群需要支付 310 USDT（门票10 + 首包300）\n请先到钱包充值后再试', 'error', 4000)
      } else if (errorMsg.includes('member') || errorMsg.includes('Already')) {
        console.log('✅ 检测到已是成员，直接进入聊天页')
        // ✅ 更新缓存
        const currentUserId = localStorage.getItem('userId')
        localStorage.setItem(`joined_${currentUserId}_${groupId}`, '1')
        // 如果已经是成员，直接进入接龙群聊天
        router.push(`/chain-group/${groupId}`)
      } else {
        showToast('❌ 加入失败\n\n' + errorMsg, 'error', 3000)
      }
    })
    
    // ⚠️ 注意：成功结果通过 onChainGroupJoined 回调处理
    // 这里不需要等待响应，只需设置 loading 状态
    
  } catch (error) {
    console.error('加入接龙群失败:', error)
    joiningChain.value = false
    
    // 提取后端返回的错误信息
    let errorMsg = '加入失败'
    if (error.response?.data?.msg) {
      errorMsg = error.response.data.msg
    } else if (error.response?.data?.message) {
      errorMsg = error.response.data.message
    } else if (error.message) {
      errorMsg = error.message
    }
    
    // 显示友好的错误提示
    if (errorMsg.includes('balance') || errorMsg.includes('余额')) {
      showToast('❌ 余额不足\n\n进群需要支付 310 USDT（门票10 + 首包300）\n请先到钱包充值后再试', 'error', 4000)
    } else if (errorMsg.includes('member') || errorMsg.includes('Already')) {
      console.log('✅ 检测到已是成员，直接进入聊天页')
      // ✅ 更新缓存
      const currentUserId = localStorage.getItem('userId')
      localStorage.setItem(`joined_${currentUserId}_${groupId}`, '1')
      // 如果已经是成员，直接进入接龙群聊天
      router.push(`/chain-group/${groupId}`) // 🐉 接龙群独立路由
      return
    } else {
      showToast('❌ 加入失败\n\n' + errorMsg, 'error', 3000)
    }
  }
}

// ✅ 处理进群成功卡片 OK 按钮
const handleJoinSuccessOk = () => {
  showJoinSuccessModal.value = false
  
  // 关闭卡片后跳转到群聊页面
  if (selectedChainGroup.value) {
    const groupId = selectedChainGroup.value.id
    console.log('✅ 用户确认，跳转到群聊页面:', groupId)
    
    // ✅ 清空 selectedChainGroup
    selectedChainGroup.value = null
    
    router.push(`/chain-group/${groupId}`)
  }
}

// 显示创建群聊弹窗
const showCreateGroupModal = () => {
  groupName.value = ''
  selectedFriends.value = []
  showModal.value = true
}

// 切换好友选择
const toggleFriendSelection = (friendId) => {
  const index = selectedFriends.value.indexOf(friendId)
  if (index > -1) {
    selectedFriends.value.splice(index, 1)
  } else {
    selectedFriends.value.push(friendId)
  }
}

// 创建群聊
const createGroup = async () => {
  if (!groupName.value.trim()) {
    showToast('请输入群聊名称', 'warning')
    return
  }
  
  if (selectedFriends.value.length < 2) {
    showToast('请至少选择2位好友', 'warning')
    return
  }
  
  try {
    const response = await chatAPI.createGroup({
      name: groupName.value,
      memberIds: selectedFriends.value
    })
    
    // 关闭弹窗
    showModal.value = false
    
    // 提示用户
    showToast(`群聊 "${groupName.value}" 创建成功！`, 'success')
    
    // 刷新聊天列表
    fetchChats()
    
    // 可以选择跳转到群聊
    // router.push(`/chat/${response.id}`)
  } catch (error) {
    console.error('创建群聊失败:', error)
    showToast('创建群聊失败，请稍后重试', 'error')
  }
}
</script>

<style scoped>
.home-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 内容区域 */
.content {
  flex: 1;
  overflow-y: auto;
  /* ✅ 防止底部被遮挡（虽然 Home 没有底部导航，但保持统一） */
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
}

/* 搜索框 */
.search-section {
  padding: 10px 20px 15px;
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
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fafafa;
  font-size: 15px;
  color: #6b7280;
  text-align: center;
  outline: none;
  transition: all 0.2s;
}

.search-input:focus {
  border-color: #667eea;
  background: #ffffff;
}

.add-group-btn {
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

.add-group-btn:hover {
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  transform: translateY(-1px);
}

.add-group-btn:active {
  transform: scale(0.96);
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

/* 消息列表 */
.contacts-container {
  padding: 0;
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contact-preview {
  font-size: 0.8rem;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contact-time {
  font-size: 0.7rem;
  color: #999;
}

/* 底部导航 */
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

.create-group-content {
  padding: 10px 0;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
}

.friends-list {
  max-height: 300px;
  overflow-y: auto;
}

.friend-item {
  display: flex;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.friend-item:hover {
  background: #f8f9fa;
}

.friend-item.selected {
  background: #e3f2fd;
}

.friend-info {
  flex: 1;
  margin-left: 15px;
}

.friend-name {
  font-weight: 500;
}

.friend-id {
  font-size: 0.8rem;
  color: #666;
}

.friend-checkbox {
  width: 24px;
  height: 24px;
  border: 2px solid #e0e0e0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
}

.friend-checkbox.checked {
  background: #667eea;
  border-color: #667eea;
  color: white;
}

.selected-count {
  text-align: center;
  margin-bottom: 20px;
  color: #666;
}

.create-group-btn {
  width: 100%;
  padding: 15px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  cursor: pointer;
}

.create-group-btn:hover {
  background: #5a6fd8;
}

.create-group-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* 🐉 接龙群确认弹窗样式 */
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
  max-width: 90%;
  width: 400px;
  max-height: 80vh;
  overflow-y: auto;
}

.chain-confirm-modal .modal-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chain-confirm-modal .modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #999;
}

.chain-confirm-modal .modal-body {
  padding: 20px;
}

.group-summary {
  text-align: center;
  margin-bottom: 20px;
}

.group-name-large {
  font-size: 1.3rem;
  font-weight: 700;
  color: #333;
}

.fee-breakdown {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.fee-breakdown h4 {
  margin: 0 0 12px 0;
  font-size: 1rem;
  color: #333;
}

.fee-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 0.95rem;
}

.fee-label {
  color: #666;
}

.fee-value {
  font-weight: 600;
  color: #333;
}

.fee-divider {
  height: 1px;
  background: #e0e0e0;
  margin: 8px 0;
}

.fee-item.total {
  font-size: 1.1rem;
}

.fee-item.total .fee-value.highlight {
  color: #ff4757;
  font-size: 1.3rem;
}

.rules-info {
  margin-bottom: 20px;
}

.rules-info h4 {
  margin: 0 0 12px 0;
  font-size: 1rem;
  color: #333;
}

.rule-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 0.9rem;
  color: #666;
}

.warning-box {
  background: #fff3cd;
  border: 1px solid #f39c12;
  border-radius: 8px;
  padding: 12px;
  font-size: 0.9rem;
  color: #856404;
}

.warning-box ul {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.warning-box li {
  margin: 4px 0;
}

.chain-confirm-modal .modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  gap: 12px;
}

/* 🐉 接龙群确认卡片 - 底部弹出样式 */
.chain-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.chain-modal-content {
  background: white;
  border-radius: 24px 24px 0 0;
  max-width: 100%;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease-out;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.15);
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.chain-modal-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
}

.chain-modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #333;
  font-weight: 600;
}

.chain-close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #999;
  padding: 4px;
  line-height: 1;
}

.chain-close-btn:active {
  color: #666;
}

.chain-modal-body {
  padding: 20px;
}

.btn-cancel, .btn-confirm {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-cancel {
  background: #f5f5f5;
  color: #666;
}

.btn-cancel:hover {
  background: #e0e0e0;
}

.btn-confirm {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
