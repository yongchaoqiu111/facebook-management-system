import { io } from 'socket.io-client'

// Socket.io客户端实例
let socket = null

// 初始化Socket连接
export const initSocket = () => {
  const token = localStorage.getItem('token')
  
  if (!token) {
    console.error('❌ [Socket] Token 不存在，无法建立连接')
    return null
  }
  
  // ✅ 如果已有连接，先销毁旧连接（防止重复监听）
  if (socket) {
    console.log('🔄 [Socket] 检测到旧连接，先断开...')
    socket.off()
    socket.disconnect()
    socket = null
  }
  
  console.log('🔑 [Socket] 使用 token 连接:', token.substring(0, 20) + '...')
  
  // ✅ 使用环境变量配置 WebSocket 地址
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000'
  console.log('🔌 [Socket] 连接地址:', wsUrl)
  
  // 创建新连接
  socket = io(wsUrl, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    auth: {
      token: token
    }
  })

  // 连接事件
  socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket.id)
  })

  // 断开连接事件
  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected')
  })

  // 重连事件
  socket.on('reconnect', (attemptNumber) => {
    console.log('🔄 Socket reconnected, attempt:', attemptNumber)
  })

  // 连接错误事件
  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error)
  })
  
  return socket
}

// 获取Socket实例
export const getSocket = () => {
  if (!socket) {
    return initSocket()
  }
  return socket
}

// 加入房间（旧方法，保留兼容）
export const joinRoom = (roomId) => {
  if (socket) {
    socket.emit('joinRoom', roomId)
    console.log(`Joined room: ${roomId}`)
  }
}

// 加入群组（新方法，后端已更新为监听此事件）
export const joinGroup = (groupId) => {
  if (socket) {
    socket.emit('joinGroup', groupId)
    console.log(`✅ Joined group: ${groupId}`)
  } else {
    console.error('❌ Socket未初始化，无法加入群组')
  }
}

// 离开群组
export const leaveGroup = (groupId) => {
  if (socket) {
    socket.emit('leaveGroup', groupId)
    console.log(`✅ Left group: ${groupId}`)
  } else {
    console.error('❌ Socket未初始化，无法离开群组')
  }
}

// 发送私聊消息
export const sendPrivateMessage = (data) => {
  if (socket) {
    console.log('发送私聊消息:', data)
    socket.emit('chat:privateMessage', data)
    console.log('私聊消息已发送')
  } else {
    console.error('Socket未连接，无法发送私聊消息')
  }
}

// 发送群聊消息
export const sendGroupMessage = (data) => {
  if (socket) {
    console.log('发送群聊消息:', data)
    socket.emit('chat:groupMessage', data)
    console.log('群聊消息已发送')
  } else {
    console.error('Socket未连接，无法发送群聊消息')
  }
}

// 发送红包
export const sendRedPacket = (data) => {
  if (socket) {
    socket.emit('sendRedPacket', data)
  }
}

// 打开红包
export const openRedPacket = (data) => {
  if (socket) {
    socket.emit('openRedPacket', data)
  }
}

// 发送输入状态
export const sendTyping = (data) => {
  if (socket) {
    socket.emit('typing', data)
  }
}

// 发送停止输入
export const sendStopTyping = (data) => {
  if (socket) {
    socket.emit('stopTyping', data)
  }
}

// 发送消息已读
export const sendMessageRead = (data) => {
  if (socket) {
    socket.emit('messageRead', data)
  }
}

// 获取在线状态
export const getOnlineStatus = (userIds) => {
  if (socket) {
    socket.emit('getOnlineStatus', userIds)
  }
}

// 监听私聊消息
export const onPrivateMessage = (callback) => {
  if (socket) {
    socket.on('privateMessage', callback)
  }
}

// 监听群聊消息
export const onGroupMessage = (callback) => {
  if (socket) {
    socket.on('groupMessage', callback)
  }
}

// 监听私聊红包
export const onReceiveRedPacket = (callback) => {
  if (socket) {
    socket.on('receiveRedPacket', callback)
  }
}

// 监听群红包
export const onGroupRedPacket = (callback) => {
  if (socket) {
    socket.on('groupRedPacket', callback)
  }
}

