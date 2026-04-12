# 消息系统 IndexedDB 重构方案

## 📋 概述

基于后端架构调整，聊天消息完全由前端 IndexedDB 管理，后端仅通过 WSS 实时推送，不存储聊天消息到 MongoDB。

---

## 🎯 核心架构

### 数据存储策略

```
┌─────────────────────────────────────────┐
│          前端 (IndexedDB)                │
├─────────────────────────────────────────┤
│ ✅ 聊天消息（私聊、群聊）                 │
│ ✅ 红包消息（临时展示）                   │
│ ✅ 系统消息                              │
└─────────────────────────────────────────┘
              ↕ WSS 实时推送
┌─────────────────────────────────────────┐
│          后端 (MongoDB)                  │
├─────────────────────────────────────────┤
│ ✅ 红包数据（永久存储）                   │
│ ✅ 资金流水                              │
│ ✅ 用户余额                              │
│ ✅ 投注记录                              │
│ ❌ 聊天消息（不存储）                     │
└─────────────────────────────────────────┘
```

---

## 🗄️ IndexedDB 数据结构设计

### 1. 数据库配置

```javascript
const DB_NAME = 'ChatMessagesDB'
const DB_VERSION = 2
const STORE_NAME = 'messages'           // 消息存储
const REDPACKET_STORE_NAME = 'redPackets'  // 红包明细存储
```

### 2. 消息对象结构（messages store）

#### 文本消息
```javascript
{
  id: 'msg_1775638200628_abc123',     // 唯一ID（主键）
  type: 'text',                        // 消息类型
  chatId: 'group_789',                 // 聊天会话ID（群聊=groupId，私聊=private_userId）
  content: 'Hello World',              // 消息内容
  time: '10:30',                       // 显示时间（HH:mm）
  timestamp: '2026-04-08T10:30:00.000Z', // 完整时间戳（用于排序）
  senderId: 'user_456',                // 发送者ID
  senderName: '张三',                   // 发送者名称（可选）
  groupId: 'group_789',                // 群组ID（群聊）
  receiverId: 'user_789',              // 接收者ID（私聊）
  isSelf: false,                       // 是否是自己发的
  status: 'sent'                       // 状态：sending | sent | failed
}
```

#### 红包消息（摘要）
```javascript
{
  id: 'rp_msg_1775638200628',         // 消息ID（主键）
  type: 'redPacket',                   // 消息类型
  chatId: 'group_789',                 // 聊天会话ID
  redPacketId: 'rp_abcdef123',         // 🔗 红包序列号（关联红包明细）
  redPacketType: 'liuhe',              // 红包类型
  amount: 490,                         // 红包金额
  count: 10,                           // 红包个数
  message: '恭喜发财，大吉大利',        // 红包祝福语
  time: '10:30',                       // 显示时间
  timestamp: '2026-04-08T10:30:00.000Z', // 完整时间戳
  opened: false,                       // 是否已领取
  senderId: 'user_456',                // 发送者ID
  groupId: 'group_789',                // 群组ID
  isSelf: false,                       // 是否是自己发的
  status: 'active'                     // 状态：active | expired | finished
}
```

#### 系统消息
```javascript
{
  id: 'sys_1775638200628',            // 唯一ID
  type: 'system',                      // 消息类型
  chatId: 'group_789',                 // 聊天会话ID
  content: '用户A 加入了群聊',          // 系统提示内容
  time: '10:30',                       // 显示时间
  timestamp: '2026-04-08T10:30:00.000Z', // 完整时间戳
  groupId: 'group_789',                // 群组ID
  isSelf: false                        // 系统消息统一为 false
}
```

### 3. 红包明细对象结构（redPackets store）

```javascript
{
  redPacketId: 'rp_abcdef123',         // 红包序列号（主键）
  chatId: 'group_789',                 // 聊天会话ID
  redPacketType: 'liuhe',              // 红包类型
  totalAmount: 490,                    // 总金额
  totalCount: 10,                      // 总个数
  remainingAmount: 30,                 // 剩余金额
  remainingCount: 3,                   // 剩余个数
  claimedCount: 7,                     // 已领取个数
  message: '恭喜发财，大吉大利',        // 祝福语
  senderId: 'user_456',                // 发送者ID
  senderName: '张三',                   // 发送者名称
  groupId: 'group_789',                // 群组ID
  status: 'active',                    // 状态：active | finished | expired
  claims: [                            // 领取明细
    {
      userId: 'user_001',
      userName: '李四',
      amount: 15,
      claimedAt: '2026-04-08T10:31:00.000Z'
    },
    {
      userId: 'user_002',
      userName: '王五',
      amount: 20,
      claimedAt: '2026-04-08T10:32:00.000Z'
    }
    // ... 更多领取记录
  ],
  createdAt: '2026-04-08T10:30:00.000Z', // 创建时间
  updatedAt: '2026-04-08T10:35:00.000Z'  // 更新时间
}
```

