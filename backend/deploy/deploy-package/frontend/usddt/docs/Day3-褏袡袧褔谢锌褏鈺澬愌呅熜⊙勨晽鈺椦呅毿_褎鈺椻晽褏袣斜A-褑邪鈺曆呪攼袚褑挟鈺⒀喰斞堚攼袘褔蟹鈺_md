# 任务 A：核心架构迁移

**负责人**：开发人员 A（资深前端）  
**预计工时**：4-5 小时  
**难度**：⭐⭐⭐  
**依赖**：后端 Phase 1 完成（POST /api/chats/messages 可用）

---

## 📋 任务目标

将接龙群组件从"本地管理消息"迁移到"统一消息中心"，实现：
- ✅ 使用 `useMessageCenter` 获取消息
- ✅ 使用 `sendMessage` 发送消息
- ✅ 使用 `loadHistory` 加载历史
- ✅ 移除本地 Socket 监听

---

## 📁 需要修改的文件

### 1. `src/views/ChainGroupChat/composables/useChainGroupChat.js`
**修改量**：约 50-80 行  
**难度**：⭐⭐⭐

### 2. `src/views/ChainGroupChat/index.vue`
**修改量**：约 20-30 行  
**难度**：⭐⭐

---

## 🔧 实施步骤

### Step 1: 引入 useMessageCenter（30 分钟）

**文件**：`src/views/ChainGroupChat/index.vue`

```javascript
// 在 <script setup> 中添加：
import { useMessageCenter } from '@/composables/useMessageCenter'

const { 
  getMessages, 
  sendMessage: sendMsg, 
  loadHistory,
  initSocketListeners 
} = useMessageCenter()
```

**检查点**：
- [ ] 导入成功，无报错
- [ ] 可以在控制台打印 `getMessages` 函数

---

### Step 2: 替换 messages 数组（1 小时）

**文件**：`src/views/ChainGroupChat/composables/useChainGroupChat.js`

#### 修改前：
```javascript
const messages = ref([])

// 在 onGroupMessage 中：
messages.value.push(message)
```

#### 修改后：
```javascript
// ❌ 删除这行
// const messages = ref([])

// ✅ 添加 computed
const messages = computed(() => {
  return getMessages(`group_${chatId}`)
})
```

**注意**：
- `messages` 从 `ref` 改为 `computed`
- 不再手动 `push`，由消息中心管理
- 保持响应式（Vue 自动追踪）

**检查点**：
- [ ] 页面打开时，`messages.value` 是数组
- [ ] 可以正常遍历 `v-for="msg in messages"`

---

### Step 3: 替换 sendMessage 调用（1 小时）

**文件**：`src/views/ChainGroupChat/composables/useChainGroupChat.js`

#### 修改前：
```javascript
const sendMessage = async () => {
  // ... 构建 message 对象
  
  sendGroupMessage({
    groupId: chatId,
    content: content,
    type: 'text',
    clientMsgId: clientMsgId,
    senderId: currentUserId
  })
  
  messages.value.push(message)
  saveChatToLocalStorage(chatId, messages.value)
}
```

#### 修改后：
```javascript
const sendMessage = async () => {
  if (!messageInput.value.trim()) return
  
  try {
    // ✅ 调用消息中心的 sendMessage
    await sendMsg(`group_${chatId}`, {
      content: messageInput.value.trim(),
      type: 'text',
      clientMsgId: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    })
    
    // ✅ 清空输入框
    messageInput.value = ''
    
  } catch (error) {
    console.error('发送消息失败:', error)
    alert('发送失败，请重试')
  }
}
```

**关键点**：
- 不再手动构建完整的 message 对象
- 不再手动 `push` 到数组
- 不再手动保存到 LocalStorage（消息中心自动处理）
- 只传递必要参数：`content`, `type`, `clientMsgId`

**检查点**：
- [ ] 点击发送按钮，消息能发送
- [ ] 控制台无报错
- [ ] 消息显示在聊天列表

---

### Step 4: 替换 loadHistory 调用（1 小时）

**文件**：`src/views/ChainGroupChat/composables/useChainGroupChat.js`

