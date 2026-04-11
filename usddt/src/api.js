import axios from 'axios'
import { showLoading, hideLoading } from './composables/useLoading'

// 创建axios实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  config => {
    // ✅ 显示 Loading（GET 请求不显示，POST/PUT/DELETE 显示）
    if (config.method !== 'get') {
      showLoading('处理中...')
    }
    
    // 从localStorage获取token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    hideLoading()
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  response => {
    // ✅ 隐藏 Loading
    hideLoading()
    
    // 后端返回格式: {success: true, data: {}, message: ""}
    if (response.data.success !== undefined) {
      return response.data.data
    }
    return response.data
  },
  error => {
    // ✅ 隐藏 Loading
    hideLoading()
    
    // 处理错误响应
    if (error.response) {
      // 服务器返回错误状态码
      const errorMsg = error.response.data.msg || error.response.data.message || '未知错误'
      console.error(`请求失败: ${errorMsg}`)
      
      switch (error.response.status) {
        case 401:
          // 未授权，清除token并跳转到登录页
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          localStorage.removeItem('userId')
          localStorage.removeItem('tokenExpiry')
          window.location.href = '/login'
          break
        case 403:
          console.error('没有权限访问该资源')
          break
        case 404:
          console.error('请求的资源不存在')
          break
        case 500:
          console.error('服务器内部错误')
          break
        default:
          console.error(`请求失败: ${errorMsg}`)
      }
    } else if (error.request) {
      // 请求已发出但没有收到响应
      console.error('网络错误，请检查网络连接')
    } else {
      // 请求配置出错
      console.error(`请求配置错误: ${error.message}`)
    }
    return Promise.reject(error)
  }
)

// 用户相关API
export const userAPI = {
  // 用户登录
  login: async (data) => {
    const response = await api.post('/auth/login', data)
    return response
  },
  
  // 用户注册
  register: async (data) => {
    const response = await api.post('/auth/register', data)
    return response
  },
  
  // 获取用户信息
  getUserInfo: async () => {
    const response = await api.get('/users/me')
    return response
  }
}

// 好友相关API
export const friendAPI = {
  // 获取好友列表
  getFriends: () => api.get('/friends'),
  
  // 搜索用户
  searchUsers: (keyword) => api.get(`/friends/search?keyword=${keyword}`),
  
  // 添加好友
  addFriend: (userId, message) => api.post('/friends', { userId, message }),
  
  // 删除好友
  deleteFriend: (friendId) => api.delete(`/friends/${friendId}`),
  
  // 获取好友请求
  getFriendRequests: () => api.get('/friends/requests'),
  
  // 接受好友请求
  acceptFriendRequest: (requestId) => api.put(`/friends/requests/${requestId}/accept`),
  
  // 拒绝好友请求
  rejectFriendRequest: (requestId) => api.put(`/friends/requests/${requestId}/reject`)
}

// 钱包相关API
export const walletAPI = {
  // 获取钱包信息（余额、充值地址）
  getWalletInfo: () => api.get('/wallet/info'),
  
  // 估算提现手续费
  estimateWithdrawFee: (amount) => api.get(`/wallet/withdraw-fee?amount=${amount}`),
  
  // 申请提现
  withdraw: (amount, walletAddress) => api.post('/wallet/withdraw', { amount, walletAddress }),
  
  // 获取交易记录
  getTransactions: (page = 1, limit = 20) => api.get(`/wallet/transactions?page=${page}&limit=${limit}`)
}

// 聊天相关API
export const chatAPI = {
  // 获取聊天列表
  getChats: async () => {
    const response = await api.get('/chats')
    return response
  },
  
  // 创建群聊
  createGroup: async (data) => {
    const response = await api.post('/chats/group', data)
    return response
  },
  
  // 获取聊天记录（统一接口，支持私聊和群聊）
  getChatMessages: async (chatId) => {
    const response = await api.get(`/chats/messages/${chatId}`)
    return response
  },
}

