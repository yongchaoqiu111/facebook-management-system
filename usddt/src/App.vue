<template>
  <div class="app">
    <!-- 全局 Loading 遮罩 -->
    <LoadingOverlay :visible="loadingVisible" :message="loadingMessage" />
    
    <!-- ✅ 全局 Toast -->
    <Toast ref="globalToast" />
    
    <!-- ✅ 全局 Header（仅在有路由时显示） -->
    <AppHeader v-if="showHeader" :title="headerTitle">
      <template #left>
        <slot name="header-left"></slot>
      </template>
      <template #right>
        <slot name="header-right"></slot>
      </template>
    </AppHeader>
    
    <!-- 路由视图 -->
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
    
    <!-- ✅ 全局 BottomNav（仅在有路由时显示） -->
    <BottomNav v-if="showBottomNav" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { initSocket, getSocket, joinGroup, onFriendAdded, onFriendRemoved, onFriendListUpdated } from './socket'
import { parseMessage } from './utils/chatStorage'
import { queueMessage, queueTrade, flushAllQueues, clearAllQueues } from './utils/wsQueue'  // 🆕 导入队列管理器
import { triggerMessageUpdate } from './utils/messageBus'
import { useMessageCenter } from './composables/useMessageCenter'
import { useFriendStore } from './stores/friendStore'
import { useChatStore } from './stores/chatStore'
import { useUserStore } from './stores/userStore'
import { useChatMessageStore } from './stores/chatMessageStore'  // 🆕 导入消息 Store
import axios from 'axios'
import { chatAPI } from './api'
import LoadingOverlay from './components/LoadingOverlay.vue'
import Toast from './components/Toast.vue'
import AppHeader from './components/AppHeader.vue'
import BottomNav from './components/BottomNav.vue'
import { useLoading } from './composables/useLoading'
import { setToastRef, showToast } from './utils/toast'

// ✅ 初始化全局 Stores
const friendStore = useFriendStore()
const chatStore = useChatStore()
const userStore = useUserStore()
const chatMessageStore = useChatMessageStore()  // 🆕 消息 Store

// ✅ 获取 router 实例
const router = useRouter()
const route = useRoute()

// ✅ 控制导航显示（登录/注册页不显示）
const showHeader = computed(() => {
  return !['/login', '/register'].includes(route.path)
})

const showBottomNav = computed(() => {
  return !['/login', '/register'].includes(route.path)
})

const headerTitle = computed(() => {
  const titles = {
    '/home': '消息',
    '/contacts': '联系人',
    '/wallet': '钱包',
    '/market': '行情',
    '/profile': '我的'
  }
  return titles[route.path] || ''
})

// ✅ 全局 Toast 引用
const globalToast = ref(null)

// ✅ 初始化全局 Toast
onMounted(() => {
  if (globalToast.value) {
    setToastRef(globalToast.value)
    console.log('✅ 全局 Toast 已初始化')
  }
})

// 所有已加入的群组 ID 列表
const joinedGroupIds = new Set()

// ✅ 全局 Loading 状态
const { loadingVisible, loadingMessage } = useLoading()

// ✅ 全局 currentUserId（从 localStorage 获取）
const getCurrentUserId = () => {
  return localStorage.getItem('userId')
}

let groupMessageHandler = null
let groupRedPacketHandler = null
let newLiuheRedPacketHandler = null
let privateMessageHandler = null
let privateRedPacketHandler = null
let redPacketSentHandler = null


onMounted(async () => {
  console.log('🚀 App 挂载')
  
  // ✅ 每隔 1 秒检查一次 socket 是否连接成功
  // 新用户注册跳转后会自动触发
  const checkSocketTimer = setInterval(() => {
    const socket = getSocket()
    if (socket && socket.connected) {
      console.log('✅ [App] Socket 已连接，注册监听器...')
      registerGlobalListeners()
      clearInterval(checkSocketTimer)
    }
  }, 1000)
  
  // 页面卸载清除定时器
  onUnmounted(() => {
    clearInterval(checkSocketTimer)
    console.log('🧹 [App] 清除 Socket 检查定时器')
  })
})

