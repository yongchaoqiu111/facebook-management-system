import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 全局好友请求 Store
 * 所有页面共享好友请求数据
 */
export const useFriendStore = defineStore('friend', () => {
  // 好友请求列表
  const friendRequests = ref([])
  
  // 添加好友请求
  const addFriendRequest = (request) => {
    // 检查是否已存在
    const exists = friendRequests.value.some(req => req.id === request.id)
    if (!exists) {
      friendRequests.value.unshift(request)
      console.log('✅ [FriendStore] 添加好友请求:', request.name)
    }
  }
  
  // 移除好友请求（已同意或拒绝）
  const removeFriendRequest = (requestId) => {
    friendRequests.value = friendRequests.value.filter(req => req.id !== requestId)
    console.log('✅ [FriendStore] 移除好友请求:', requestId)
  }
  
  // 清空好友请求
  const clearFriendRequests = () => {
    friendRequests.value = []
  }
  
  return {
    friendRequests,
    addFriendRequest,
    removeFriendRequest,
    clearFriendRequests
  }
})
