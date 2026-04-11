/**
 * 红包业务逻辑模块
 * 统一管理所有红包类型的生成、发送和接收逻辑
 */

import { getSocket } from '../socket'

/**
 * 生成唯一的红包ID
 * @param {string} type - 红包类型: 'private' | 'group' | 'chain'
 * @param {string} senderId - 发送者ID
 * @returns {string} 唯一红包ID
 */
export const generateRedPacketId = (type, senderId) => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 9)
  const prefix = {
    private: 'pvt',
    group: 'grp',
    chain: 'chn'
  }[type] || 'unk'
  
  return `${prefix}_${senderId}_${timestamp}_${random}`
}

/**
 * 构建红包消息对象
 * @param {Object} params - 红包参数
 * @returns {Object} 标准化的红包消息对象
 */
export const buildRedPacketMessage = (params) => {
  const {
    redPacketId,
    type, // 'normal' | 'lucky' | 'chain' | 'liuhe'
    amount,
    count,
    message,
    time,
    senderId,
    senderName,
    receiverId = null,
    receiverName = null,
    groupId = null,
    isChainRedPacket = false,
    perAmount = null,
    expired = false // 🐉 过期状态
  } = params

  return {
    type: 'redPacket',
    redPacketType: type,
    amount,
    count: count || 1,
    message: message || '恭喜发财，大吉大利',
    time,
    opened: false,
    expired, // 🐉 保存过期状态
    redPacketId,
    clientMsgId: redPacketId, // 保持一致性
    senderId,
    senderName: senderName || '好友',
    receiverId,
    receiverName,
    groupId,
    isChainRedPacket,
    perAmount
  }
}

/**
 * 通过 Socket 发送私聊红包
 * @param {Object} params - 红包参数
 */
export const emitPrivateRedPacket = (params) => {
  const socket = getSocket()
  if (!socket || !socket.connected) {
    console.error('❌ Socket未连接，无法发送私聊红包')
    return false
  }

  const {
    redPacketId,
    receiverId,
    receiverName,
    type,
    amount,
    message,
    senderId,
    senderName
  } = params

  console.log('📤 发送私聊红包:', { redPacketId, receiverId })

  socket.emit('chat:sendPrivateRedPacket', {
    redPacketId,
    receiverId,
    receiverName: receiverName || '好友',
    type,
    amount,
    count: 1,
    message: message || '恭喜发财，大吉大利',
    senderId,
    senderName: senderName || '我'
  })

  return true
}

/**
 * 通过 Socket 发送群聊红包
 * @param {Object} params - 红包参数
 */
export const emitGroupRedPacket = (params) => {
  const socket = getSocket()
  if (!socket || !socket.connected) {
    console.error('❌ Socket未连接，无法发送群聊红包')
    return false
  }

  const {
    redPacketId,
    groupId,
    type,
    amount,
    count,
    message,
    senderId,
    senderName,
    isChainRedPacket = false
  } = params

  console.log('📤 发送群聊红包:', { redPacketId, groupId })

  socket.emit('chat:sendGroupRedPacket', {
    redPacketId,
    groupId,
    type,
    amount,
    count,
    message: message || '恭喜发财，大吉大利',
    senderId,
    senderName: senderName || '我',
    isChainRedPacket
  })

  return true
}

/**
 * 验证收到的红包是否属于当前聊天
 * @param {Object} redPacketData - 后端广播的红包数据
 * @param {Object} currentContact - 当前聊天联系人信息
 * @param {string} currentUserId - 当前用户ID（业务ID）
 * @returns {boolean} 是否属于当前聊天
 */