#### 修改前：
```javascript
const loadChatHistory = async () => {
  const localMessages = loadChatFromLocalStorage(chatId)
  if (localMessages && localMessages.length > 0) {
    messages.value = localMessages
    return
  }
  // TODO: 从后端加载
}
```

#### 修改后：
```javascript
const loadChatHistory = async () => {
  // ✅ 调用消息中心的 loadHistory
  await loadHistory(`group_${chatId}`)
  console.log('历史消息加载完成')
}
```

**关键点**：
- 不再手动读取 LocalStorage
- 不再手动赋值给 `messages.value`
- 消息中心自动处理三层加载策略（LocalStorage → HTTP → WSS）

**检查点**：
- [ ] 打开聊天页，历史消息显示
- [ ] 刷新页面，消息不丢失
- [ ] 控制台看到 "历史消息加载完成"

---

### Step 5: 移除本地 Socket 监听（30 分钟）

**文件**：`src/views/ChainGroupChat/composables/useChainGroupChat.js`

#### 删除以下代码：
```javascript
// ❌ 删除整个 onGroupMessage 监听器
onGroupMessage((data) => {
  console.log('📨 收到群消息:', data)
  // ... 大量代码
})

// ❌ 删除 onGroupRedPacket 监听器
onGroupRedPacket((data) => {
  console.log('🧧 收到群红包:', data)
  // ... 大量代码
})
```

**原因**：
- 消息中心已经全局监听了这些事件
- 不需要在每个组件中重复监听
- 避免消息重复处理

**检查点**：
- [ ] 删除后，页面仍能接收消息
- [ ] 控制台无 "onGroupMessage is not defined" 错误

---

### Step 6: 初始化消息中心（30 分钟）

**文件**：`src/views/ChainGroupChat/index.vue`

```javascript
onMounted(() => {
  // ✅ 初始化 Socket 监听（全局只一次）
  initSocketListeners()
  
  // ✅ 加载历史消息
  loadHistory(`group_${chatId}`)
  
  // ✅ 加入群组房间
  joinGroup(chatId)
})

onUnmounted(() => {
  // ✅ 离开群组房间
  leaveGroup(chatId)
})
```

**注意**：
- `initSocketListeners()` 只需调用一次（消息中心内部会判断）
- `joinGroup` 和 `leaveGroup` 从 `@/socket` 导入

**检查点**：
- [ ] 页面加载时，控制台看到 "✅ Socket 监听器初始化完成"
- [ ] 可以看到 "✅ Joined group: xxx"

---

## ✅ 验收标准

### 功能测试
- [ ] **发送消息**：输入文字，点击发送，消息显示在列表中
- [ ] **接收消息**：另一个用户发送消息，实时显示
- [ ] **历史消息**：刷新页面，历史消息不丢失
- [ ] **多用户测试**：3 个用户同时聊天，消息不混乱

### 代码质量
- [ ] 无 ESLint 错误
- [ ] 无控制台报错
- [ ] 代码注释清晰
- [ ] 删除了所有无用代码

### 性能测试
- [ ] 发送消息延迟 < 100ms
- [ ] 页面渲染流畅（无卡顿）
- [ ] 内存占用正常（打开 Chrome DevTools 查看）

---

## 🐛 常见问题

### Q1: 消息不显示？
**检查**：
1. 控制台是否有报错？
2. `messages.value` 是否为空数组？
3. Socket 是否连接成功？

**解决**：
```javascript
console.log('messages:', messages.value)
console.log('socket connected:', getSocket().connected)
```

### Q2: 发送消息失败？
**检查**：
1. 后端接口是否可用？
2. Token 是否有效？
3. 用户是否在群组中？

**解决**：
```javascript
// 查看 Network 面板的 POST 请求
// 检查返回的状态码和错误信息
```

### Q3: 历史消息加载失败？
**检查**：
1. LocalStorage 中是否有数据？
2. HTTP 请求是否成功？

**解决**：
```javascript
console.log('localStorage:', localStorage.getItem('chat_group_xxx'))
```

---

## 📞 需要帮助？

遇到问题立即联系：
- **AI 助手**：代码审查 + 问题解决
- **后端团队**：接口问题
- **团队成员**：协作调试

**不要卡住超过 30 分钟！**