// ✅ 定义全局监听器注册函数
const registerGlobalListeners = () => {
  const socket = getSocket()
  if (!socket) {
    console.warn('⚠️ [App] Socket 未初始化，跳过监听器注册')
    return
  }
  
  console.log('🔌 [App] 注册全局 Socket 监听器...')
  
  // 🔍 调试：监听所有 friend 相关事件
    socket.onAny((eventName, ...args) => {
      if (eventName.includes('friend') || eventName.includes('Friend')) {
        console.log(`🔍 [App] 捕获到好友相关事件: ${eventName}`)
        console.log('🔍 [App] 数据:', JSON.stringify(args, null, 2))
      }
    })
  
  // ✅ 不再主动请求，等待 WebSocket 广播 groupListUpdated
  console.log('⏳ [App] 等待 WebSocket 推送群组列表...')
  
  // ✅ 全局监听群聊消息（所有群组）- 写入 Store + 队列
  groupMessageHandler = (data) => {
    console.log('🌐 [全局监听] 收到群聊消息')
    
    const currentUserId = getCurrentUserId()
    
    // 解析消息
    const message = parseMessage(data, currentUserId)
    
    // 自动加入该群组房间（如果还没加入）
    if (!joinedGroupIds.has(message.groupId)) {
      joinGroup(message.groupId)
      joinedGroupIds.add(message.groupId)
    }
    
    // 1️⃣ 立即更新 Store（实时显示）
    chatMessageStore.addMessage(message.chatId, message)
    
    // 2️⃣ 加入队列，异步保存到 IndexedDB
    queueMessage(message)
  }
  socket.on('groupMessage', groupMessageHandler)
  
  // ✅ 全局监听群红包（所有群组）- 写入 Store
  groupRedPacketHandler = async (data) => {
    console.log('🌐 [全局监听] 收到群红包')
    
    // ✅ 获取 currentUserId
    const currentUserId = await getCurrentUserId()
    
    if (!currentUserId) {
      console.error('❌ 无法获取 currentUserId，跳过消息处理')
      return
    }
    
    // 解析消息
    const message = parseMessage(data, currentUserId)
    
    // 自动加入该群组房间
    if (!joinedGroupIds.has(message.groupId)) {
      joinGroup(message.groupId)
      joinedGroupIds.add(message.groupId)
    }
    
    // ✅ 写入 Store
    chatStore.addGroupMessage(message.groupId, message)
    
    // ✅ 如果是红包，额外保存红包记录
    if (message.msgType === 2 && message.content?.redPacketId) {
      chatStore.addRedPacket({
        _id: message.content.redPacketId,
        ...message.content
      })
    }
  }
  socket.on('groupRedPacket', groupRedPacketHandler)
  
  // ✅ 全局监听好友列表更新 - 写入 Store 和 localStorage
  socket.on('friendListUpdated', (data) => {
    console.log('👥 [全局监听] 收到好友列表更新')
    
    // 兼容两种格式：直接数组 或 { friendIds: [...] }
    const friendIds = Array.isArray(data) ? data : (data.friendIds || data.friends || [])
    
    if (Array.isArray(friendIds)) {
      friendStore.setFriendIds(friendIds)
      console.log('✅ [App] 好友ID数组已更新:', friendIds)
    }
  })
  
  // 🆕 监听单个好友添加
  onFriendAdded((data) => {
    console.log('➕ [全局监听] 好友添加:', data)
    
    // 兼容格式：{ userId: '10000003' } 或直接是 userId
    const friendId = data.userId || data.friendId || data
    
    if (friendId) {
      friendStore.addFriendId(String(friendId))
      showToast('好友添加成功', 'success')
    }
  })
  
  // 🆕 监听单个好友移除
  onFriendRemoved((data) => {
    console.log('➖ [全局监听] 好友移除:', data)
    
    // 兼容格式：{ userId: '10000003' } 或直接是 userId
    const friendId = data.userId || data.friendId || data
    
    if (friendId) {
      friendStore.removeFriendId(String(friendId))
      showToast('好友已删除', 'info')
    }
  })
  
  // ✅ 全局监听好友请求 - 写入 Store
  socket.on('friendRequestReceived', (data) => {
    console.log('📨 [全局监听] 收到好友请求')
    
    const newRequest = {
      id: data._id || data.id,
      name: data.fromUser?.username || data.sender?.username || '有人',
      avatar: data.fromUser?.avatar || data.sender?.avatar || '👤',
      message: data.message || '请求添加你为好友'
    }
    friendStore.addFriendRequest(newRequest)
    
    // 显示浏览器通知
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('新的好友请求', {
        body: newRequest.name,
        icon: '/favicon.ico'
      })
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('新的好友请求', {
            body: newRequest.name,
            icon: '/favicon.ico'
          })
        }
      })
    }
    
    // 显示 Toast 提示
    if (globalToast.value) {
      globalToast.value.info(`${newRequest.name} 请求添加你为好友`)
    }
  })
  
  socket.on('friendRequestSent', (data) => {
    console.log('✅ [全局监听] 好友请求已发送:', data)
  })
  
  socket.on('friendRequestAccepted', (data) => {
    console.log('✅ [全局监听] 好友请求被接受:', data)
  })
  
  socket.on('friendRequestRejected', (data) => {
    console.log('❌ [全局监听] 好友请求被拒绝:', data)
  })
  
  // ✅ 全局监听用户在线状态 - 写入 Store
  socket.on('userStatusChanged', (data) => {
    console.log('🟢 [全局监听] 用户状态变化')
    
    if (data.userId && data.isOnline !== undefined) {
      friendStore.updateOnlineStatus(data.userId, data.isOnline)
    }
  })
  
  // ✅ 全局监听新六合红包（专用事件）
  newLiuheRedPacketHandler = (data) => {
    console.log('🌐 [全局监听] 收到新六合红包')
    console.log('📦 WSS 原始数据:', JSON.stringify(data, null, 2))
    
    const currentUserId = getCurrentUserId()
    console.log('👤 currentUserId:', currentUserId)
    
    // 兼容两种数据格式：直接红包对象 或 { success, data, message }
    const redPacketData = data.success && data.data ? data.data : data
    console.log('📊 解析后的红包数据:', JSON.stringify(redPacketData, null, 2))
    
    // 构建红包消息
    const now = new Date()
    const time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0')
    
    // ✅ 修复：兼容多种数据结构获取发送者ID
    // ✅ 关键：优先取业务用户 ID（userId），而不是 MongoDB 的 _id
    let senderId = null
    
    if (redPacketData.banker) {
      if (typeof redPacketData.banker === 'object') {
        senderId = redPacketData.banker.userId || redPacketData.banker._id
      } else {
        senderId = redPacketData.banker
      }
    }
    
    if (!senderId && redPacketData.senderId) {
      senderId = redPacketData.senderId
    }
    
    if (!senderId && redPacketData.sender) {
      if (typeof redPacketData.sender === 'object') {
        senderId = redPacketData.sender.userId || redPacketData.sender._id
      } else {
        senderId = redPacketData.sender
      }
    }
    
    console.log('🔍 发送者ID提取过程:')
    console.log('  - redPacketData.banker:', redPacketData.banker)
    console.log('  - redPacketData.banker?._id:', redPacketData.banker?._id)
    console.log('  - redPacketData.banker?.userId:', redPacketData.banker?.userId)
    console.log('  - redPacketData.banker (直接值):', redPacketData.banker)
    console.log('  - redPacketData.senderId:', redPacketData.senderId)
    console.log('  - redPacketData.sender:', redPacketData.sender)
    console.log('  - ✅ 最终 senderId:', senderId)
    console.log('  - ✅ currentUserId:', currentUserId)
    console.log('  - ✅ 类型比较 (String(senderId) === String(currentUserId)):', String(senderId) === String(currentUserId))
    
    // ✅ 关键：统一转换为字符串比较（避免类型不匹配）
    const isSelf = String(senderId) === String(currentUserId)
    const direction = isSelf ? 0 : 1  // ✅ 0=自己（右），1=别人（左）
    
    console.log('🎯 方向判断结果:')
    console.log('  - isSelf:', isSelf)
    console.log('  - direction:', direction, direction === 0 ? '(0=自己右侧)' : '(1=别人左侧)')
    
    const message = {
      id: redPacketData._id || `rp_${Date.now()}`,
      type: 'redPacket',
      chatId: redPacketData.groupId,
      direction: direction,  // ✅ 0=自己，1=别人
      redPacketType: 'liuhe',
      amount: redPacketData.prizePool || 0,
      count: 1,
      message: '恭喜发财，大吉大利',
      time: time,
      timestamp: redPacketData.createdAt || new Date().toISOString(),
      opened: false,
      redPacketId: redPacketData._id,
      senderId: senderId,
      groupId: redPacketData.groupId,
      isSelf: isSelf,
      status: redPacketData.status || 'active'
    }
    
    console.log('✅ 最终构建的消息对象:', JSON.stringify(message, null, 2))
    
    // 自动加入该群组房间
    if (!joinedGroupIds.has(message.groupId)) {
      joinGroup(message.groupId)
      joinedGroupIds.add(message.groupId)
      console.log(`✅ 自动加入群组: ${message.groupId}`)
    }
    
    // 添加到对应群组的队列
    addToQueue(message)
  }
  socket.on('newLiuheRedPacket', newLiuheRedPacketHandler)
  
  // ✅ 全局监听私聊消息（所有私聊）
  privateMessageHandler = async (data) => {
    console.log('🌐 [全局监听] 收到私聊消息')
    console.log('📦 WSS 原始数据:', JSON.stringify(data, null, 2))
    
    const currentUserId = getCurrentUserId()
    console.log('👤 currentUserId:', currentUserId)
    
    if (!currentUserId) {
      console.error('❌ 无法获取 currentUserId，跳过消息处理')
      return
    }
    
    // 兼容处理：如果 data 是数组，取第一个元素
    const msgData = Array.isArray(data) ? data[0] : data
    if (!msgData) return

    console.log('🔍 [调试] msgData.sender:', msgData.sender)
    console.log('🔍 [调试] msgData.receiver:', msgData.receiver)

    // ✅ 统一使用 useMessageCenter 的 handleIncomingMessage 处理
    const messageCenter = useMessageCenter()
    console.log('🚀 [调试] 调用 handleIncomingMessage')
    messageCenter.handleIncomingMessage('private', msgData)
    console.log('✅ [调试] handleIncomingMessage 完成')
  }
  socket.on('privateMessage', privateMessageHandler)
  
  // ✅ 全局监听私聊红包（接收方收到）
  privateRedPacketHandler = async (data) => {
    console.log('🌐 [全局监听] 收到私聊红包')
    console.log('📦 WSS 原始数据:', JSON.stringify(data, null, 2))
    
    const currentUserId = getCurrentUserId()
    console.log('👤 currentUserId:', currentUserId)
    
    if (!currentUserId) {
      console.error('❌ 无法获取 currentUserId，跳过消息处理')
      return
    }
    
    // 兼容处理：如果 data 是数组，取第一个元素
    const msgData = Array.isArray(data) ? data[0] : data
    if (!msgData) return

    console.log('🔍 [调试] msgData.redPacketId:', msgData.redPacketId)
    console.log('🔍 [调试] msgData._id:', msgData._id)
    console.log('🔍 [调试] msgData.id:', msgData.id)
    console.log('🔍 [调试] msgData.sender:', msgData.sender)
    console.log('🔍 [调试] msgData.receiver:', msgData.receiver)

    // ✅ 把 groupId 改成 receiverId，复用接龙群的逻辑
    if (!msgData.receiverId && msgData.sender?.userId) {
      msgData.receiverId = currentUserId
    }

    // ✅ 统一使用 useMessageCenter 的 handleIncomingMessage 处理
    const messageCenter = useMessageCenter()
    messageCenter.handleIncomingMessage('privateRedPacket', msgData)
  }
  socket.on('receiveRedPacket', privateRedPacketHandler)
  
  // ✅ 全局监听私聊红包发送成功（发送方收到）
  redPacketSentHandler = async (data) => {
    console.log('🌐 [全局监听] 私聊红包发送成功')
    console.log('📦 WSS 原始数据:', JSON.stringify(data, null, 2))
    
    const currentUserId = getCurrentUserId()
    console.log('👤 currentUserId:', currentUserId)
    
    if (!currentUserId) {
      console.error('❌ 无法获取 currentUserId，跳过消息处理')
      return
    }
    
    // 兼容处理：如果 data 是数组，取第一个元素
    const msgData = Array.isArray(data) ? data[0] : data
    if (!msgData) return

    // ✅ 把 groupId 改成 receiverId，复用接龙群的逻辑
    if (!msgData.receiverId && msgData.sender?.userId) {
      msgData.receiverId = currentUserId
    }
    
    // ✅ 添加 sender 信息（后端 redPacketSent 事件没有返回 sender）
    if (!msgData.sender) {
      msgData.sender = {
        userId: currentUserId,
        username: localStorage.getItem('username') || '我',
        avatar: localStorage.getItem('avatar') || '😊'
      }
    }
    
    // ✅ 添加 senderId
    if (!msgData.senderId) {
      msgData.senderId = currentUserId
    }

    // ✅ 统一使用 useMessageCenter 的 handleIncomingMessage 处理
    const messageCenter = useMessageCenter()
    messageCenter.handleIncomingMessage('privateRedPacket', msgData)
  }
  socket.on('redPacketSent', redPacketSentHandler)
  
  console.log('✅ 全局 Socket 监听器已注册')
}