// 监听红包创建（新增）
export const onRedPacketCreated = (callback) => {
  if (socket) {
    socket.on('redPacketCreated', callback)
  }
}

// 监听红包被领取（新增）
export const onRedPacketOpened = (callback) => {
  if (socket) {
    socket.on('redPacketOpened', callback)
  }
}

// 监听红包领完（新增）
export const onRedPacketFinished = (callback) => {
  if (socket) {
    socket.on('redPacketFinished', callback)
  }
}

// 监听红包过期（新增）
export const onRedPacketExpired = (callback) => {
  if (socket) {
    socket.on('redPacketExpired', callback)
  }
}

// 监听红包超过阈值（新增）
export const onRedPacketExceeded = (callback) => {
  if (socket) {
    socket.on('redPacketExceeded', callback)
  }
}



// 监听用户输入
export const onUserTyping = (callback) => {
  if (socket) {
    socket.on('userTyping', callback)
  }
}

// 监听用户停止输入
export const onUserStopTyping = (callback) => {
  if (socket) {
    socket.on('userStopTyping', callback)
  }
}

// 监听消息已读回执
export const onMessageReadReceipt = (callback) => {
  if (socket) {
    socket.on('messageReadReceipt', callback)
  }
}

// 监听在线状态
export const onOnlineStatus = (callback) => {
  if (socket) {
    socket.on('onlineStatus', callback)
  }
}

// 监听用户状态变化
export const onUserStatusChanged = (callback) => {
  if (socket) {
    socket.on('userStatusChanged', callback)
  }
}

// 监听错误消息
export const onErrorMessage = (callback) => {
  if (socket) {
    socket.on('errorMessage', callback)
  }
}

// 监听新六合红包
export const onNewLiuheRedPacket = (callback) => {
  if (socket) {
    socket.on('newLiuheRedPacket', callback)
  }
}

// 监听群邀请
export const onGroupInvitation = (callback) => {
  if (socket) {
    socket.on('groupInvitation', callback)
  }
}

// ✅ 监听红包领取结果（发给当前用户）
export const onRedPacketReceived = (callback) => {
  if (socket) {
    socket.on('redPacketReceived', callback)
  }
}

// ✅ 监听红包状态更新（发给群组）
export const onRedPacketUpdated = (callback) => {
  if (socket) {
    socket.on('redPacketUpdated', callback)
  }
}

// ✅ 新增：通过 WebSocket 加入接龙群
export const joinChainGroupViaSocket = (groupId, testMode = false, onError = null) => {
  if (socket) {
    console.log('🐉 [Socket] 尝试通过 WebSocket 加入接龙群:', groupId)
    
    // 监听错误消息
    const handleError = (error) => {
      console.log('❌ 加入接龙群失败:', error)
      if (onError) {
        onError(error)
      }
      // 移除监听器
      socket.off('errorMessage', handleError)
      socket.off('chainGroupJoined', handleSuccess)
    }
    
    // 监听成功消息
    const handleSuccess = (data) => {
      console.log('✅ 加入接龙群成功:', data)
      // 移除监听器
      socket.off('errorMessage', handleError)
      socket.off('chainGroupJoined', handleSuccess)
    }
    
    socket.once('errorMessage', handleError)
    socket.once('chainGroupJoined', handleSuccess)
    
    socket.emit('chat:joinChainGroup', {
      groupId: groupId,
      testMode: testMode  // false=正式(3小时冷却), true=测试(3秒冷却)
    })
    console.log('✅ 已发送 chat:joinChainGroup 事件')
  } else {
    console.error('❌ Socket未初始化，无法加入接龙群')
  }
}

// ✅ 监听加入接龙群结果
export const onChainGroupJoined = (callback) => {
  if (socket) {
    socket.on('chainGroupJoined', callback)
  }
}

// 🆕 监听好友添加
export const onFriendAdded = (callback) => {
  if (socket) {
    socket.on('friendAdded', callback)
  }
}

// 🆕 监听好友移除
export const onFriendRemoved = (callback) => {
  if (socket) {
    socket.on('friendRemoved', callback)
  }
}

// 🆕 监听好友列表更新（批量）
export const onFriendListUpdated = (callback) => {
  if (socket) {
    socket.on('friendListUpdated', callback)
  }
}

// 断开连接
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
