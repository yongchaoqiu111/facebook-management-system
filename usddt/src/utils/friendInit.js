/**
 * 好友数据初始化
 * 优先从 localStorage 读取 ID 数组，然后批量获取详情
 */

import { useFriendStore } from '@/stores/friendStore'
import { getFriendIds as getFriendIdsFromCache } from './cache'
import axios from 'axios'

/**
 * 初始化好友数据
 * @param {boolean} forceRefresh - 是否强制刷新（忽略缓存）
 */
export async function initFriends(forceRefresh = false) {
  const friendStore = useFriendStore()
  
  try {
    // 1. 从缓存或 API 获取好友ID数组
    const friendIds = await getFriendIdsFromCache(async () => {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/friends', {
        headers: { Authorization: `Bearer ${token}` }
      })
      return response.data.data || response.data
    })
    
    console.log('👥 [initFriends] 好友ID数组:', friendIds)
    
    // 2. 更新 Store
    if (forceRefresh) {
      friendStore.setFriendIds(friendIds)
    } else if (friendStore.friendIds.length === 0) {
      // 只在 Store 为空时设置
      friendStore.setFriendIds(friendIds)
    }
    
    // 3. 批量获取缺失的好友详情
    if (friendIds.length > 0) {
      await friendStore.fetchFriendDetails(friendIds, async (missingIds) => {
        const token = localStorage.getItem('token')
        
        // 逐个获取详情（因为后端没有批量接口）
        const details = []
        for (const userId of missingIds) {
          try {
            const response = await axios.get(`/api/users/${userId}`, {
              headers: { Authorization: `Bearer ${token}` }
            })
            if (response.data.data) {
              details.push(response.data.data)
            }
          } catch (err) {
            console.warn(`⚠️ 获取用户 ${userId} 详情失败:`, err.message)
          }
        }
        
        return details
      })
    }
    
    console.log('✅ [initFriends] 好友数据初始化完成')
    return friendIds
  } catch (err) {
    console.error('❌ [initFriends] 初始化失败:', err)
    return []
  }
}

/**
 * 刷新好友列表
 */
export async function refreshFriends() {
  return initFriends(true)
}