// 红包相关 API
export const redPacketAPI = {
  // 创建红包（私聊）
  createPrivateRedPacket: async (data) => {
    const response = await api.post('/redpackets/create', data)
    return response
  },
  
  // 创建群聊红包
  createGroupRedPacket: async (data) => {
    const response = await api.post('/redpackets/group', data)
    return response
  },
  
  // 领取红包
  openRedPacket: async (redPacketId) => {
    const response = await api.post(`/redpackets/${redPacketId}/open`)
    return response
  },
  
  // 获取红包详情
  getRedPacketDetail: async (redPacketId) => {
    const response = await api.get(`/redpackets/${redPacketId}`)
    return response
  },
  
  // 🐉 获取群红包列表（接龙群用）
  getGroupRedPackets: async (groupId) => {
    const response = await api.get(`/redpackets/group/${groupId}`)
    return response
  }
}

// 接龙群相关 API
export const chainGroupAPI = {
  // 创建接龙群
  createChainGroup: async (data) => {
    const response = await api.post('/chain-groups', data)
    return response
  },
  
  // 获取我创建的接龙群列表
  getMyCreatedGroups: async (page = 1, limit = 20) => {
    const response = await api.get('/chain-groups/my-created', {
      params: { page, limit }
    })
    return response
  },
  
  // 获取接龙群列表（用户视角）
  getChainGroups: async () => {
    const response = await api.get('/chain-groups/list')
    return response
  },
  
  // 获取接龙群详情
  getChainGroupDetail: async (groupId) => {
    const response = await api.get(`/chain-groups/${groupId}`)
    return response
  },
  
  // 🔥 检查用户在接龙群的状态（是否被踢出）
  checkUserStatus: async (groupId, userId) => {
    const response = await api.get(`/redpackets/chain/status/${groupId}/${userId}`)
    return response
  },
  
  // 获取接龙群消息历史
  getMessages: async (groupId, params = {}) => {
    const response = await api.get(`/chats/messages/${groupId}`, {
      params: { limit: params.limit || 50, ...params }
    })
    return response
  },
  
  // 发送接龙群消息
  sendMessage: async (data) => {
    const response = await api.post('/chats/messages', data)
    return response
  },
  
  // ⚠️ 已废弃：请使用 WebSocket 方式加入接龙群
  // 保留此方法仅为向后兼容，建议迁移到 socket.joinChainGroupViaSocket()
  joinChainGroup: async (groupId) => {
    console.warn('⚠️ chainGroupAPI.joinChainGroup 已废弃，请使用 WebSocket 方式')
    const response = await api.post(`/chain-groups/${groupId}/join`)
    return response
  },
  
  // 获取接龙群个人信息
  getChainInfo: async (groupId) => {
    const response = await api.get(`/groups/${groupId}/chain-info`)
    return response
  },
  
  // ===== 邀请相关 =====
  // 创建邀请
  createInvitation: async (groupId, inviteeId, expireDays = 7) => {
    const response = await api.post(`/groups/${groupId}/invite`, {
      inviteeId,
      expireDays
    })
    return response
  },
  
  // 获取群的邀请列表
  getGroupInvitations: async (groupId, page = 1, limit = 20) => {
    const response = await api.get(`/groups/${groupId}/invitations`, {
      params: { page, limit }
    })
    return response
  },
  
  // 获取邀请详情（通过邀请码）
  getInvitationByCode: async (code) => {
    const response = await api.get(`/groups/invitation/${code}`)
    return response
  },
  
  // 接受邀请
  acceptInvitation: async (code) => {
    const response = await api.post(`/groups/invitation/${code}/accept`)
    return response
  },
  
  // 拒绝邀请
  rejectInvitation: async (code, reason = '') => {
    const response = await api.post(`/groups/invitation/${code}/reject`, { reason })
    return response
  },
  
  // 获取我的待处理邀请
  getPendingInvitations: async () => {
    const response = await api.get('/groups/invitations/pending')
    return response
  },
  
  // ===== 收益相关 =====
  // 获取群收益统计
  getGroupIncomeStats: async (groupId) => {
    const response = await api.get(`/groups/${groupId}/income-stats`)
    return response
  },
  
  // 获取我的总收益统计
  getMyIncomeStats: async () => {
    const response = await api.get('/groups/my-income/stats')
    return response
  },
  
  // 获取收益明细列表
  getIncomeList: async (page = 1, limit = 20) => {
    const response = await api.get('/groups/my-income/list', {
      params: { page, limit }
    })
    return response
  }
}



export default api