onUnmounted(() => {
  // 🔄 强制刷新所有队列，确保数据保存
  flushAllQueues()
  
  // 移除 Socket 监听器
  if (groupMessageHandler) {
    const socket = getSocket()
    socket.off('groupMessage', groupMessageHandler)
  }
  if (groupRedPacketHandler) {
    const socket = getSocket()
    socket.off('groupRedPacket', groupRedPacketHandler)
  }
  if (newLiuheRedPacketHandler) {
    const socket = getSocket()
    socket.off('newLiuheRedPacket', newLiuheRedPacketHandler)
  }
  if (privateMessageHandler) {
    const socket = getSocket()
    socket.off('privateMessage', privateMessageHandler)
  }
  if (privateRedPacketHandler) {
    const socket = getSocket()
    socket.off('receiveRedPacket', privateRedPacketHandler)
  }
  if (redPacketSentHandler) {
    const socket = getSocket()
    socket.off('redPacketSent', redPacketSentHandler)
  }
  
  // 停止消息队列并保存所有剩余消息
  stopMessageQueue()
  console.log('⚠️ App 卸载，消息队列已停止')
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  /* 防止双击缩放 */
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  /* 防止 iOS 缩放 */
  touch-action: manipulation;
  -webkit-text-size-adjust: 100%;
}

body {
  font-family: 'Noto Sans SC', sans-serif;
  background: #f5f7fa;
  height: 100vh;
  overflow: hidden;
}

.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 通用样式 */
button {
  cursor: pointer;
  border: none;
  outline: none;
}

input {
  border: none;
  outline: none;
}
</style>
