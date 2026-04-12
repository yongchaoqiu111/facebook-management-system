/**
 * IndexedDB 聊天消息存储模块
 * 用于替代 LocalStorage，支持大量消息存储
 */
import { openDB } from 'idb'

const DB_NAME = 'ChatMessagesDB'
const DB_VERSION = 5  // 🆕 升级到 v5，添加交易记录存储
const STORE_NAME = 'messages'
const REDPACKET_STORE_NAME = 'redPackets'  // ✅ 红包明细存储
const BALANCE_STORE_NAME = 'balanceChanges'  // ✅ 账单变动存储
const TRADE_STORE_NAME = 'tradeRecords'  // 🆕 交易记录存储

// 初始化数据库
let dbPromise = null

export const getDB = async () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log(`🔧 IndexedDB 升级: v${oldVersion} → v${newVersion}`)
        
        // 创建消息存储对象
        let store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          console.log('✅ 创建 messages 存储')
        } else {
          store = transaction.objectStore(STORE_NAME)
        }
        
        // 确保所有索引都存在
        const indexes = [
          { name: 'groupId', keyPath: 'groupId' },
          { name: 'chatId', keyPath: 'chatId' },
          { name: 'timestamp', keyPath: 'timestamp' },
          { name: 'type', keyPath: 'type' },
          { name: 'groupId_timestamp', keyPath: ['groupId', 'timestamp'] },
          { name: 'chatId_timestamp', keyPath: ['chatId', 'timestamp'] }
        ]
        
        for (const index of indexes) {
          if (!store.indexNames.contains(index.name)) {
            try {
              store.createIndex(index.name, index.keyPath, { unique: false })
              console.log(`✅ 创建索引: ${index.name}`)
            } catch (e) {
              console.log(`⚠️ 索引 ${index.name} 已存在或创建失败:`, e.message)
            }
          }
        }
        
        // ✅ 创建红包明细存储对象
        if (!db.objectStoreNames.contains(REDPACKET_STORE_NAME)) {
          const redPacketStore = db.createObjectStore(REDPACKET_STORE_NAME, { keyPath: 'redPacketId' })
          
          // 创建索引
          redPacketStore.createIndex('chatId', 'chatId', { unique: false })
          redPacketStore.createIndex('status', 'status', { unique: false })
          redPacketStore.createIndex('createdAt', 'createdAt', { unique: false })
          
          console.log('✅ 创建 redPackets 存储')
        }
        
        // ✅ 创建账单变动存储对象
        if (!db.objectStoreNames.contains(BALANCE_STORE_NAME)) {
          const balanceStore = db.createObjectStore(BALANCE_STORE_NAME, { keyPath: 'id' })
          
          // 创建索引
          balanceStore.createIndex('userId', 'userId', { unique: false })
          balanceStore.createIndex('type', 'type', { unique: false })
          balanceStore.createIndex('timestamp', 'timestamp', { unique: false })
          balanceStore.createIndex('userId_timestamp', ['userId', 'timestamp'], { unique: false })
          
          console.log('✅ 创建 balanceChanges 存储')
        }
        
        // 🆕 创建交易记录存储对象（按币种数字ID索引）
        if (!db.objectStoreNames.contains(TRADE_STORE_NAME)) {
          const tradeStore = db.createObjectStore(TRADE_STORE_NAME, { keyPath: 'id' })
          
          // 创建索引：币种数字ID作为第一索引（1=BTC, 2=ETH, 3=BNB, 4=SOL, 5=XRP）
          tradeStore.createIndex('coinId', 'coinId', { unique: false })  // 1, 2, 3, 4, 5
          tradeStore.createIndex('type', 'type', { unique: false })      // buy, sell
          tradeStore.createIndex('timestamp', 'timestamp', { unique: false })
          tradeStore.createIndex('coinId_timestamp', ['coinId', 'timestamp'], { unique: false })
          
          console.log('✅ 创建 tradeRecords 存储（按币种数字ID索引）')
        }
      }
    })
  }
  return dbPromise
}

/**
 * 统一消息解析器 - 将后端数据格式化为标准消息对象
 * @param {Object} data - 后端返回的原始数据
 * @param {string} currentUserId - 当前用户ID
 * @returns {Object} 标准化后的消息对象
 */
