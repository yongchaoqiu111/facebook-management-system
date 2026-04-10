# IndexedDB 聊天消息存储方案

## 📋 概述

本项目已从 LocalStorage 迁移到 **IndexedDB**，以支持大量聊天消息的存储。

### 优势对比

| 特性 | LocalStorage | IndexedDB |
|------|-------------|-----------|
| 容量限制 | 5-10MB | 无限制（取决于磁盘） |
| 性能 | 同步，阻塞UI | 异步，不阻塞UI |
| 查询能力 | 无 | 支持索引和复杂查询 |
| 数据类型 | 仅字符串 | 任意类型（对象、数组等） |
| 事务支持 | 无 | 完整事务支持 |

---

## 🚀 快速开始

### 1. 安装依赖

```bash
cnpm install idb
```

### 2. 导入模块

```javascript
import {
  saveMessage,
  saveMessages,
  getMessagesByGroup,
  cleanupOldMessages,
  getMessageCount
} from '@/utils/chatStorage'
```

### 3. 基本使用

#### 保存单条消息
```javascript
await saveMessage({
  id: 'msg_123',
  type: 'text',
  content: 'Hello',
  timestamp: new Date().toISOString(),
  senderId: 'user_456',
  groupId: 'group_789',
  isSelf: false
})
```

#### 批量保存消息
```javascript
const messages = [...] // 消息数组
await saveMessages(messages)
```

#### 获取群组消息
```javascript
// 获取最新的500条消息（按时间正序：旧→新）
const messages = await getMessagesByGroup('group_789', 500)
```

#### 清理旧消息
```javascript
// 保留最新500条，删除更旧的
await cleanupOldMessages('group_789', 500)
```

---

## 📊 API 参考

### `saveMessage(message)`
保存单条消息到 IndexedDB

**参数：**
- `message` (Object): 消息对象

**示例：**
```javascript
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

---

### `saveMessages(messages)`
批量保存消息

**参数：**
- `messages` (Array): 消息数组

**示例：**
```javascript
const messages = [
  { id: 'msg_1', ... },
  { id: 'msg_2', ... }
]
await saveMessages(messages)
```

---

### `getMessagesByGroup(groupId, limit)`
获取指定群组的最新消息

**参数：**
- `groupId` (String): 群组ID
- `limit` (Number): 限制数量，默认500

**返回：**
- Array: 消息数组（按时间正序：旧→新）

**示例：**
```javascript
const messages = await getMessagesByGroup('group_789', 500)
console.log(`获取了 ${messages.length} 条消息`)
```

---

### `cleanupOldMessages(groupId, keepCount)`
清理旧消息，保留最新的 N 条

**参数：**
- `groupId` (String): 群组ID
- `keepCount` (Number): 保留数量，默认500

**示例：**
```javascript
await cleanupOldMessages('group_789', 500)
```

---

### `getMessageCount(groupId)`
获取消息总数

**参数：**
- `groupId` (String): 群组ID（可选，不传则统计所有群组）

**返回：**
- Number: 消息数量

**示例：**
```javascript
const count = await getMessageCount('group_789')
console.log(`共有 ${count} 条消息`)
```

---

### `deleteMessage(messageId)`
删除指定消息

**参数：**
- `messageId` (String): 消息ID

**示例：**
```javascript
await deleteMessage('msg_123')
```

---

### `clearGroupMessages(groupId)`
清空指定群组的所有消息

**参数：**
- `groupId` (String): 群组ID

**示例：**
```javascript
await clearGroupMessages('group_789')
```

---

### `messageExists(messageId)`
检查消息是否存在

**参数：**
- `messageId` (String): 消息ID

**返回：**
- Boolean: 是否存在

**示例：**
```javascript
const exists = await messageExists('msg_123')
if (exists) {
  console.log('消息已存在')
}
```

---

### `exportAllMessages()`
导出所有消息（用于备份）

**返回：**
- Array: 所有消息

**示例：**
```javascript
const allMessages = await exportAllMessages()
localStorage.setItem('backup', JSON.stringify(allMessages))
```

---

### `importMessages(messages)`
导入消息（用于恢复）

**参数：**
- `messages` (Array): 消息数组

**示例：**
```javascript
const backup = JSON.parse(localStorage.getItem('backup'))
await importMessages(backup)
```

---

### `getDatabaseInfo()`
获取数据库信息

**返回：**
- Object: 数据库信息

**示例：**
```javascript
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