export const isRedPacketForCurrentChat = (redPacketData, currentContact, currentUserId) => {
  if (!currentContact) return false

  const { groupId, sender, receiver } = redPacketData
  
  // 🐉 获取当前用户的 ObjectId
  let currentUserObjectId = localStorage.getItem('userObjectId')
  if (!currentUserObjectId) {
    try {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const userObj = JSON.parse(userStr)
        currentUserObjectId = userObj._id || userObj.id
      }
    } catch (e) {
      console.warn('⚠️ 无法解析 user 对象:', e)
    }
  }
  
  // 🐉 解析发送者ID（兼容多种格式）
  const senderUserId = typeof sender === 'object' ? sender.userId : null
  const senderObjectId = typeof sender === 'object' ? sender._id : (typeof sender === 'string' ? sender : null)
  
  // 🐉 解析接收者ID（注意：receiver.userId 可能存的是 ObjectId！）
  const receiverUserId = receiver && typeof receiver === 'object' ? receiver.userId : null
  const receiverObjectId = receiver && typeof receiver === 'object' ? receiver._id : null
  
  // 🐉 聊天对象的ID（可能是业务ID或ObjectId）
  const chatOtherUserId = currentContact.userId || currentContact.id
  
  console.log('🔍 [redPacket] 调试信息:')
  console.log('  - senderUserId:', senderUserId)
  console.log('  - senderObjectId:', senderObjectId)
  console.log('  - receiverUserId:', receiverUserId)
  console.log('  - receiverObjectId:', receiverObjectId)
  console.log('  - currentUserObjectId:', currentUserObjectId)
  console.log('  - chatOtherUserId:', chatOtherUserId)

  // 群聊红包：检查 groupId 是否匹配
  if (groupId) {
    return String(groupId) === String(currentContact.id)
  }

  // 私聊红包：检查是否是当前私聊的参与者
  if (!currentContact.isGroup) {
    // 🐉 收集所有可能的ID进行匹配
    const allSenderIds = [senderUserId, senderObjectId].filter(Boolean)
    const allReceiverIds = [receiverUserId, receiverObjectId].filter(Boolean)
    const allCurrentUserIds = [currentUserId, currentUserObjectId].filter(Boolean)
    const allChatOtherIds = [chatOtherUserId].filter(Boolean)
    
    console.log('  - allSenderIds:', allSenderIds)
    console.log('  - allReceiverIds:', allReceiverIds)
    console.log('  - allCurrentUserIds:', allCurrentUserIds)
    console.log('  - allChatOtherIds:', allChatOtherIds)
    
    // 检查发送者或接收者是否匹配当前用户或聊天对象
    const isMatch = allSenderIds.some(sid => 
      allCurrentUserIds.some(uid => String(sid) === String(uid)) ||
      allChatOtherIds.some(oid => String(sid) === String(oid))
    ) || allReceiverIds.some(rid => 
      allCurrentUserIds.some(uid => String(rid) === String(uid)) ||
      allChatOtherIds.some(oid => String(rid) === String(oid))
    )
    
    console.log('  - 匹配结果:', isMatch)
    return isMatch
  }

  return false
}

/**
 * 处理接收到的红包数据，转换为前端消息格式
 * @param {Object} redPacketData - 后端广播的红包数据
 * @param {string} currentUserId - 当前用户ID
 * @returns {Object} 前端红包消息对象
 */
export const processReceivedRedPacket = (redPacketData, currentUserId) => {
  const now = new Date()
  const time = now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes()

  // 解析发送者和接收者信息
  const senderId = typeof redPacketData.sender === 'object'
    ? (redPacketData.sender.userId || redPacketData.sender._id)
    : redPacketData.sender

  const receiverId = redPacketData.receiver
    ? (typeof redPacketData.receiver === 'object'
        ? (redPacketData.receiver.userId || redPacketData.receiver._id)
        : redPacketData.receiver)
    : null

  return buildRedPacketMessage({
    redPacketId: redPacketData.redPacketId,
    type: redPacketData.type,
    amount: redPacketData.amount,
    count: redPacketData.count || 1,
    message: redPacketData.message,
    time,
    senderId,
    senderName: redPacketData.senderName,
    receiverId,
    receiverName: redPacketData.receiverName,
    groupId: redPacketData.groupId,
    isChainRedPacket: redPacketData.isChainRedPacket,
    perAmount: redPacketData.perAmount,
    expired: redPacketData.expired || false // 🐉 从后端获取过期状态
  })
}
