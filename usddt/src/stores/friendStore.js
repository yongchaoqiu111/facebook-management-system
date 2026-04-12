import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 全局好友 Store
 * 管理：好友ID数组、好友详情缓存、在线状态
 */
export const useFriendStore = defineStore('friend', () => {
  // 🆕 好友ID数组（从 localStorage 初始化）
  const friendIds = ref(() => {
    const cached = localStorage.getItem('friendIds')
    return cached ? JSON.parse(cached) : []
  })
  
  // 🆕 好友请求列表
  const friendRequests = ref([])
  
  // 🆕 添加好友请求
  const addFriendRequest = (request) => {
    // 检查是否已存在
    const exists = friendRequests.value.some(r => r.id === request.id)
    if (!exists) {
      friendRequests.value.unshift(request)  // 添加到开头
      console.log('✅ [FriendStore] 添加好友请求:', request.name)
    }
  }
  
  // 🆕 移除好友请求
  const removeFriendRequest = (requestId) => {
    friendRequests.value = friendRequests.value.filter(r => r.id !== requestId)
    console.log('✅ [FriendStore] 移除好友请求:', requestId)
  }
  
  // 好友详情缓存 { userId: { username, avatar, ... } }
  const friendDetails = ref({})
  
  // 在线状态 { userId: boolean }
  const onlineStatus = ref({})
  
  // 设置好友ID数组
  const setFriendIds = (ids) => {
    friendIds.value = Array.isArray(ids) ? ids : []
    localStorage.setItem('friendIds', JSON.stringify(friendIds.value))
    console.log('✅ [FriendStore] 设置好友ID数组:', friendIds.value.length, '人')
  }
  
  // 添加好友ID
  const addFriendId = (userId) => {
    if (!friendIds.value.includes(userId)) {
      friendIds.value.push(userId)
      localStorage.setItem('friendIds', JSON.stringify(friendIds.value))
      console.log('✅ [FriendStore] 添加好友ID:', userId)
    }
  }
  
  // 移除好友ID
  const removeFriendId = (userId) => {
    friendIds.value = friendIds.value.filter(id => id !== userId)
    localStorage.setItem('friendIds', JSON.stringify(friendIds.value))
    // 同时清除详情缓存
    delete friendDetails.value[userId]
    console.log('✅ [FriendStore] 移除好友ID:', userId)
  }
  
  // 更新好友详情
  const updateFriendDetail = (userId, detail) => {
    friendDetails.value[userId] = { ...friendDetails.value[userId], ...detail }
  }
  
  // 获取好友详情（优先从缓存）
  const getFriendDetail = (userId) => {
    return friendDetails.value[userId] || null
  }
  
  // 🆕 批量获取好友详情（如果缓存中没有）
  const fetchFriendDetails = async (userIds, apiFetch) => {
    const missingIds = userIds.filter(id => !friendDetails.value[id])
    
    if (missingIds.length === 0) {
      console.log('✅ [FriendStore] 所有好友详情已在缓存中')
      return
    }
    
    if (!apiFetch) {
      console.warn('⚠️ [FriendStore] 未提供 API 函数，无法获取缺失的好友详情')
      return
    }
    
    try {
      console.log('🌐 [FriendStore] 获取缺失的好友详情:', missingIds)
      const details = await apiFetch(missingIds)
      
      // 更新缓存
      details.forEach(detail => {
        if (detail.userId) {
          friendDetails.value[detail.userId] = {
            username: detail.username,
            avatar: detail.avatar || '👤',
            ...detail
          }
        }
      })
      
      console.log('✅ [FriendStore] 已缓存', details.length, '个好友详情')
    } catch (err) {
      console.error('❌ [FriendStore] 获取好友详情失败:', err)
    }
  }
  
  // 更新好友在线状态
  const updateOnlineStatus = (userId, isOnline) => {
    onlineStatus.value[userId] = isOnline
  }
  
  // 计算属性：好友数量
  const friendCount = computed(() => friendIds.value.length)
  
  // 计算属性：在线好友数量
  const onlineFriendCount = computed(() => {
    return friendIds.value.filter(id => onlineStatus.value[id]).length
  })
  
  return {
    friendIds,
    friendRequests,  // 🆕 好友请求
    friendDetails,
    onlineStatus,
    setFriendIds,
    addFriendId,
    removeFriendId,
    addFriendRequest,  // 🆕 添加好友请求
    removeFriendRequest,  // 🆕 移除好友请求
    updateFriendDetail,
    getFriendDetail,
    fetchFriendDetails,
    updateOnlineStatus,
    friendCount,
    onlineFriendCount
  }
})