### 4. 索引设计

#### messages store 索引
```javascript
// 主键
keyPath: 'id'

// 索引
- chatId: 按聊天会话查询
- groupId: 按群组查询（向后兼容）
- timestamp: 按时间查询
- type: 按类型查询
- chatId_timestamp: 复合索引（按会话+时间查询）
```

#### redPackets store 索引
```javascript
// 主键
keyPath: 'redPacketId'

// 索引
- chatId: 按聊天会话查询
- status: 按状态查询
- createdAt: 按创建时间查询
```

---

## 🔧 API 封装设计

### 核心方法

#### 消息操作
```javascript
// 1. 保存消息
await saveMessage(message)              // 单条
await saveMessages(messages)            // 批量

// 2. 获取消息
await getMessagesByChatId(chatId, limit) // 按会话
await getMessageById(messageId)          // 按ID

// 3. 删除消息
await deleteMessage(messageId)           // 单条
await clearGroupMessages(groupId)        // 清空群组

// 4. 统计
await getMessageCount(chatId)            // 消息数量
```

#### 红包操作
```javascript
// 1. 保存红包明细
await saveRedPacketDetail(redPacketData)

// 2. 获取红包明细
await getRedPacketDetail(redPacketId)

// 3. 更新红包状态
await updateRedPacketStatus(redPacketId, status)

// 4. 添加领取记录
await addClaimRecord(redPacketId, claimData)

// 5. 获取会话的所有红包
await getRedPacketsByChatId(chatId)
```

#### 工具方法
```javascript
// 统一消息解析器
const message = parseMessage(data, currentUserId)

// 导出备份
await exportAllMessages()

// 导入恢复
await importMessages(messages)

// 数据库信息
await getDatabaseInfo()
```

---

## 📱 前端使用流程

### 1. 初始化（App.vue）

```javascript
import { initDB } from '@/utils/chatStorage'

// 应用启动时初始化
await initDB()
console.log('✅ IndexedDB 初始化成功')
```

### 2. 全局消息监听（App.vue）

```javascript
onMounted(async () => {
  initSocket()
  const socket = getSocket()
  const currentUserId = localStorage.getItem('userId')
  
  // ✅ 全局监听群聊消息
  socket.on('groupMessage', async (data) => {
    // 使用统一解析器
    const message = parseMessage(data, currentUserId)
    
    // 添加到消息队列
    addToQueue(message.chatId, message)
  })
  
  // ✅ 全局监听群红包
  socket.on('groupRedPacket', async (data) => {
    const message = parseMessage(data, currentUserId)
    
    // 添加到消息队列
    addToQueue(message.chatId, message)
    
    // 保存红包明细（如果后端返回）
    if (data.redPacketDetail) {
      await saveRedPacketDetail(data.redPacketDetail)
    }
  })
})
```

### 3. 加载历史消息（LiuHe.vue）

```javascript
onMounted(async () => {
  // 从 IndexedDB 加载
  const messages = await getMessagesByChatId(LIUHE_GROUP_ID, 500)
  chatMessages.value = messages
  
  // 加入 Socket 房间
  joinGroup(LIUHE_GROUP_ID)
})
```

### 4. 打开红包弹窗

```javascript
const openRedPacket = async (redPacketId) => {
  // 从 IndexedDB 获取红包明细
  const detail = await getRedPacketDetail(redPacketId)
  
  if (detail) {
    // 显示红包详情
    showRedPacketModal(detail)
  } else {
    // 从后端 API 获取
    const response = await axios.get(`/api/redpackets/${redPacketId}`)
    const detail = response.data.data
    
    // 保存到 IndexedDB
    await saveRedPacketDetail(detail)
    
    showRedPacketModal(detail)
  }
}
```

---

## 💡 红包存储流程

### 场景 1：收到红包消息