export const parseMessage = (data, currentUserId) => {
  const now = new Date()
  const time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0')
  
  // ✅ 兼容不同的发送者字段
  // 优先提取业务用户 ID（userId），而不是 MongoDB 的 _id
  let senderId = null
  
  // 1. 先尝试从 sender 对象获取 userId（业务ID）
  if (data.sender) {
    if (typeof data.sender === 'object') {
      // 优先取 userId，如果没有再取 _id
      senderId = data.sender.userId || data.sender._id
    } else if (typeof data.sender === 'string' || typeof data.sender === 'number') {
      // sender 直接是用户 ID
      senderId = data.sender
    }
  }
  
  // 2. 如果没有，尝试从 senderId 字段获取
  if (!senderId && data.senderId) {
    senderId = data.senderId
  }
  
  // 3. 如果还是没有，尝试从 banker 字段获取（六合红包的庄家）
  if (!senderId && data.banker) {
    if (typeof data.banker === 'object') {
      senderId = data.banker.userId || data.banker._id
    } else if (typeof data.banker === 'string' || typeof data.banker === 'number') {
      senderId = data.banker
    }
  }
  
  console.log('🔍 parseMessage - senderId 提取:')
  console.log('  - data.sender:', data.sender)
  console.log('  - data.senderId:', data.senderId)
  console.log('  - data.banker:', data.banker)
  console.log('  - ✅ 最终 senderId:', senderId)
  console.log('  - currentUserId:', currentUserId)
  
  // ✅ 关键：统一转换为字符串比较（避免类型不匹配）
  const isSelf = String(senderId) === String(currentUserId)
  
  // ✅ 消息方向标记：0 = 自己的消息（右侧），1 = 别人的消息（左侧）
  const direction = isSelf ? 0 : 1
  
  console.log('🎯 parseMessage - 方向判断:')
  console.log('  - isSelf:', isSelf)
  console.log('  - direction:', direction, direction === 0 ? '(0=自己右侧)' : '(1=别人左侧)')
  
  // 🆕 根据 ID 位数判断类型：7位=群，8位=好友
  const getIdType = (id) => {
    const idStr = String(id)
    if (idStr.length === 7) return 'group'
    if (idStr.length === 8) return 'friend'
    return 'unknown'
  }
  
  // 判断消息类型
  if (data.type === 'redPacket' || data.redPacket || data.redPacketId) {
    // 红包消息
    // 🆕 计算聊天ID：根据 ID 位数自动判断
    let chatId = data.groupId
    if (!chatId && data.receiverId) {
      // 私聊红包：确定对方ID
      const otherUserId = senderId === currentUserId ? data.receiverId : senderId
      chatId = `friend_${otherUserId}`  // 🆕 统一使用 friend_ 前缀
    }
    
    return {
      id: data._id || data.redPacketId || `rp_${Date.now()}`,
      type: 'redPacket',
      chatId: chatId,  // 🆕 私聊红包也用 friend_ 前缀
      direction: direction,  // ✅ 0=自己，1=别人
      redPacketType: data.type || data.redPacket?.type || 'liuhe',
      amount: data.amount || data.totalAmount || data.redPacket?.amount || 0,
      count: data.count || data.redPacket?.count || 1,
      message: data.message || data.redPacket?.message || '恭喜发财，大吉大利',
      time: time,
      timestamp: data.createdAt || new Date().toISOString(),
      opened: false,
      redPacketId: data._id || data.redPacketId || data.redPacket?._id,
      clientMsgId: data._id || data.clientMsgId,
      senderId: senderId,
      groupId: data.groupId,
      receiverId: data.receiverId,
      isSelf: isSelf,
      status: 'active'
    }
  } else if (data.type === 'system') {
    // 系统消息（居中显示，无方向）
    return {
      id: data._id || `sys_${Date.now()}`,
      type: 'system',
      chatId: data.groupId,
      direction: -1,  // ✅ 系统消息无方向
      content: data.content,
      time: time,
      timestamp: data.createdAt || new Date().toISOString(),
      groupId: data.groupId,
      isSelf: false
    }
  } else if (data.chatType === 'private' || data.receiverId) {
    // 私聊消息
    // 🆕 计算对方ID：如果发送者是自己，对方是receiver；如果接收者是自己，对方是sender
    const otherUserId = senderId === currentUserId ? data.receiverId : senderId
    const chatId = `friend_${otherUserId}`  // 🆕 改为 friend_ 前缀，与好友ID对应
    
    return {
      id: data._id || `msg_${Date.now()}`,
      type: 'text',
      chatId: chatId,  // 🆕 私聊会话ID：friend_好友ID
      direction: direction,  // ✅ 0=自己，1=别人
      content: data.content,
      time: time,
      timestamp: data.createdAt || new Date().toISOString(),
      senderId: senderId,
      receiverId: data.receiverId,
      groupId: null,
      isSelf: senderId === currentUserId,
      status: 'sent'
    }
  } else {
    // 群聊消息
    // 🆕 群ID也是用 friend_ 前缀，通过 ID 位数区分
    const chatId = data.groupId ? `friend_${data.groupId}` : null
    
    return {
      id: data._id || `msg_${Date.now()}`,
      type: 'text',
      chatId: chatId,  // 🆕 群聊也用 friend_ 前缀
      direction: direction,  // ✅ 0=自己，1=别人
      content: data.content,
      time: time,
      timestamp: data.createdAt || new Date().toISOString(),
      senderId: senderId,
      groupId: data.groupId,
      isSelf: isSelf,
      status: 'sent'
    }
  }
}

