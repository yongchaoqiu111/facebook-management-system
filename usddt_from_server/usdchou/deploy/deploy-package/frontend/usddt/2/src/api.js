import axios from 'axios'

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// 接龙群API
export const chainGroupAPI = {
  // 获取接龙群详情
  getChainGroupDetail: async (groupId) => {
    try {
      const response = await api.get(`/chain-group/${groupId}`)
      console.log('群组信息:', response.data)
      return response.data
    } catch (error) {
      console.error('获取群组信息失败:', error)
      // 返回模拟数据用于测试
      return {
        id: groupId,
        name: '测试接龙群',
        kickThreshold: 380,
        members: [
          {
            userId: 'user_123',
            username: '测试用户',
            totalReceived: 50,
            joinedAt: '2024-01-01'
          },
          {
            userId: 'user_456',
            username: '其他用户',
            totalReceived: 100,
            joinedAt: '2024-01-02'
          }
        ]
      }
    }
  },
  
  // 领取红包
  openRedPacket: async (groupId, redPacketId) => {
    try {
      const response = await api.post(`/chain-group/${groupId}/red-packet/${redPacketId}/open`)
      return response.data
    } catch (error) {
      console.error('领取红包失败:', error)
      throw error
    }
  }
}import axios from 'axios'

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// 接龙群API
export const chainGroupAPI = {
  // 获取接龙群详情
  getChainGroupDetail: async (groupId) => {
    try {
      const response = await api.get(`/chain-group/${groupId}`)
      console.log('群组信息:', response.data)
      return response.data
    } catch (error) {
      console.error('获取群组信息失败:', error)
      // 返回模拟数据用于测试
      return {
        id: groupId,
        name: '测试接龙群',
        kickThreshold: 380,
        members: [
          {
            userId: 'user_123',
            username: '测试用户',
            totalReceived: 50,
            joinedAt: '2024-01-01'
          },
          {
            userId: 'user_456',
            username: '其他用户',
            totalReceived: 100,
            joinedAt: '2024-01-02'
          }
        ]
      }
    }
  },
  
  // 领取红包
  openRedPacket: async (groupId, redPacketId) => {
    try {
      const response = await api.post(`/chain-group/${groupId}/red-packet/${redPacketId}/open`)
      return response.data
    } catch (error) {
      console.error('领取红包失败:', error)
      throw error
    }
  }
}