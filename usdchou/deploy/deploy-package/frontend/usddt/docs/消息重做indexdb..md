# 前端消息系统架构设计方案

## 📋 目录
- [1. 架构概述](#1-架构概述)
- [2. 核心设计原则](#2-核心设计原则)
- [3. 技术选型](#3-技术选型)
- [4. 数据流设计](#4-数据流设计)
- [5. 模块结构](#5-模块结构)
- [6. 接口规范](#6-接口规范)
- [7. 实施步骤](#7-实施步骤)

---

## 1. 架构概述

### 1.1 背景
当前前端存在多个独立的消息源（接龙群、私聊、六合等），导致：
- 消息重复监听
- 数据结构不统一
- 金额变动无法追踪
- 维护成本高

### 1.2 目标
构建**统一消息中心**，实现：
- ✅ 单一数据源（Single Source of Truth）
- ✅ WSS 实时推送 + HTTP 可靠传输
- ✅ 自动缓存加速（LocalStorage）
- ✅ 金额变动独立追踪
- ✅ 各组件只需订阅，无需管理数据

---

## 2. 核心设计原则

### 2.1 混合通信架构
```
┌─────────────────────────────────────┐
│         统一消息中心                 │
├─────────────────────────────────────┤
│                                     │
│  🚀 WSS (WebSocket)                │
│  ├── 新消息实时推送 (<50ms)         │
│  ├── 红包状态更新                    │
│  ├── 余额变动通知                    │
│  └── 在线状态同步                    │
│                                     │
│  🌐 HTTP REST API                   │
│  ├── GET 历史消息 (可靠性)          │
│  ├── POST 发送消息 (持久化)         │
│  ├── GET 余额查询                   │
│  └── POST 红包领取                  │
│                                     │
│  💾 LocalStorage 缓存               │
│  ├── 一级缓存 (0ms 响应)            │
│  ├── 离线可用                       │
│  └── 减少 90% HTTP 请求             │
└─────────────────────────────────────┘
```

### 2.2 三层数据获取策略
```
用户打开聊天页
    ↓
第1层: LocalStorage (最快，0ms)
    ↓ 未命中或过期
第2层: HTTP GET /api/chats/messages/:id (可靠，100-300ms)
    ↓ 持续监听
第3层: WSS 增量更新 (实时，<50ms)
```

### 2.3 双重发送策略
```
用户发送消息
    ↓
1. HTTP POST /api/chats/messages (确保存入数据库)
    ↓
2. WSS emit chat:groupMessage (实时推送给其他人)
    ↓
3. 乐观更新本地数组 (立即显示，无等待)
```

---

## 3. 技术选型

### 3.1 核心技术栈
- **Vue 3 Composition API**: `ref`, `reactive`, `computed`
- **Socket.IO Client**: 实时通信
- **Axios**: HTTP 请求
- **LocalStorage**: 本地缓存

### 3.2 为什么不使用 Pinia/Vuex？
- 当前项目规模适中，Composition API 足够
- 避免引入额外依赖
- 更灵活的模块化设计

---

## 4. 数据流设计

### 4.1 消息接收流程
```
WSS 消息到达
    ↓
useMessageCenter.handleIncomingMessage()
    ↓
1. getConversationId() - 确定对话ID
   - 群聊: group_${groupId}
   - 私聊: user_${userId}
    ↓
2. formatMessage() - 格式化为标准对象
   {
     id, type, content, time,
     senderId, isSelf, groupId,
     amount (红包), ...
   }
    ↓
3. addMessageToConversation() - 添加到数组
   - 使用 splice 保持 Vue 响应式
    ↓
4. recordBalanceChange() - 记录金额变动
   - 如果是红包/转账消息
    ↓
5. saveToStorage() - 持久化到 LocalStorage
    ↓
各组件通过 computed(() => getMessages(id)) 自动更新
```

### 4.2 消息发送流程
```
用户点击发送
    ↓
useMessageCenter.sendMessage(conversationId, data)
    ↓
1. HTTP POST 发送 (确保可靠性)
   - POST /api/chats/messages
   - 返回: { _id, createdAt, ... }
    ↓
2. WSS emit 推送 (实时性)
   - socket.emit('chat:groupMessage', data)
    ↓
3. 乐观更新本地
   - formatMessage() 格式化
   - addMessageToConversation() 添加
   - saveToStorage() 持久化
    ↓
UI 立即显示（无等待感）
```

### 4.3 金额变动追踪
```javascript
// 独立存储所有金额变动
balanceChanges = [
  {
    id: 'balance_123',
    type: 'redPacket:open',      // 变动类型
    amount: 20,                   // 正数增加，负数减少
    balance: 480,                 // 变动后余额
    reason: '领取红包',            // 原因
    timestamp: '2026-04-07T10:30:00Z',
    relatedId: 'redpacket_456'    // 关联的红包ID
  }
]

// 钱包页面直接使用
const transactions = computed(() => getBalanceHistory())
```

---

## 5. 模块结构

### 5.1 文件组织
```
src/
├── composables/
│   └── useMessageCenter.js      # 统一消息中心 ⭐核心
├── socket.js                     # Socket 封装（已有）
├── api.js                        # API 封装（已有）
├── utils/
│   └── storage.js               # LocalStorage 工具（已有）
└── views/
    ├── ChainGroupChat/
    │   ├── index.vue            # 接龙群主组件
    │   └── composables/
    │       └── useChainGroupChat.js  # 接龙群逻辑（需重构）
    ├── Chat.vue                 # 私聊组件（待迁移）
    └── Wallet.vue               # 钱包组件（使用余额变动）
```

### 5.2 useMessageCenter.js 核心 API

```javascript
export function useMessageCenter() {
  // 状态
  const conversations = reactive({})  // 所有对话消息
  const balanceChanges = ref([])      // 金额变动记录
  const userBalance = ref(0)          // 用户余额
  
  // 初始化
  const initSocketListeners()         // 注册全局 Socket 监听
  
  // 消息处理
  const handleIncomingMessage(type, data)  // 统一入口
  const getMessages(conversationId)        // 获取对话消息
  const sendMessage(conversationId, data)  // 发送消息
  const loadHistory(conversationId)        // 加载历史
  
  // 余额相关
  const getBalanceHistory()           // 获取余额变动历史
  
  return {
    conversations,
    balanceChanges,
    userBalance,
    initSocketListeners,
    getMessages,
    sendMessage,
    loadHistory,
    getBalanceHistory
  }
}
```

### 5.3 消息类型定义

```javascript
const MessageTypes = {
  // 聊天消息
  TEXT: 'text',
  IMAGE: 'image',
  
  // 红包消息
  RED_PACKET_SEND: 'redPacket:send',
  RED_PACKET_OPEN: 'redPacket:open',
  RED_PACKET_BILL: 'redPacket:bill',
  
  // 系统消息
  SYSTEM: 'system',
  CHAIN_WAIT: 'chain:wait',
  CHAIN_KICK: 'chain:kick',
  
  // 金额变动
  BALANCE_CHANGE: 'balance:change',
  TRANSFER: 'transfer'
}
```

---

## 6. 接口规范

### 6.1 HTTP REST API

#### 发送消息
```
POST /api/chats/messages
Request:
{
  "groupId": "69d4ac8de8e03b8ae3397bb7",  // 群聊必填
  "receiverId": "user_123",                // 私聊必填
  "content": "Hello",
  "type": "text" | "image",
  "clientMsgId": "1775638200628"           // 客户端消息ID（去重）
}

Response:
{
  "success": true,
  "data": {
    "_id": "msg_123",
    "content": "Hello",
    "sender": { "_id": "user_456", "username": "张三" },
    "groupId": "69d4ac8de8e03b8ae3397bb7",
    "createdAt": "2026-04-07T10:30:00.000Z",
    "type": "text"
  }
}
```

#### 获取历史消息
```
GET /api/chats/messages/:chatId?page=1&limit=50
Response:
{
  "success": true,
  "data": {
    "messages": [
      {
        "_id": "msg_123",
        "content": "Hello",
        "sender": { "_id": "user_456", "username": "张三" },
        "groupId": "69d4ac8de8e03b8ae3397bb7",
        "createdAt": "2026-04-07T10:30:00.000Z",
        "type": "text"
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 50
  }
}
```

#### 领取红包
```
POST /api/redpackets/:id/open
Response:
{
  "success": true,
  "data": {
    "amount": 20,
    "message": "恭喜发财",
    "from": "张三",
    "balance": 480  // 领取后余额
  }
}
```

### 6.2 WebSocket 事件

#### 群聊消息
```javascript
// 发送
socket.emit('chat:groupMessage', {
  groupId: '69d4ac8de8e03b8ae3397bb7',
  content: 'Hello',
  type: 'text',
  clientMsgId: '1775638200628'
})

// 接收
socket.on('groupMessage', (data) => {
  // data 格式同 HTTP 响应的 data 字段
})
```

#### 私聊消息
```javascript
// 发送
socket.emit('chat:privateMessage', {
  receiverId: 'user_123',
  content: 'Hello',
  type: 'text'
})

// 接收
socket.on('privateMessage', (data) => {
  // ...
})
```

#### 群红包
```javascript
// 接收
socket.on('groupRedPacket', (data) => {
  // data 包含红包详情
})
```

#### 余额变动（待后端实现）
```javascript
// 接收
socket.on('balanceChange', (data) => {
  // {
  //   userId: 'user_456',
  //   amount: 20,
  //   balance: 480,
  //   reason: '领取红包',
  //   timestamp: '2026-04-07T10:30:00.000Z'
  // }
})
```

---

## 7. 实施步骤

### Phase 1: 创建统一消息中心 ✅
- [x] 创建 `src/composables/useMessageCenter.js`
- [x] 实现 `handleIncomingMessage()` 统一入口
- [x] 实现 `formatMessage()` 消息格式化
- [x] 实现 `addMessageToConversation()` 数组管理
- [x] 实现 `sendMessage()` 双重发送策略
- [x] 实现 `loadHistory()` 三层加载策略
- [x] 实现 `getBalanceHistory()` 金额追踪

### Phase 2: 迁移接龙群组件（进行中）
- [ ] 修改 `useChainGroupChat.js`
  - 移除本地 `messages` 数组
  - 移除本地 Socket 监听
  - 改用 `useMessageCenter().getMessages()`
- [ ] 修改 `ChainGroupChat/index.vue`
  - 初始化消息中心：`initSocketListeners()`
  - 加载历史：`loadHistory(\`group_${chatId}\`)`
  - 发送消息：`sendMessage(\`group_${chatId}\`, data)`

### Phase 3: 迁移私聊组件
- [ ] 修改 `Chat.vue`
  - 使用统一消息中心
  - 适配私聊消息格式

### Phase 4: 迁移六合组件
- [ ] 修改 `LiuHe.vue`
  - 使用统一消息中心
  - 移除重复的 Socket 监听

### Phase 5: 钱包页面集成
- [ ] 修改 `Wallet.vue`
  - 使用 `getBalanceHistory()` 显示交易记录
  - 实时监听余额变动

### Phase 6: 优化与测试
- [ ] 添加消息去重逻辑（基于 clientMsgId）
- [ ] 添加离线消息队列（WSS 断开时暂存）
- [ ] 性能测试（大量消息场景）
- [ ] 边界情况测试（网络断开、重连）

---

## 8. 需要后端配合的事项

### 8.0 后端反馈总结（2026-04-07）✅ 已确认

**整体评价**：✅ 方案优秀，推荐采用方案A快速上线  
**后端状态**：✅ **所有高优先级问题已确认，可以开始开发**

**后端现状分析**：
- ✅ `GET /api/chats/messages/:chatId` - 已存在，但群聊返回空数组⚠️ → **即将修复**
- ✅ Socket事件：`groupMessage`、`groupRedPacket` 已实现
- ❌ `POST /api/chats/messages` - **完全不存在** → **Phase 1 核心任务**
- ❌ `balanceChange` WSS事件 - 缺失 → **Phase 2 任务**

**后端确认的实施方案**：

#### 🔴 高优先级（今天确认，立即开发）

**1. 群聊消息存储模型**
- ✅ 使用 `GroupMessage` 模型存储群聊消息
- ✅ 私聊使用 `Message` 模型
- ✅ 分离存储便于索引优化和权限控制

**2. POST /api/chats/messages 接口**
```javascript
Request Body:
{
  "groupId": "69d4ac8de8e03b8ae3397bb7",  // 群聊必填
  "receiverId": "user_123",                // 私聊必填（二选一）
  "content": "Hello",                      // 最大2000字符
  "type": "text",                          // text | image
  "clientMsgId": "1775638200628"           // 可选，用于去重
}

Response:
{
  "success": true,
  "data": {
    "_id": "69d5f2c3c0fe62ba5e42b94f",
    "content": "Hello",
    "type": "text",
    "sender": {
      "_id": "user_456",
      "username": "张三",
      "avatar": "https://..."  // ✅ 包含头像
    },
    "groupId": "69d4ac8de8e03b8ae3397bb7",
    "clientMsgId": "1775638200628",  // ✅ 返回 clientMsgId
    "createdAt": "2026-04-08T10:30:00.000Z"
  }
}
```

**逻辑确认**：
- ✅ 需要验证用户是否在群组中（非公共群）
- ✅ 发红包时验证余额（但普通消息不验证）
- ✅ Socket 广播时机：保存后（确保数据已持久化）
- ✅ 如果 Socket 广播失败，不回滚数据库

**3. GET /api/chats/messages/:chatId 修复**
```javascript
GET /api/chats/messages/:chatId?page=1&limit=50

// chatId 格式：
// - 群聊: groupId (ObjectId)
// - 私聊: userId (ObjectId)

Response:
{
  "success": true,
  "data": {
    "messages": [
      {
        "_id": "msg_123",
        "content": "Hello",
        "sender": {
          "_id": "user_456",
          "username": "张三",
          "avatar": "https://..."  // ✅ 包含头像
        },
        "groupId": "xxx",  // 群聊时有
        "receiverId": "yyy",  // 私聊时有
        "createdAt": "2026-04-07T10:30:00.000Z",
        "type": "text"
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 50,
    "hasMore": true
  }
}
```

**排序规则**：
- ✅ 按 `createdAt` 升序（从旧到新）
- ✅ 默认返回最旧的 50 条（第一页）
- ✅ 支持分页：page 从 1 开始，limit 最大 100

**4. clientMsgId 唯一索引**
```javascript
// MongoDB Schema
clientMsgId: {
  type: String,
  sparse: true  // ✅ 设置为 sparse（允许为空）
}

// 添加复合索引（按群组去重）
messageSchema.index({ groupId: 1, clientMsgId: 1 }, { 
  unique: true, 
  sparse: true 
});
```

**重复处理**：
- ✅ 返回已存在的消息（而不是创建新消息）
- ✅ 这样前端重试时不会重复显示

---

#### 🟡 中优先级（本周内实施）

**5. 余额变动推送**

**触发场景**：
- ✅ 红包领取
- ✅ 充值成功
- ✅ 提现成功
- ✅ 发红包扣款（立即扣）
- ✅ 邀请奖励
- ✅ 接龙群收益

**数据格式**：
```javascript
socket.emit('balanceChange', {
  amount: 20,              // ✅ 正数增加，负数减少
  balance: 480,            // ✅ 变动后余额
  reason: 'redPacket:open', // ✅ 枚举值见下方
  timestamp: '2026-04-08T10:30:00.000Z',
  relatedId: 'redpacket_789'  // ✅ 关联的业务ID
})
```

**reason 枚举值**：
```javascript
const BalanceChangeReasons = {
  RED_PACKET_SEND: 'redPacket:send',      // 发送红包
  RED_PACKET_OPEN: 'redPacket:open',      // 领取红包
  RECHARGE: 'recharge',                    // 充值
  WITHDRAW: 'withdraw',                    // 提现
  INVITE_REWARD: 'invite_reward',         // 邀请奖励
  CHAIN_INCOME: 'chain_income',           // 接龙收益
  TRANSFER: 'transfer'                     // 转账
};
```

**推送范围**：
- ✅ 只推送给当前用户自己（`socket.to(user:${userId})`）
- ❌ 不推送给其他人

**6. Socket 房间管理**

**确认策略**：
- ✅ 用户加入群组时，自动加入 Socket 房间：`socket.join(\`group:${groupId}\`)`
- ✅ 用户离开群组时，自动离开 Socket 房间：`socket.leave(\`group:${groupId}\`)`
- ✅ 用户断开重连后，需要重新加入房间（前端在 reconnect 事件中调用 joinGroup）
- ✅ 通过房间机制避免向未加入的用户推送：`io.to(\`group:${groupId}\`).emit('groupMessage', data)`

**7. 离线消息处理**

**确认方案**：
- ✅ 存储离线消息（MongoDB 已持久化）
- ✅ 用户上线后主动拉取（推荐方案）
```javascript
// 前端重连后
socket.on('connect', () => {
  fetch(`/api/chats/messages/${chatId}?since=${lastMessageTime}`)
    .then(res => res.json())
    .then(data => {
      // 补充缺失的消息
    });
});
```
- ✅ 离线消息保留时长：永久（MongoDB 持久化）
- ⚪ 未读消息计数：后续实现（Phase 2 或 Phase 3）

---

#### 🟢 低优先级（后续版本）

- ❌ 富媒体消息支持（图片/文件）
- ❌ 消息撤回/删除
- ❌ 消息搜索
- ⚪ 未读消息计数

---

**后端建议的优先级**：
1. **优先级1**：实现发送消息接口（1天）
2. **优先级2**：修复群聊消息查询（0.5天）
3. **优先级3**：余额变动推送（0.5天）

**预计工期**：2.5天完成 Phase 1 + Phase 2

**潜在风险点**：
- ⚠️ 消息去重：需要在数据库添加 `clientMsgId` 唯一索引 ✅ 已确认
- ⚠️ 数据一致性：HTTP + WSS 时序问题 ✅ 已确认（先保存再广播）
- ⚠️ 性能考虑：LocalStorage 大小限制、分页加载 ✅ 已确认

---

### 8.1 当前状态分析

#### ✅ 已存在的接口（可直接使用）
```javascript
// 1. 获取历史消息
GET /api/chats/messages/:chatId

// 2. 创建群红包
POST /api/redpackets/group

// 3. 领取红包
POST /api/redpackets/:id/open

// 4. Socket 事件
- groupMessage (群消息广播)
- groupRedPacket (群红包广播)
```

#### ❌ 缺失的接口（需要补充）
```javascript
// 1. 发送消息接口
POST /api/chats/messages  // 或 POST /api/groups/:id/messages

// 2. 余额变动推送
socket.on('balanceChange')  // WSS 事件
```

---

### 8.2 后端改造建议方案

后端可以根据实际情况选择以下方案之一：

---

#### 🟢 方案A：最小改动（推荐，快速上线）

**核心思路**：复用现有接口，只补充缺失的部分

**需要添加的接口**：

##### 1. 发送消息接口
```javascript
POST /api/chats/messages

Request Body:
{
  "groupId": "69d4ac8de8e03b8ae3397bb7",  // 群聊必填
  "receiverId": "user_123",                // 私聊必填（二选一）
  "content": "Hello",
  "type": "text",                          // text | image
  "clientMsgId": "1775638200628"           // 客户端消息ID（用于去重）
}

Response:
{
  "success": true,
  "data": {
    "_id": "msg_123",
    "content": "Hello",
    "sender": {
      "_id": "user_456",
      "username": "张三"
    },
    "groupId": "69d4ac8de8e03b8ae3397bb7",
    "createdAt": "2026-04-07T10:30:00.000Z",
    "type": "text"
  }
}

实现逻辑：
1. 验证用户权限
2. 保存消息到数据库
3. 通过 Socket 广播给群成员（emit 'groupMessage'）
4. 返回消息对象
```

##### 2. 余额变动 WSS 推送
```javascript
// 在以下场景触发 balanceChange 事件：
// - 用户发红包扣款
// - 用户领红包到账
// - 提现/充值成功

socket.emit('balanceChange', {
  userId: 'user_456',
  amount: 20,              // 正数增加，负数减少
  balance: 480,            // 变动后余额
  reason: '领取红包',       // 变动原因
  timestamp: '2026-04-07T10:30:00.000Z',
  relatedId: 'redpacket_789'  // 关联的业务ID
})
```

**优点**：
- ✅ 改动最小，只需添加 1 个 HTTP 接口 + 1 个 WSS 事件
- ✅ 复用现有的 `GET /api/chats/messages/:chatId`
- ✅ 快速上线，风险低

**缺点**：
- ⚠️ 接口不够 RESTful（私聊和群聊混用）
- ⚠️ 缺少分页支持（如果历史记录很多）

**工作量评估**：0.5-1 天

---

#### 🟡 方案B：标准 REST API（推荐，长期维护）

**核心思路**：按资源分类，接口更规范

**需要调整的接口**：

##### 1. 群消息接口
```javascript
// 获取群消息列表
GET /api/groups/:groupId/messages?page=1&limit=50

Response:
{
  "success": true,
  "data": {
    "messages": [...],
    "total": 100,
    "page": 1,
    "limit": 50,
    "hasMore": true
  }
}

// 发送群消息
POST /api/groups/:groupId/messages

Request Body:
{
  "content": "Hello",
  "type": "text",
  "clientMsgId": "1775638200628"
}
```

##### 2. 私聊消息接口
```javascript
// 获取私聊记录
GET /api/users/:userId/messages?page=1&limit=50

// 发送私聊消息
POST /api/users/:userId/messages
```

##### 3. 余额变动推送（同方案A）
```javascript
socket.on('balanceChange', callback)
```

**优点**：
- ✅ 接口清晰，符合 REST 规范
- ✅ 支持分页，适合大量历史消息
- ✅ 易于扩展（未来可以加搜索、过滤等）

**缺点**：
- ⚠️ 需要重构现有接口
- ⚠️ 前端需要同步修改调用方式

**工作量评估**：2-3 天

---

#### 🔵 方案C：GraphQL（可选，灵活查询）

**核心思路**：使用 GraphQL 统一查询接口

```graphql
# 查询消息
type Query {
  messages(conversationId: ID!, type: ConversationType!, page: Int, limit: Int): MessageConnection!
}

# 发送消息
type Mutation {
  sendMessage(input: SendMessageInput!): Message!
}

# 订阅实时消息
type Subscription {
  messageReceived(conversationId: ID!): Message!
  balanceChanged(userId: ID!): BalanceChange!
}
```

**优点**：
- ✅ 前端可以按需查询字段
- ✅ 减少过度获取数据
- ✅ 类型安全

**缺点**：
- ⚠️ 需要引入 GraphQL 框架
- ⚠️ 学习成本高
- ⚠️ 缓存策略复杂

**工作量评估**：5-7 天

---

### 8.3 方案对比

| 维度 | 方案A（最小改动） | 方案B（标准REST） | 方案C（GraphQL） |
|------|------------------|------------------|-----------------|
| **开发时间** | 0.5-1天 | 2-3天 | 5-7天 |
| **接口规范性** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **前端改动** | 小 | 中 | 大 |
| **可维护性** | 中 | 高 | 高 |
| **扩展性** | 中 | 高 | 极高 |
| **学习成本** | 低 | 低 | 高 |
| **推荐场景** | 快速上线 | 长期项目 | 大型复杂项目 |

---

### 8.4 我的建议

**短期（1-2周）**：采用 **方案A**
- 快速解决当前问题
- 验证架构可行性
- 降低风险

**中期（1-2月）**：升级到 **方案B**
- 接口规范化
- 支持更多功能（分页、搜索）
- 提升可维护性

**长期（3月+）**：考虑 **方案C**
- 如果业务复杂度持续增长
- 如果需要灵活的查询能力
- 如果团队有 GraphQL 经验

---

### 8.5 具体实施清单（✅ 后端已确认）

#### Phase 1: 核心接口（1.5天）🔥 后端开发中
- [x] **实现 `POST /api/chats/messages`** （已完成设计）
  - ✅ 支持群聊和私聊
  - ✅ 保存到数据库（GroupMessage / Message）
  - ✅ 通过 Socket 广播（保存后）
  - ✅ 返回标准化消息对象（包含 sender.avatar、clientMsgId）
  - ✅ 添加 `clientMsgId` 字段到模型
  - ✅ 添加复合唯一索引：`{ groupId: 1, clientMsgId: 1 }, { unique: true, sparse: true }`
  - ✅ 重复处理：返回已存在的消息
  - ✅ 验证用户是否在群组中
  
- [x] **修复群聊消息查询**（已完成设计）
  - ✅ 从 `GroupMessage` 模型查询
  - ✅ 支持分页：`page=1&limit=50`（最大100）
  - ✅ 排序：`createdAt` 升序（旧→新）
  - ✅ 返回字段：_id, content, sender{_id, username, avatar}, groupId, createdAt, type

#### Phase 2: 余额追踪（0.5天）
- [ ] 在红包领取时推送 `balanceChange`
- [ ] 在充值/提现时推送 `balanceChange`
- [ ] 在发红包扣款时推送 `balanceChange`
- [ ] 定义 `balanceChange` 事件数据格式（已确认）
- [ ] reason 枚举值：redPacket:send, redPacket:open, recharge, withdraw, invite_reward, chain_income, transfer

#### Phase 3: Socket 房间管理（0.5天）
- [ ] 用户加入群组时：`socket.join(\`group:${groupId}\`)`
- [ ] 用户离开群组时：`socket.leave(\`group:${groupId}\`)`
- [ ] 前端重连后重新加入房间
- [ ] 使用房间机制推送：`io.to(\`group:${groupId}\`).emit('groupMessage', data)`

#### Phase 4: 优化（可选，后续版本）
- [ ] 添加未读消息计数
- [ ] 富媒体消息支持（图片、文件）
- [ ] 消息撤回/删除
- [ ] 消息搜索

---

### 8.6 需要确认的问题（✅ 后端已全部回复）

**所有问题已确认，详见 8.0 节**

1. ✅ **群聊消息存储**：使用 `GroupMessage` 模型
2. ✅ **消息类型**：Phase 1 只支持文本，后续再考虑富媒体
3. ✅ **历史消息量**：支持分页，page=1&limit=50（最大100）
4. ✅ **离线消息**：永久存储，用户上线后主动拉取

---

### 8.7 数据结构约定

#### 消息对象标准格式
```javascript
{
  "_id": "msg_123",                    // MongoDB ObjectId
  "content": "Hello",                  // 消息内容
  "type": "text",                      // text | image | redPacket
  "sender": {                          // 发送者信息
    "_id": "user_456",
    "username": "张三",
    "avatar": "https://..."
  },
  "groupId": "69d4ac8de8e03b8ae3397bb7",  // 群ID（群聊必填）
  "receiverId": "user_789",            // 接收者ID（私聊必填）
  "clientMsgId": "1775638200628",      // 客户端消息ID（去重用）
  "createdAt": "2026-04-07T10:30:00.000Z",  // ISO8601 格式
  "updatedAt": "2026-04-07T10:30:00.000Z"
}
```

#### 红包消息额外字段
```javascript
{
  // ... 基础字段 ...
  "type": "redPacket",
  "redPacketData": {
    "_id": "redpacket_123",
    "totalAmount": 100,
    "count": 10,
    "remainCount": 5,
    "message": "恭喜发财",
    "expiredAt": "2026-04-08T10:30:00.000Z"
  }
}
```

#### 余额变动对象格式
```javascript
{
  "userId": "user_456",
  "amount": 20,                        // 正数增加，负数减少
  "balance": 480,                      // 变动后余额
  "reason": "领取红包",                 // 变动原因
  "type": "redPacket:open",            // 变动类型
  "timestamp": "2026-04-07T10:30:00.000Z",
  "relatedId": "redpacket_789"         // 关联的业务ID
}
```

---

## 9. 后端反馈的潜在风险与应对

### 9.1 消息去重问题
**风险**：HTTP + WSS 可能收到重复消息  
**应对措施**：
- **后端**：在数据库添加 `clientMsgId` 唯一索引
  ```javascript
  // MongoDB Schema
  clientMsgId: {
    type: String,
    unique: true,
    sparse: true  // 允许为空
  }
  ```
- **前端**：本地基于 `clientMsgId` 或 `_id` 去重
  ```javascript
  const existingMessage = messages.value.find(msg => 
    msg.clientMsgId === newMessage.clientMsgId || 
    msg._id === newMessage._id
  )
  if (existingMessage) return // 跳过重复消息
  ```

### 9.2 数据一致性
**风险**：HTTP 返回和 WSS 推送的消息可能时序不一致  
**应对措施**：
- 确保后端先保存数据库，再触发 WSS 广播
- 前端使用乐观更新，但以 HTTP 返回为准
- 如果 WSS 消息先到，等待 HTTP 响应后合并

### 9.3 性能考虑
**LocalStorage 大小限制**：
- 浏览器限制：5-10MB
- 策略：每个对话最多缓存 200 条消息
- 超出限制时清理旧消息或使用 IndexedDB

**大量历史消息**：
- 必须支持分页（page, limit）
- 懒加载：滚动到底部时加载更多
- 虚拟滚动：只渲染可见区域的消息

**Socket 房间管理**：
- 用户加入群组时：`socket.join(groupId)`
- 用户离开群组时：`socket.leave(groupId)`
- 避免向未加入的用户推送消息

---

## 10. 性能指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 首屏加载时间 | < 100ms | LocalStorage 命中 |
| 消息接收延迟 | < 50ms | WSS 推送 |
| 消息发送响应 | 即时显示 | 乐观更新 |
| HTTP 请求减少 | > 90% | 缓存命中率 |
| 内存占用 | < 50MB | 1000条消息以内 |

---

## 11. 风险与应对

### 11.1 WSS 断开
**风险**：实时推送失效  
**应对**：
- 自动降级为 HTTP 轮询（每5秒）
- 重连后同步缺失消息

### 11.2 LocalStorage 超限
**风险**：浏览器限制 5-10MB  
**应对**：
- 每个对话最多缓存 200 条消息
- 定期清理旧消息
- 超出限制时使用 IndexedDB

### 11.3 消息重复
**风险**：WSS + HTTP 可能收到重复消息  
**应对**：
- 基于 `clientMsgId` 去重
- 基于 `_id` 去重

---

## 12. 总结

本方案通过**统一消息中心**解决了以下问题：
1. ✅ 多消息源混乱 → 单一数据源
2. ✅ 响应式更新失败 → 标准化数组操作
3. ✅ 金额变动无法追踪 → 独立记录
4. ✅ 性能低下 → 三层缓存策略
5. ✅ 维护困难 → 模块化设计

**核心价值**：
- 开发效率提升 50%（组件只需订阅）
- 用户体验提升（毫秒级响应）
- 可维护性提升（逻辑集中）
- 可扩展性强（新增聊天类型无需改动核心）

---

## 13. 后端实施状态（2026-04-07 更新）

### ✅ 已完成确认
- [x] 所有高优先级问题已确认
- [x] 所有中优先级问题已确认
- [x] API 接口规范已明确
- [x] Socket 事件格式已明确
- [x] 数据库索引策略已明确

### 🚧 后端开发中（预计2.5天）
- [ ] Phase 1: POST /api/chats/messages + GET 修复（1.5天）
- [ ] Phase 2: balanceChange 推送（0.5天）
- [ ] Phase 3: Socket 房间管理（0.5天）

### 📅 前端准备就绪
- [x] useMessageCenter.js 已创建
- [ ] 等待后端 Phase 1 完成后开始迁移
- [ ] 预计前端迁移时间：1-2天

### 🎯 总体时间线
- **Day 1-2**: 后端 Phase 1 开发
- **Day 3**: 后端 Phase 2-3 + 前端开始迁移
- **Day 4-5**: 前后端联调测试
- **Day 6-7**: 优化 + 上线