/**
 * 保存消息到 IndexedDB
 * @param {Object} message - 消息对象
 */
export const saveMessage = async (message) => {
  try {
    const db = await getDB()
    // ✅ 关键：将响应式对象转换为纯 JSON 对象
    const plainMessage = JSON.parse(JSON.stringify(message))
    
    // ✅ 统一转换 timestamp 为数字类型（确保复合索引查询正常）
    if (plainMessage.timestamp) {
      if (typeof plainMessage.timestamp === 'string') {
        // ISO 字符串 → 时间戳数字
        plainMessage.timestamp = new Date(plainMessage.timestamp).getTime()
      } else if (typeof plainMessage.timestamp !== 'number') {
        // 其他类型 → 当前时间戳
        plainMessage.timestamp = Date.now()
      }
    } else {
      // 没有 timestamp → 添加当前时间戳
      plainMessage.timestamp = Date.now()
    }
    
    await db.put(STORE_NAME, plainMessage)
    console.log('💾 消息已保存到 IndexedDB:', message.id)
  } catch (error) {
    console.error('❌ 保存消息失败:', error)
    throw error
  }
}

/**
 * 批量保存消息
 * @param {Array} messages - 消息数组
 */
export const saveMessages = async (messages) => {
  try {
    const db = await getDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    
    for (const message of messages) {
      // ✅ 关键：将响应式对象转换为纯 JSON 对象
      const plainMessage = JSON.parse(JSON.stringify(message))
      
      // ✅ 统一转换 timestamp 为数字类型（确保复合索引查询正常）
      if (plainMessage.timestamp) {
        if (typeof plainMessage.timestamp === 'string') {
          // ISO 字符串 → 时间戳数字
          plainMessage.timestamp = new Date(plainMessage.timestamp).getTime()
        } else if (typeof plainMessage.timestamp !== 'number') {
          // 其他类型 → 当前时间戳
          plainMessage.timestamp = Date.now()
        }
      } else {
        // 没有 timestamp → 添加当前时间戳
        plainMessage.timestamp = Date.now()
      }
      
      tx.store.put(plainMessage)
    }
    
    await tx.done
    console.log(`💾 批量保存 ${messages.length} 条消息到 IndexedDB`)
  } catch (error) {
    console.error('❌ 批量保存消息失败:', error)
    throw error
  }
}

/**
 * 获取指定群组的所有消息（按时间排序）
 * @param {string} groupId - 群组ID
 * @param {number} limit - 限制数量（默认500）
 * @returns {Array} 消息数组
 */
export const getMessagesByGroup = async (groupId, limit = 500) => {
  return await getMessagesByChatId(groupId, limit)
}

/**
 * 获取指定聊天会话的所有消息（群聊或私聊）
 * @param {string} chatId - 聊天会话ID（群聊为groupId，私聊为private_对方ID）
 * @param {number} limit - 限制数量（默认500）
 * @returns {Array} 消息数组
 */