## 🔧 在 LiuHe.vue 中的使用

### 加载聊天记录
```javascript
const loadChatHistory = async () => {
  // 从 IndexedDB 加载
  const storedMessages = await loadChatFromStorage(LIUHE_GROUP_ID)
  
  if (storedMessages && storedMessages.length > 0) {
    chatMessages.value = storedMessages
  } else {
    // 从后端加载并保存到 IndexedDB
    const response = await axios.get(...)
    chatMessages.value = response.data.data
    
    // 保存到 IndexedDB
    await saveChatToStorage(LIUHE_GROUP_ID, chatMessages.value)
  }
}
```

### 收到新消息时保存
```javascript
socket.on('groupMessage', (data) => {
  const message = { ... }
  chatMessages.value.push(message)
  
  // 保存到 IndexedDB
  saveChatToStorage(LIUHE_GROUP_ID, chatMessages.value)
})
```

---

## 🧪 测试

运行测试脚本：

```bash
node test-indexeddb.js
```

测试内容包括：
1. ✅ 数据库初始化
2. ✅ 单条消息保存
3. ✅ 批量消息保存
4. ✅ 消息查询
5. ✅ 消息计数
6. ✅ 旧消息清理
7. ✅ 数据库信息查询

---

## 📝 注意事项

### 1. 消息去重
IndexedDB 使用 `id` 作为主键，重复的消息会自动覆盖。

### 2. 自动清理
每次保存消息后，会自动清理超过 500 条的旧消息，防止无限增长。

### 3. 异步操作
所有操作都是异步的，需要使用 `await` 或 `.then()`。

### 4. 浏览器兼容性
IndexedDB 支持所有现代浏览器（Chrome 24+, Firefox 16+, Safari 8+）。

### 5. 数据持久化
IndexedDB 数据会永久保存，除非用户手动清除浏览器数据。

---

## 🎯 最佳实践

### 1. 批量操作优于单个操作
```javascript
// ❌ 不好
for (const msg of messages) {
  await saveMessage(msg)
}

// ✅ 好
await saveMessages(messages)
```

### 2. 定期清理旧消息
```javascript
// 每次保存后自动清理
await saveChatToStorage(groupId, messages)
```

### 3. 错误处理
```javascript
try {
  await saveMessage(message)
} catch (error) {
  console.error('保存失败:', error)
  // 降级到 LocalStorage 或其他方案
}
```

### 4. 监控数据库大小
```javascript
const info = await getDatabaseInfo()
if (info.totalMessages > 10000) {
  console.warn('消息数量过多，建议清理')
}
```

---

## 🔍 调试技巧

### 查看浏览器中的 IndexedDB

**Chrome/Edge:**
1. 打开开发者工具 (F12)
2. 切换到 "Application" 标签
3. 左侧找到 "IndexedDB" → "ChatMessagesDB"
4. 查看 "messages" 对象存储

**Firefox:**
1. 打开开发者工具 (F12)
2. 切换到 "Storage" 标签
3. 找到 "IndexedDB" → "ChatMessagesDB"

---

## 📚 相关资源

- [idb 官方文档](https://github.com/jakearchibald/idb)
- [IndexedDB MDN 文档](https://developer.mozilla.org/zh-CN/docs/Web/API/IndexedDB_API)
- [Can I Use - IndexedDB](https://caniuse.com/indexeddb)

---

## ✅ 完成清单

- [x] 安装 `idb` 依赖
- [x] 创建 `chatStorage.js` 封装模块
- [x] 修改 `LiuHe.vue` 使用新的存储方式
- [x] 添加消息清理机制
- [x] 创建测试脚本
- [x] 编写使用文档

---

## 🔄 更新日志

### 2026-04-08 - 移除自动清理，改为手动清理

**变更内容：**
- ❌ 移除了自动清理旧消息的逻辑
- ✅ 添加了“清空聊天记录”按钮（点击头部 ⋮ 按钮）
- ✅ 用户可以自主决定是否清理聊天记录
- ✅ IndexedDB 容量无限制，可以保存所有历史消息

**原因：**
- IndexedDB 没有容量限制，不需要自动清理
- 用户可能希望保留完整的聊天历史
- 给用户更多控制权

**使用方法：**
1. 点击聊天头部右侧的 ⋮ 按钮
2. 选择“清空聊天记录”
3. 确认后清空所有消息

---

**最后更新**: 2026-04-08  
**维护者**: AI Assistant
