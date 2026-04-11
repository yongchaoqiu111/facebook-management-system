# IndexedDB 聊天存储 - 简化使用指南

## 🚀 快速开始

### 1. 导入方法

```javascript
import {
  saveMessage,      // 保存单条消息
  saveMessages,     // 批量保存消息
  getMessagesByGroup, // 获取群组消息
  clearGroupMessages, // 清空群组消息
  getMessageCount   // 获取消息数量
} from '@/utils/chatStorage'
```

---

## 📝 常用方法

### ✅ 保存消息

#### 保存单条消息
```javascript
// 简单调用
await saveMessage({
  id: 'msg_123',
  type: 'text',
  content: 'Hello',
  time: '10:30',
  timestamp: '2026-04-08T10:30:00.000Z',
  senderId: 'user_456',
  groupId: 'group_789',
  isSelf: false
})
```

#### 批量保存消息
```javascript
const messages = [
  { id: 'msg_1', content: '消息1', ... },
  { id: 'msg_2', content: '消息2', ... },
  { id: 'msg_3', content: '消息3', ... }
]

await saveMessages(messages)
```

---

### ✅ 获取消息

#### 获取群组消息
```javascript
// 获取最新的 500 条消息
const messages = await getMessagesByGroup('group_789', 500)

// 获取所有消息（不限制数量）
const allMessages = await getMessagesByGroup('group_789', Infinity)

console.log(`获取了 ${messages.length} 条消息`)
```

**返回格式：**
```javascript
[
  {
    id: 'msg_123',
    type: 'text',
    content: 'Hello',
    time: '10:30',
    timestamp: '2026-04-08T10:30:00.000Z',
    senderId: 'user_456',
    groupId: 'group_789',
    isSelf: false
  },
  // ... 更多消息
]
```

---

### ✅ 清空消息

#### 清空指定群组的所有消息
```javascript
await clearGroupMessages('group_789')
console.log('聊天记录已清空')
```

---

### ✅ 统计消息

#### 获取消息数量
```javascript
// 获取指定群组的消息数量
const count = await getMessageCount('group_789')
console.log(`共有 ${count} 条消息`)

// 获取所有群组的总消息数
const totalCount = await getMessageCount()
console.log(`所有群组共有 ${totalCount} 条消息`)
```

---

## 💡 实际使用示例

### 示例 1：收到新消息时保存

```javascript
// Socket 监听
socket.on('groupMessage', async (data) => {
  // 格式化消息
  const message = {
    id: data._id,
    type: 'text',
    content: data.content,
    time: getCurrentTime(),
    timestamp: data.createdAt,
    senderId: data.sender._id,
    groupId: data.groupId,
    isSelf: data.sender._id === currentUserId
  }
  
  // 添加到本地数组
  chatMessages.value.push(message)
  
  // 保存到 IndexedDB
  await saveMessage(message)
})
```

---

### 示例 2：页面加载时读取历史

```javascript
onMounted(async () => {
  // 从 IndexedDB 加载历史消息
  const historyMessages = await getMessagesByGroup(LIUHE_GROUP_ID, 500)
  
  if (historyMessages.length > 0) {
    chatMessages.value = historyMessages
    console.log(`加载了 ${historyMessages.length} 条历史消息`)
  }
})
```

---

### 示例 3：发送消息时保存

```javascript
const sendMessage = async (content) => {
  const message = {
    id: `msg_${Date.now()}`,
    type: 'text',
    content: content,
    time: getCurrentTime(),
    timestamp: new Date().toISOString(),
    senderId: currentUserId,
    groupId: LIUHE_GROUP_ID,
    isSelf: true
  }
  
  // 立即显示
  chatMessages.value.push(message)
  
  // 保存到 IndexedDB
  await saveMessage(message)
  
  // 通过 Socket 发送
  socket.emit('chat:groupMessage', {
    groupId: LIUHE_GROUP_ID,
    content: content
  })
}
```

---

### 示例 4：清空聊天记录