export const getMessagesByChatId = async (chatId, limit = 500) => {
  try {
    const db = await getDB()
    
    // ✅ 使用复合索引查询，chatId 是字符串，timestamp 是数字
    const messages = await db.getAllFromIndex(
      STORE_NAME,
      'chatId_timestamp',
      IDBKeyRange.bound([chatId, 0], [chatId, Number.MAX_SAFE_INTEGER])
    )
    
    // 按时间戳排序（最新的在前）
    messages.sort((a, b) => new Date(b.timestamp || b.time) - new Date(a.timestamp || a.time))
    
    // 限制返回数量
    const result = messages.slice(0, limit)
    
    // 再次按时间正序（旧→新）用于显示
    return result.reverse()
  } catch (error) {
    console.error('❌ 获取聊天消息失败:', error)
    return []
  }
}

// 🆕 获取与指定好友的所有私聊消息
export const getMessagesByFriendId = async (friendId, limit = 500) => {
  const chatId = `friend_${friendId}`  // 🆕 使用 friend_ 前缀
  return await getMessagesByChatId(chatId, limit)
}

/**
 * 删除指定群组的旧消息（保留最新的 limit 条）
 * @param {string} groupId - 群组ID
 * @param {number} keepCount - 保留数量（默认500）
 */
export const cleanupOldMessages = async (groupId, keepCount = 500) => {
  try {
    const db = await getDB()
    
    // 获取所有消息
    const allMessages = await getMessagesByGroup(groupId, Infinity)
    
    if (allMessages.length <= keepCount) {
      console.log(`ℹ️ 消息数量 ${allMessages.length} 未超过限制 ${keepCount}，无需清理`)
      return
    }
    
    // 计算需要删除的消息（最旧的）
    const messagesToDelete = allMessages.slice(0, allMessages.length - keepCount)
    
    // 批量删除
    const tx = db.transaction(STORE_NAME, 'readwrite')
    for (const message of messagesToDelete) {
      tx.store.delete(message.id)
    }
    await tx.done
    
    console.log(`🗑️ 已清理 ${messagesToDelete.length} 条旧消息，保留最新 ${keepCount} 条`)
  } catch (error) {
    console.error('❌ 清理旧消息失败:', error)
  }
}

/**
 * 删除指定消息
 * @param {string} messageId - 消息ID
 */
export const deleteMessage = async (messageId) => {
  try {
    const db = await getDB()
    await db.delete(STORE_NAME, messageId)
    console.log('🗑️ 消息已删除:', messageId)
  } catch (error) {
    console.error('❌ 删除消息失败:', error)
    throw error
  }
}

/**
 * 清空指定群组的所有消息
 * @param {string} groupId - 群组ID
 */
export const clearGroupMessages = async (groupId) => {
  try {
    const db = await getDB()
    const messages = await getMessagesByGroup(groupId, Infinity)
    
    const tx = db.transaction(STORE_NAME, 'readwrite')
    for (const message of messages) {
      tx.store.delete(message.id)
    }
    await tx.done
    
    console.log(`🗑️ 已清空群组 ${groupId} 的 ${messages.length} 条消息`)
  } catch (error) {
    console.error('❌ 清空群组消息失败:', error)
  }
}

/**
 * 获取消息总数
 * @param {string} groupId - 群组ID（可选，不传则统计所有）
 * @returns {number} 消息数量
 */
export const getMessageCount = async (groupId = null) => {
  try {
    const db = await getDB()
    
    if (groupId) {
      const messages = await getMessagesByGroup(groupId, Infinity)
      return messages.length
    } else {
      return await db.count(STORE_NAME)
    }
  } catch (error) {
    console.error('❌ 获取消息数量失败:', error)
    return 0
  }
}

/**
 * 检查消息是否存在
 * @param {string} messageId - 消息ID
 * @returns {boolean} 是否存在
 */
export const messageExists = async (messageId) => {
  try {
    const db = await getDB()
    const message = await db.get(STORE_NAME, messageId)
    return !!message
  } catch (error) {
    console.error('❌ 检查消息存在性失败:', error)
    return false
  }
}

/**
 * 导出所有消息（用于备份）
 * @returns {Array} 所有消息
 */