```javascript
// Socket 推送红包
socket.on('groupRedPacket', async (data) => {
  // 1. 解析为聊天消息（摘要）
  const message = parseMessage(data, currentUserId)
  
  // 2. 保存到 messages store
  await saveMessage(message)
  
  // 3. 如果包含红包明细，保存到 redPackets store
  if (data.detail) {
    await saveRedPacketDetail(data.detail)
  }
})
```

### 场景 2：领取红包

```javascript
const claimRedPacket = async (redPacketId) => {
  // 调用后端 API 领取
  const response = await axios.post('/api/redpackets/claim', {
    redPacketId,
    userId: currentUserId
  })
  
  const result = response.data.data
  
  // 更新本地红包明细
  const detail = await getRedPacketDetail(redPacketId)
  if (detail) {
    detail.claims.push({
      userId: currentUserId,
      userName: currentUserName,
      amount: result.amount,
      claimedAt: new Date().toISOString()
    })
    detail.remainingAmount -= result.amount
    detail.remainingCount -= 1
    detail.claimedCount += 1
    
    await saveRedPacketDetail(detail)
  }
  
  return result
}
```

---

## 🎯 消息队列机制

### 队列结构

```javascript
// 按 chatId 分类的消息队列
const messageQueue = {
  'group_789': [msg1, msg2, ...],      // 群聊消息
  'private_user123': [msg3, msg4, ...], // 私聊消息
  // ...
}
```

### 批量保存策略

```javascript
const MAX_QUEUE_SIZE = 50  // 每个队列最大长度
const SAVE_INTERVAL = 5000 // 5秒保存一次

// 定时保存
setInterval(() => {
  flushAllQueues()
}, SAVE_INTERVAL)

// 队列满时立即保存
if (queue.length >= MAX_QUEUE_SIZE) {
  flushQueue(chatId)
}
```

---

## 📊 性能指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 首屏加载时间 | < 50ms | IndexedDB 读取 |
| 消息保存时间 | < 10ms | 异步写入 |
| 查询 500 条消息 | < 20ms | 索引查询 |
| 内存占用 | < 100MB | 10000条消息以内 |
| 存储空间 | 无限制 | 取决于磁盘 |

---

## 🔍 调试技巧

### 查看 IndexedDB

**Chrome/Edge:**
1. F12 → Application → IndexedDB → ChatMessagesDB
2. 查看 messages 和 redPackets 表
3. 可以手动编辑、删除数据

**Firefox:**
1. F12 → Storage → IndexedDB → ChatMessagesDB

### 常用调试命令

```javascript
// 查看数据库信息
const info = await getDatabaseInfo()
console.log(info)

// 查看消息数量
const count = await getMessageCount('group_789')
console.log(`共有 ${count} 条消息`)

// 查看红包数量
const redPackets = await getRedPacketsByChatId('group_789')
console.log(`共有 ${redPackets.length} 个红包`)
```

---

## ❓ 常见问题

### Q1: 为什么不用 LocalStorage？
A: LocalStorage 有 5-10MB 限制，且是同步操作会阻塞 UI。IndexedDB 无容量限制，异步操作性能更好。

### Q2: 红包明细为什么不和消息一起存储？
A: 
- 分离存储更清晰：消息是聊天记录，红包明细是业务数据
- 红包明细可能很大（领取记录多）
- 便于单独查询和更新红包状态
- 符合数据库设计规范

### Q3: WSS 断开期间的消息怎么办？
A: 后端不存储聊天消息，所以断开期间的消息会丢失。这是设计如此，用户需要理解这一点。

### Q4: 如何备份聊天记录？
A: 使用 `exportAllMessages()` 导出为 JSON 文件，需要时使用 `importMessages()` 恢复。

### Q5: 支持多标签页吗？
A: 支持。IndexedDB 是共享的，多个标签页可以同时读写。

---

## 📝 总结

### 优势
- ✅ 大容量存储（无限制）
- ✅ 高性能（异步操作）
- ✅ 离线可用
- ✅ 支持复杂查询
- ✅ 红包明细独立存储，结构清晰

### 劣势
- ⚠️ WSS 断开期间消息丢失
- ⚠️ 需要用户手动备份
- ⚠️ 清除浏览器数据会丢失

### 适用场景
- ✅ 即时通讯应用
- ✅ 大量聊天记录
- ✅ 需要离线访问
- ✅ 红包等复杂业务数据

---

**最后更新**: 2026-04-08  
**维护者**: AI Assistant  
**版本**: v2.0 (新增红包明细存储)