```javascript
const handleClearChat = async () => {
  if (!confirm('确定要清空聊天记录吗？')) return
  
  try {
    // 清空 IndexedDB
    await clearGroupMessages(LIUHE_GROUP_ID)
    
    // 清空本地数组
    chatMessages.value = []
    
    showToast('聊天记录已清空')
  } catch (error) {
    console.error('清空失败:', error)
    showToast('清空失败')
  }
}
```

---

## 🔧 高级用法

### 导出所有消息（备份）

```javascript
import { exportAllMessages } from '@/utils/chatStorage'

const backup = async () => {
  const allMessages = await exportAllMessages()
  
  // 下载为 JSON 文件
  const blob = new Blob([JSON.stringify(allMessages)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `chat-backup-${Date.now()}.json`
  a.click()
}
```

---

### 导入消息（恢复）

```javascript
import { importMessages } from '@/utils/chatStorage'

const restore = async (file) => {
  const text = await file.text()
  const messages = JSON.parse(text)
  
  await importMessages(messages)
  console.log(`成功恢复 ${messages.length} 条消息`)
}
```

---

### 获取数据库信息

```javascript
import { getDatabaseInfo } from '@/utils/chatStorage'

const info = await getDatabaseInfo()
console.log(info)
// {
//   dbName: 'ChatMessagesDB',
//   version: 1,
//   totalMessages: 1234,
//   stores: ['messages']
// }
```

---

## ⚠️ 注意事项

### 1. 所有方法都是异步的
```javascript
// ❌ 错误：忘记 await
const messages = getMessagesByGroup(groupId)  // 返回 Promise

// ✅ 正确：使用 await
const messages = await getMessagesByGroup(groupId)
```

### 2. 消息 ID 必须唯一
```javascript
// ✅ 推荐：使用时间戳 + 随机数
const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
```

### 3. 批量操作性能更好
```javascript
// ❌ 慢：循环保存
for (const msg of messages) {
  await saveMessage(msg)
}

// ✅ 快：批量保存
await saveMessages(messages)
```

---

## 🎯 完整示例：LiuHe.vue 中的使用

```javascript
import {
  saveMessage,
  saveMessages,
  getMessagesByGroup,
  clearGroupMessages
} from '@/utils/chatStorage'

// 1. 加载历史
const loadHistory = async () => {
  const messages = await getMessagesByGroup(LIUHE_GROUP_ID, 500)
  chatMessages.value = messages
}

// 2. 收到新消息
socket.on('groupMessage', async (data) => {
  const message = formatMessage(data)
  chatMessages.value.push(message)
  await saveMessage(message)
})

// 3. 发送消息
const sendMessage = async (content) => {
  const message = createMessage(content)
  chatMessages.value.push(message)
  await saveMessage(message)
  socket.emit('chat:groupMessage', { content })
}

// 4. 清空记录
const clearChat = async () => {
  await clearGroupMessages(LIUHE_GROUP_ID)
  chatMessages.value = []
}
```

---

## 📊 性能对比

| 操作 | LocalStorage | IndexedDB |
|------|-------------|-----------|
| 保存 100 条消息 | ~50ms | ~10ms |
| 查询 500 条消息 | ~30ms | ~5ms |
| 容量限制 | 5-10MB | 无限制 |
| 阻塞 UI | ✅ 是 | ❌ 否 |

---

## 🔍 调试技巧

### 查看浏览器中的 IndexedDB

**Chrome/Edge:**
1. F12 打开开发者工具
2. Application → IndexedDB → ChatMessagesDB
3. 查看 messages 表

**Firefox:**
1. F12 打开开发者工具
2. Storage → IndexedDB → ChatMessagesDB

---

## ❓ 常见问题

### Q: 为什么保存失败？
A: 检查消息是否有唯一的 `id` 字段。

### Q: 如何删除单条消息？
A: 使用 `deleteMessage(messageId)` 方法。

### Q: 数据会丢失吗？
A: IndexedDB 数据永久保存，除非用户清除浏览器数据。

### Q: 支持离线使用吗？
A: ✅ 完全支持，IndexedDB 是本地存储。

---

**最后更新**: 2026-04-08