export const exportAllMessages = async () => {
  try {
    const db = await getDB()
    return await db.getAll(STORE_NAME)
  } catch (error) {
    console.error('❌ 导出消息失败:', error)
    return []
  }
}

/**
 * 导入消息（用于恢复）
 * @param {Array} messages - 消息数组
 */
export const importMessages = async (messages) => {
  try {
    await saveMessages(messages)
    console.log(`✅ 成功导入 ${messages.length} 条消息`)
  } catch (error) {
    console.error('❌ 导入消息失败:', error)
    throw error
  }
}

/**
 * 获取数据库信息
 * @returns {Object} 数据库信息
 */
export const getDatabaseInfo = async () => {
  try {
    const db = await getDB()
    const totalCount = await db.count(STORE_NAME)
    
    return {
      dbName: DB_NAME,
      version: DB_VERSION,
      totalMessages: totalCount,
      stores: Array.from(db.objectStoreNames)
    }
  } catch (error) {
    console.error('❌ 获取数据库信息失败:', error)
    return null
  }
}

// ==================== 账单变动存储 API ====================

/**
 * ✅ 保存余额变动记录
 * @param {Object} balanceChange - 余额变动对象
 */
export const saveBalanceChange = async (balanceChange) => {
  try {
    const db = await getDB()
    const tx = db.transaction(BALANCE_STORE_NAME, 'readwrite')
    await tx.objectStore(BALANCE_STORE_NAME).put(balanceChange)
    await tx.done
    console.log('✅ 已保存余额变动:', balanceChange.id)
  } catch (error) {
    console.error('❌ 保存余额变动失败:', error)
  }
}

/**
 * ✅ 批量保存余额变动记录
 * @param {Array} changes - 余额变动数组
 */
export const saveBalanceChanges = async (changes) => {
  try {
    const db = await getDB()
    const tx = db.transaction(BALANCE_STORE_NAME, 'readwrite')
    const store = tx.objectStore(BALANCE_STORE_NAME)
    
    for (const change of changes) {
      await store.put(change)
    }
    
    await tx.done
    console.log(`✅ 已保存 ${changes.length} 条余额变动`)
  } catch (error) {
    console.error('❌ 批量保存余额变动失败:', error)
  }
}

/**
 * ✅ 获取用户的所有余额变动记录
 * @param {string} userId - 用户ID
 * @returns {Array} 余额变动数组
 */
export const getUserBalanceChanges = async (userId) => {
  try {
    const db = await getDB()
    const index = db.transaction(BALANCE_STORE_NAME, 'readonly').objectStore(BALANCE_STORE_NAME).index('userId')
    const all = await index.getAll(userId)
    
    // 按时间戳排序（最新的在前）
    return all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  } catch (error) {
    console.error('❌ 获取余额变动记录失败:', error)
    return []
  }
}

/**
 * ✅ 清除用户的余额变动记录
 * @param {string} userId - 用户ID
 */
export const clearUserBalanceChanges = async (userId) => {
  try {
    const db = await getDB()
    const tx = db.transaction(BALANCE_STORE_NAME, 'readwrite')
    const store = tx.objectStore(BALANCE_STORE_NAME)
    const index = store.index('userId')
    const keys = await index.getAllKeys(userId)
    
    for (const key of keys) {
      await store.delete(key)
    }
    
    await tx.done
    console.log(`✅ 已清除用户 ${userId} 的余额变动记录`)
  } catch (error) {
    console.error('❌ 清除余额变动记录失败:', error)
  }
}

/**
 * ✅ 清空所有消息数据（退出登录时调用）
 */
export const clearAllMessages = async () => {
  try {
    const db = await getDB()
    const tx = db.transaction(MESSAGE_STORE_NAME, 'readwrite')
    const store = tx.objectStore(MESSAGE_STORE_NAME)
    
    // 清空整个对象存储
    await store.clear()
    await tx.done
    console.log('✅ 已清空 IndexedDB 中的所有消息')
  } catch (error) {
    console.error('❌ 清空消息数据失败:', error)
  }
}

/**
 * ✅ 清空所有余额变动数据（退出登录时调用）
 */
export const clearAllBalanceChanges = async () => {
  try {
    const db = await getDB()
    const tx = db.transaction(BALANCE_STORE_NAME, 'readwrite')
    const store = tx.objectStore(BALANCE_STORE_NAME)
    
    // 清空整个对象存储
    await store.clear()
    await tx.done
    console.log('✅ 已清空 IndexedDB 中的所有余额变动记录')
  } catch (error) {
    console.error('❌ 清空余额变动数据失败:', error)
  }
}

// ==================== 🆕 按好友ID查询 API ====================

/**
 * 🆕 获取与指定好友的所有私聊消息和红包
 * @param {string} friendId - 好友ID
 * @param {number} limit - 限制数量（默认500）
 * @returns {Object} { messages: [], redPackets: [] }
 */
export const getFriendChatData = async (friendId, limit = 500) => {
  try {
    const chatId = `friend_${friendId}`  // 🆕 使用 friend_ 前缀
    
    // 获取消息（包含文本消息和红包消息）
    const messages = await getMessagesByChatId(chatId, limit)
    
    // 获取红包详情列表
    const redPackets = await getRedPacketsByChatId(chatId, limit)
    
    console.log(`📦 [getFriendChatData] 好友 ${friendId}: ${messages.length} 条消息, ${redPackets.length} 个红包`)
    
    return {
      messages,
      redPackets
    }
  } catch (error) {
    console.error('❌ 获取好友聊天数据失败:', error)
    return { messages: [], redPackets: [] }
  }
}

/**
 * 🆕 获取指定聊天会话的红包列表
 * @param {string} chatId - 聊天会话ID
 * @param {number} limit - 限制数量
 * @returns {Array} 红包数组
 */
export const getRedPacketsByChatId = async (chatId, limit = 500) => {
  try {
    const db = await getDB()
    const index = db.transaction(REDPACKET_STORE_NAME, 'readonly').objectStore(REDPACKET_STORE_NAME).index('chatId')
    const all = await index.getAll(chatId)
    
    // 按时间戳排序（最新的在前）
    all.sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp))
    
    return all.slice(0, limit)
  } catch (error) {
    console.error('❌ 获取红包列表失败:', error)
    return []
  }
}

/**
 * 🆕 通过红包ID查询红包详情（三级索引）
 * @param {string} redPacketId - 红包ID
 * @returns {Object|null} 红包详情对象
 */
export const getRedPacketById = async (redPacketId) => {
  try {
    const db = await getDB()
    const redPacket = await db.get(REDPACKET_STORE_NAME, redPacketId)
    
    if (redPacket) {
      console.log(`🧧 [getRedPacketById] 找到红包: ${redPacketId}`)
    } else {
      console.warn(`⚠️ [getRedPacketById] 未找到红包: ${redPacketId}`)
    }
    
    return redPacket || null
  } catch (error) {
    console.error('❌ 查询红包详情失败:', error)
    return null
  }
}

// ==================== 🆕 ID 类型判断工具 ====================

/**
 * 🆕 根据 ID 判断类型
 * @param {string|number} id - ID
 * @returns {string} 'group' | 'friend' | 'redPacket' | 'unknown'
 */
export const getIdType = (id) => {
  if (!id) return 'unknown'
  const idStr = String(id).replace(/^friend_/, '')  // 去掉 friend_ 前缀
  
  if (idStr.length === 7) return 'group'       // 7位 = 群
  if (idStr.length === 8) return 'friend'      // 8位 = 好友
  if (idStr.length === 11 || idStr.startsWith('rp_')) return 'redPacket'  // 11位 = 红包
  return 'unknown'
}

/**
 * 🆕 从 chatId 提取原始 ID
 * @param {string} chatId - 聊天ID（如 friend_10000003）
 * @returns {string} 原始 ID
 */
export const extractIdFromChatId = (chatId) => {
  if (!chatId) return null
  return chatId.replace(/^friend_/, '')
}

// ==================== 🆕 币种映射与交易记录 API ====================

/**
 * 🆕 币种数字ID映射
 */
export const COIN_MAP = {
  1: 'BTC',
  2: 'ETH',
  3: 'BNB',
  4: 'SOL',
  5: 'XRP'
}

/**
 * 🆕 根据币种名称获取数字ID
 * @param {string} symbol - 币种名称（BTC, ETH, etc.）
 * @returns {number} 数字ID
 */
export const getCoinIdBySymbol = (symbol) => {
  const entry = Object.entries(COIN_MAP).find(([_, name]) => name === symbol.toUpperCase())
  return entry ? parseInt(entry[0]) : null
}

/**
 * 🆕 根据数字ID获取币种名称
 * @param {number} coinId - 数字ID（1-5）
 * @returns {string} 币种名称
 */
export const getSymbolByCoinId = (coinId) => {
  return COIN_MAP[coinId] || 'UNKNOWN'
}

/**
 * 🆕 保存交易记录
 * @param {Object} trade - 交易记录对象
 */
export const saveTradeRecord = async (trade) => {
  try {
    const db = await getDB()
    await db.put(TRADE_STORE_NAME, trade)
    console.log('✅ 已保存交易记录:', trade.id)
  } catch (error) {
    console.error('❌ 保存交易记录失败:', error)
  }
}

/**
 * ✅ 添加交易记录（兼容命名）
 * @param {Object} trade - 交易记录对象
 */
export const addTradeRecord = saveTradeRecord

/**
 * ✅ 获取交易记录（按 userId 筛选）
 * @param {string} userId - 用户 ID
 * @param {number} limit - 限制数量
 * @returns {Array} 交易记录数组
 */
export const getTradeRecords = async (userId, limit = 50) => {
  try {
    const all = await getAllTrades(1000)
    // 筛选当前用户的交易记录
    const userTrades = all.filter(t => t.userId === userId)
    return userTrades.slice(0, limit)
  } catch (error) {
    console.error('❌ 获取交易记录失败:', error)
    return []
  }
}

/**
 * ✅ 清空所有 IndexedDB 数据
 */
export const clearAllData = async () => {
  try {
    const db = await getDB()
    
    // 清空消息
    await db.clear(STORE_NAME)
    console.log('✅ 已清空 messages')
    
    // 清空红包
    await db.clear(REDPACKET_STORE_NAME)
    console.log('✅ 已清空 redPackets')
    
    // 清空余额变动
    await db.clear(BALANCE_STORE_NAME)
    console.log('✅ 已清空 balanceChanges')
    
    // 清空交易记录
    await db.clear(TRADE_STORE_NAME)
    console.log('✅ 已清空 tradeRecords')
    
    console.log('✅ IndexedDB 所有数据已清空')
  } catch (error) {
    console.error('❌ 清空数据失败:', error)
  }
}

/**
 * 🆕 批量保存交易记录
 * @param {Array} trades - 交易记录数组
 */
export const saveTradeRecords = async (trades) => {
  try {
    const db = await getDB()
    const tx = db.transaction(TRADE_STORE_NAME, 'readwrite')
    
    for (const trade of trades) {
      tx.store.put(trade)
    }
    
    await tx.done
    console.log(`✅ 已保存 ${trades.length} 条交易记录`)
  } catch (error) {
    console.error('❌ 批量保存交易记录失败:', error)
  }
}

/**
 * 🆕 获取指定币种的交易记录
 * @param {number} coinId - 币种数字ID（1-5）
 * @param {number} limit - 限制数量
 * @returns {Array} 交易记录数组
 */
export const getTradesByCoinId = async (coinId, limit = 500) => {
  try {
    const db = await getDB()
    const index = db.transaction(TRADE_STORE_NAME, 'readonly').objectStore(TRADE_STORE_NAME).index('coinId_timestamp')
    
    // 查询指定币种的所有交易，按时间排序
    const all = await index.getAll(IDBKeyRange.bound([coinId, 0], [coinId, Number.MAX_SAFE_INTEGER]))
    
    // 按时间戳排序（最新的在前）
    all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    
    return all.slice(0, limit)
  } catch (error) {
    console.error('❌ 获取交易记录失败:', error)
    return []
  }
}

/**
 * 🆕 获取所有交易记录
 * @param {number} limit - 限制数量
 * @returns {Array} 交易记录数组
 */
export const getAllTrades = async (limit = 1000) => {
  try {
    const db = await getDB()
    const all = await db.getAllFromIndex(TRADE_STORE_NAME, 'timestamp')
    
    // 按时间戳排序（最新的在前）
    all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    
    return all.slice(0, limit)
  } catch (error) {
    console.error('❌ 获取所有交易记录失败:', error)
    return []
  }
}

