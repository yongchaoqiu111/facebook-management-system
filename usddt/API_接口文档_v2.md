# USDCHOU WebSocket + API 完整对接文档 v2.0

## 📋 重要说明

**核心原则：所有实时数据通过 WebSocket 自动推送，前端无需主动请求！**

- ✅ **WSS 广播**：消息、群组、好友、在线状态等实时数据
- ⚠️ **HTTP API**：仅用于操作类接口（注册、登录、发红包、领红包等）
- ❌ **已废弃**：所有获取列表的 GET 接口（群列表、好友列表、消息历史等）

---

## 🔗 连接信息

### WebSocket 连接
```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'Bearer <your_jwt_token>'
  }
});
```

### HTTP API
- **Base URL**: `http://localhost:5000/api`
- **认证**: `Authorization: Bearer <token>`

---

## 📡 第一部分：WebSocket 事件（实时推送）

### ⚠️ 重要：前端只需要监听这些事件，不需要主动请求！

---

### 1. 连接相关

#### 1.1 connect - 连接成功
```javascript
socket.on('connect', () => {
  console.log('WebSocket 连接成功');
  // 后端会自动推送群组列表和好友列表
});
```

#### 1.2 disconnect - 断开连接
```javascript
socket.on('disconnect', () => {
  console.log('WebSocket 断开');
});
```

---

### 2. 消息相关

#### 2.1 receiveMessage - 接收消息（通用）

**触发场景：** 
- 收到聊天消息
- 收到红包消息
- 收到系统通知

```javascript
socket.on('receiveMessage', (data) => {
  console.log('收到消息:', data);
  
  // 数据结构
  {
    msgType: 1,              // 消息类型：1=聊天, 2=红包, 3=系统
    msgId: "100000000001",   // 消息ID（12位纯数字，用于去重）
    senderId: "10000001",    // 发送者ID（8位纯数字）
    receiverId: null,        // 接收者ID（私聊时有值）
    groupId: "1000001",      // 群组ID（群聊时有值，7位纯数字）
    content: {
      type: "text",          // 内容类型：text/image/redpacket
      text: "Hello"          // 具体内容
    },
    timestamp: 1234567890    // 服务器时间戳
  }
});
```

**红包消息示例：**
```javascript
{
  msgType: 2,
  msgId: "100000000002",
  senderId: "10000001",
  groupId: "1000001",
  content: {
    type: "redpacket",
    redPacketId: "10000000001",  // 红包ID（11位纯数字）
    redPacketType: "normal",     // normal/lucky/chain
    totalAmount: 100,
    count: 10,
    remainCount: 8,
    message: "恭喜发财",
    createdAt: "2026-04-09T10:30:00.000Z"
  },
  timestamp: 1234567890
}
```

---

#### 2.2 redPacketReceived - 领取红包结果

**触发场景：** 用户领取红包后，后端广播给当前用户

```javascript
socket.on('redPacketReceived', (data) => {
  console.log('领取红包结果:', data);
  
  // 数据结构
  {
    redPacketId: "10000000001",  // 红包ID（11位纯数字）
    senderId: "10000001",        // 发包人ID
    receiverId: "10000002",      // 领包人ID（当前用户）
    amount: 10,                  // 领取金额
    newBalance: 1000,            // 最新余额
    totalReceived: 50,           // 累计领取金额（接龙群用）
    wasKicked: false,            // 是否被踢出
    kickReason: "",              // 踢出原因
    timestamp: 1234567890
  }
  
  // 前端操作：
  // 1. 更新余额显示
  // 2. 更新累计领取金额
  // 3. 如果被踢出，显示提示并退出群组
});
```

---

#### 2.3 redPacketUpdated - 红包状态更新

**触发场景：** 有人领取红包后，广播给群组所有人

```javascript
socket.on('redPacketUpdated', (data) => {
  console.log('红包状态更新:', data);
  
  // 数据结构
  {
    redPacketId: "10000000001",  // 红包ID
    openedCount: 5,              // 已领取数量
    remainCount: 25,             // 剩余数量
    timestamp: 1234567890
  }
  
  // 前端操作：更新红包UI显示的剩余数量
});
```

---

### 3. 群组相关

#### 3.1 groupListUpdated - 群组列表更新

**触发场景：** 
- 用户连接时（首次推送）
- 加入新群时
- 退出群时
- **被踢出群时**（接龙群达到领取上限）
- 群组信息变更时

```javascript
socket.on('groupListUpdated', (data) => {
  console.log('群组列表更新:', data);
  
  // 数据结构
  {
    groups: [
      {
        _id: "1000001",           // 群组ID（7位纯数字）
        name: "六合天下",
        avatar: "🌐",
        description: "欢迎所有会员！",
        memberCount: 100,
        isPublic: true,
        settings: {
          isChainRedPacket: false,  // 是否接龙群
          allowMemberPost: true
        }
      },
      {
        _id: "1000002",           // 接龙群ID
        name: "红包接龙",
        avatar: "🧧",
        description: "红包接龙游戏区",
        memberCount: 50,
        isPublic: true,
        settings: {
          isChainRedPacket: true,
          ticketAmount: 10,         // 门票金额
          firstRedPacketAmount: 300, // 首包金额
          redPacketCount: 30,       // 红包数量
          redPacketPerAmount: 10,   // 单个红包金额
          kickThreshold: 50,        // 踢人阈值
          waitHours: 3              // 冷却时间（小时）
        }
      }
    ],
    timestamp: 1234567890
  }
  
  // 前端操作：
  // 1. **替换整个群组列表**（不是增量更新）
  // 2. 渲染群组UI
  // 3. 如果在已不存在的群聊页面，跳转到其他群或首页
});
```

**⚠️ 重要说明：**
- 此事件采用**全量替换**策略，前端应直接用 `data.groups` 替换本地缓存的群组列表
- 被踢出群后，后端会自动广播此事件，列表中不再包含被踢出的群
- 确保前后端数据一致性，避免“前端显示在群里，但后端验证失败”的问题

---

#### 3.1 redPacketClaimed - 有人领取红包

**触发场景：** 群组内有人领取红包时广播

```javascript
socket.on('redPacketClaimed', (data) => {
  console.log('有人领取红包:', data);
  
  // 数据结构
  {
    redPacketId: "10000000007",  // 红包ID
    userId: "10000002",          // 领取者ID
    amount: 10,                  // 领取金额
    timestamp: 1234567890
  }
  
  // 前端操作：
  // 1. 显示提示：“XXX 领取了 10 USDT”
  // 2. 更新红包剩余数量
  // 3. 如果是我领取的，更新余额
});
```

---

#### 3.2 memberTotalReceivedUpdated - 成员累计领取更新

**触发场景：** 有人领取红包后，广播给群组所有人

```javascript
socket.on('memberTotalReceivedUpdated', (data) => {
  console.log('成员累计领取更新:', data);
  
  // 数据结构
  {
    userId: "10000002",          // 用户ID
    totalReceived: 50,           // 累计领取金额
    wasKicked: false,            // 是否被踢出
    timestamp: 1234567890
  }
  
  // 前端操作：
  // 1. 更新群组成员列表中的累计领取金额
  // 2. 如果 wasKicked=true，显示提示并退出群组
});
```

---

#### 3.3 memberKicked - 成员被踢出

**触发场景：** 用户达到领取上限被踢出接龙群

```javascript
socket.on('memberKicked', (data) => {
  console.log('成员被踢出:', data);
  
  // 数据结构
  {
    userId: "10000002",          // 被踢用户ID
    reason: "累计领取达到50USDT", // 踢出原因
    timestamp: 1234567890
  }
  
  // 前端操作：
  // 1. 显示提示：“你已被踢出群组：累计领取达到50USDT”
  // 2. 等待 groupListUpdated 事件自动更新群组列表（后端会广播）
  // 3. 如果在群聊页面，跳转到其他群或首页
});
```

**⚠️ 重要说明：**
- 被踢出后，后端会自动广播 `groupListUpdated` 事件，推送最新的群组列表（不包含被踢出的群）
- 前端应监听 `groupListUpdated` 事件来更新本地缓存，而不是手动从列表中移除
- 这样可以确保前后端数据一致性，避免“前端显示在群里，但后端验证失败”的问题

---

#### 3.5 balanceUpdated - 余额更新

**触发场景：** 用户余额变动时广播（扣费、收益、抢红包等）

```javascript
socket.on('balanceUpdated', (data) => {
  console.log('余额更新:', data);
  
  // 数据结构
  {
    type: 1,                     // 变动类型：1=加入接龙群, 2=门票收益, 3=抢红包, 4=六合下注, 5=六合中奖
    amount: -310,                // 变动金额（负数=扣费，正数=收入）
    newBalance: 99690,           // 最新余额
    groupId: "1000002",          // 相关群组ID（可选）
    timestamp: 1234567890
  }
  
  // 前端操作：
  // 1. 根据 type 显示不同提示
  // 2. 更新用户余额显示
  // 3. 添加到交易记录列表
});
```

**type 类型说明：**
- `1`: 加入接龙群扣费（门票+首包）
- `2`: 群主门票收益分成
- `3`: 领取红包收入
- `4`: 六合彩下注扣费
- `5`: 六合彩中奖收入
- `6`: 私聊红包转出
- `7`: 私聊红包收入
- `8`: 链上充值

**type 8 数据结构：**
```javascript
{
  type: 8,
  amount: 100,                    // 充值金额
  newBalance: 1100,               // 最新余额
  txId: "abc123...",              // 交易哈希
  fromAddress: "Txxx...",         // 发送者地址（用户钱包）
  toAddress: "Tyyy...",           // 接收地址（平台钱包）
  timestamp: 1234567890
}
```

---

#### 3.7 redPacketExhausted - 红包已领完

**触发场景：** 红包被领取后变为空，通知前端禁用按钮

```javascript
socket.on('redPacketExhausted', (data) => {
  console.log('红包已领完:', data);
  
  // 数据结构
  {
    redPacketId: "10000000001",  // 红包ID
    timestamp: 1234567890
  }
  
  // 前端操作：
  // 1. 禁用该红包的点击事件
  // 2. 显示“已领完”状态
  // 3. 不再发送领取请求
});
```

---

#### 3.8 wallet:checkDeposit - 检查充值状态

**触发场景：** 前端打开充值页面时主动查询

```javascript
// 发送请求
socket.emit('wallet:checkDeposit', {
  requestId: "uuid-12345"  // 唯一请求ID，防止重复提交
});

// 接收结果
socket.on('depositCheckResult', (data) => {
  console.log('充值检查结果:', data);
  
  // 数据结构
  {
    success: true,
    hasPending: true,          // 是否有未确认的充值
    transactions: [            // 充值列表
      {
        txId: "abc123...",     // 交易哈希
        amount: 100,           // 充值金额
        fromAddress: "Txxx",   // 发送者地址
        timestamp: 1234567890  // 区块时间戳
      }
    ]
  }
});
```

**限流规则：**
- 同一 `requestId` 3秒内只能提交一次（防重）
- 同一用户 5秒内只能请求一次（限流）

---

#### 3.10 chat:sendPrivateRedPacket - 发送私聊红包

**触发场景：** 用户向好友发送私聊红包

```javascript
// 发送请求
socket.emit('chat:sendPrivateRedPacket', {
  receiverId: "10000002",  // 接收者ID
  amount: 50,              // 红包金额
  message: "恭喜发财"       // 祝福语（可选）
});

// 后端处理：
// 1. 扣除发送者余额
// 2. 创建红包记录
// 3. 广播 balanceUpdated (type: 6) 给发送者
// 4. 转发 receiveRedPacket 事件给接收者
```

---

#### 3.11 chat:openPrivateRedPacket - 领取私聊红包

**触发场景：** 接收者点击领取私聊红包

```javascript
// 发送请求
socket.emit('chat:openPrivateRedPacket', {
  redPacketId: "10000000001"  // 红包ID
});

// 接收结果
socket.on('balanceUpdated', (data) => {
  if (data.type === 7) {
    console.log('收到私聊红包:', data.amount);
  }
});

socket.on('redPacketExhausted', (data) => {
  console.log('红包已领完:', data.redPacketId);
});

// 后端处理：
// 1. 验证红包有效性
// 2. 给接收者加钱
// 3. 广播 balanceUpdated (type: 7) 给接收者
// 4. 广播 redPacketExhausted 给发送者和接收者
```

---

#### 3.12 GET /api/redPackets/private/:otherUserId - 获取私聊红包历史

**请求方式：** GET  
**认证：** Authorization: Bearer <token>

**触发场景：** 前端清理缓存后，从后端拉取私聊红包历史数据

**URL示例：**
```
GET http://localhost:5000/api/redPackets/private/10000001?page=1&limit=50
```

**参数说明：**
- `otherUserId`: 对方用户ID（8位纯数字字符串），例如：10000001
- `page`: 页码（可选，默认1）
- `limit`: 每页数量（可选，默认50）

**响应格式：**
```javascript
{
  "success": true,
  "data": {
    "messages": [
      {
        "_id": "10000000105",           // 红包ID
        "senderId": "10000002",         // 发送者ID
        "receiverId": "10000001",       // 接收者ID
        "type": "redPacket",            // 消息类型
        "redPacketId": "10000000105",   // 红包ID（同_id）
        "amount": 10,                   // 红包金额
        "message": "恭喜发财，大吉大利", // 红包祝福语
        "createdAt": "2026-04-10T08:19:24.016Z",
        "updatedAt": "2026-04-10T08:19:24.016Z"
      }
    ],
    "total": 100,      // 总红包数
    "page": 1,         // 当前页码
    "limit": 50,       // 每页数量
    "hasMore": true    // 是否有更多
  }
}
```

**业务逻辑：**
- 查询条件：`sender` 或 `receiverId` 包含当前用户ID和对方ID（双向查询）
- 排序：按 `createdAt` 升序（从旧到新）
- 分页：支持 `page` 和 `limit` 参数
- 返回字段：包含红包ID、金额、祝福语等完整信息

**前端使用场景：**
```javascript
// 1. 清空IndexedDB后，重新加载私聊红包历史
const response = await fetch('/api/redPackets/private/10000001?page=1&limit=50', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const data = await response.json();
if (data.success) {
  // 2. 将红包数据保存到IndexedDB
  data.data.messages.forEach(packet => {
    saveToIndexedDB(packet);
  });
  
  // 3. 如果有更多，继续加载下一页
  if (data.data.hasMore) {
    loadNextPage(data.data.page + 1);
  }
}
```

---

#### 3.13 newLiuheRedPacket - 新六合红包

**触发场景：** 有人创建六合红包时广播给群组所有人

```javascript
socket.on('newLiuheRedPacket', (data) => {
  console.log('新六合红包:', data);
  
  // 数据结构
  {
    success: true,
    data: {
      _id: "10000000001",        // 红包ID
      banker: {
        userId: "10000001",
        username: "张三",
        avatar: "https://..."
      },
      prizePool: 100,            // 奖池金额
      groupId: "1000001",        // 群组ID
      bettingDeadline: "2026-04-10T10:00:00.000Z",  // 投注截止时间
      status: "open"             // open/closed/settled
    },
    message: "六合红包创建成功"
  }
  
  // 前端操作：
  // 1. 显示六合红包卡片
  // 2. 开启投注倒计时
  // 3. 允许用户下注
});
```

---

### 4. 好友相关

#### 4.1 friendListUpdated - 好友列表更新

**触发场景：**
- 用户连接时（首次推送）
- 添加好友时
- 删除好友时
- 好友信息变更时

```javascript
socket.on('friendListUpdated', (data) => {
  console.log('好友列表更新:', data);
  
  // 数据结构
  {
    friends: [
      {
        userId: "10000001",       // 好友ID（8位纯数字）
        username: "张三",
        avatar: "https://...",
        online: true              // 在线状态
      },
      {
        userId: "10000002",
        username: "李四",
        avatar: "https://...",
        online: false
      }
    ],
    timestamp: 1234567890
  }
  
  // 前端操作：
  // 1. 替换整个好友列表
  // 2. 渲染好友UI
});
```

---

#### 4.2 userStatusChanged - 用户在线状态变化

**触发场景：** 任何用户上线/下线时广播给所有人

```javascript
socket.on('userStatusChanged', (data) => {
  console.log('用户状态变化:', data);
  
  // 数据结构
  {
    userId: "10000001",           // 用户ID
    online: true,                 // true=上线, false=下线
    timestamp: 1234567890
  }
  
  // 前端操作：更新好友列表中的在线状态
});
```

---

#### 4.3 friendRequestReceived - 收到好友请求

**触发场景：** 别人向你发送好友请求

```javascript
socket.on('friendRequestReceived', (data) => {
  console.log('收到好友请求:', data);
  
  // 数据结构
  {
    requestId: "xxx",             // 请求ID
    senderId: "10000001",         // 发送者ID
    message: "你好，我想加你好友",
    timestamp: 1234567890
  }
  
  // 前端操作：
  // 1. 显示通知：“张三向你发送了好友请求”
  // 2. 在好友请求列表中显示
});
```

---

#### 4.4 friendRequestSent - 好友请求发送成功

**触发场景：** 你发送好友请求后

```javascript
socket.on('friendRequestSent', (data) => {
  console.log('好友请求已发送:', data);
  
  // 数据结构
  {
    success: true,
    requestId: "xxx",
    receiverId: "10000002"
  }
  
  // 前端操作：显示提示“好友请求已发送”
});
```

---

#### 4.5 friendRequestAccepted - 好友请求被接受

**触发场景：** 对方接受了你的好友请求

```javascript
socket.on('friendRequestAccepted', (data) => {
  console.log('好友请求被接受:', data);
  
  // 数据结构
  {
    friendId: "10000002",         // 新好友ID
    timestamp: 1234567890
  }
  
  // 前端操作：
  // 1. 显示提示：“李四同意了你的好友请求”
  // 2. 好友列表会自动更新（通过 friendListUpdated 事件）
});
```

---

#### 4.6 friendRequestRejected - 好友请求被拒绝

**触发场景：** 对方拒绝了你的好友请求

```javascript
socket.on('friendRequestRejected', (data) => {
  console.log('好友请求被拒绝:', data);
  
  // 数据结构
  {
    requestId: "xxx",
    timestamp: 1234567890
  }
  
  // 前端操作：显示提示“好友请求被拒绝”
});
```

---

#### 4.7 chat:deleteFriend - 删除好友

**触发场景：** 用户删除某个好友

```javascript
// 发送请求
socket.emit('chat:deleteFriend', {
  friendId: "10000002"  // 要删除的好友ID（8位纯数字）
});

// 接收结果
socket.on('friendDeleted', (data) => {
  console.log('好友已删除:', data);
  
  // 数据结构
  {
    success: true,
    friendId: "10000002",
    timestamp: 1234567890
  }
  
  // 前端操作：
  // 1. 显示提示：“已删除好友”
  // 2. 好友列表会自动更新（通过 friendListUpdated 事件）
  // 3. 如果在私聊页面，关闭聊天窗口或跳转到其他聊天
});

// 错误处理
socket.on('errorMessage', (data) => {
  if (data.msg.includes('好友')) {
    console.error('删除好友失败:', data.msg);
  }
});

// 后端处理：
// 1. 验证好友关系是否存在
// 2. 从数据库删除好友关系
// 3. 广播 friendListUpdated 给双方
// 4. 返回 friendDeleted 确认
```

---

### 5. 发送消息（前端 → 后端）

#### 5.1 chat:message - 发送统一消息

**用于：** 聊天消息、红包消息

```javascript
// 发送文本消息（群聊）
socket.emit('chat:message', {
  msgType: 1,                    // 1=聊天
  senderId: currentUser.userId,  // 当前用户ID（8位纯数字）
  groupId: "1000001",            // 群组ID（7位纯数字）
  content: {
    type: "text",
    text: "大家好"
  }
});

// 发送红包消息
socket.emit('chat:message', {
  msgType: 2,                    // 2=红包
  senderId: currentUser.userId,
  groupId: "1000001",
  content: {
    type: "redpacket",
    redPacketType: "normal",     // normal/lucky/chain
    totalAmount: 100,
    count: 10,
    message: "恭喜发财"
  }
});
```

---

#### 5.2 chat:addFriend - 发送好友请求

```javascript
socket.emit('chat:addFriend', {
  userId: "10000002",            // 目标用户ID
  message: "你好，我想加你好友"  // 验证消息（可选）
});

// 监听结果
socket.on('friendRequestSent', (data) => {
  console.log('发送成功:', data);
});

socket.on('errorMessage', (data) => {
  console.log('发送失败:', data.msg);
});
```

---

#### 5.3 chat:acceptFriend - 接受好友请求

```javascript
socket.emit('chat:acceptFriend', {
  requestId: "xxx"               // 好友请求ID
});

// 监听结果
socket.on('friendRequestAccepted', (data) => {
  console.log('已接受好友请求:', data);
  // 好友列表会自动更新
});
```

---

#### 5.4 chat:rejectFriend - 拒绝好友请求

```javascript
socket.emit('chat:rejectFriend', {
  requestId: "xxx"               // 好友请求ID
});

// 监听结果
socket.on('friendRequestRejected', (data) => {
  console.log('已拒绝好友请求:', data);
});
```

---

## 🔌 第二部分：HTTP API 接口（操作类）

### ⚠️ 注意：以下接口仅在需要执行操作时调用

---

### 1. 认证模块

#### 1.1 用户注册
```http
POST /api/auth/register
Content-Type: application/json
```

**请求体：**
```json
{
  "username": "张三",
  "phone": "13800138000",
  "password": "123456"
}
```

**响应：**
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "token": "eyJhbGci...",
    "user": {
      "_id": "10000000",         // 8位纯数字用户ID
      "userId": "10000000",
      "username": "张三",
      "phone": "13800138000",
      "balance": 0
    }
  }
}
```

---

#### 1.2 用户登录
```http
POST /api/auth/login
Content-Type: application/json
```

**请求体：**
```json
{
  "username": "张三",
  "password": "123456"
}
```

**响应：** 同注册

---

### 2. 用户搜索（保留 HTTP API）

#### 2.1 搜索用户

**说明：** 搜索功能保留 HTTP API，因为这是查询操作，不需要实时推送

```http
GET /api/friends/search?keyword=10000001
Authorization: Bearer <token>
```

**参数：**
- `keyword`: 搜索关键词（可以是 userId 或 username）

**响应：**
```json
{
  "success": true,
  "data": [
    {
      "_id": "10000001",
      "userId": "10000001",
      "username": "张三",
      "avatar": "https://..."
    }
  ]
}
```

**前端使用示例：**
```javascript
// 搜索用户
async function searchUsers(keyword) {
  const response = await fetch(`/api/friends/search?keyword=${keyword}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const result = await response.json();
  return result.data;
}

// 搜索结果展示后，点击“添加好友”按钮时使用 WebSocket
function addFriend(userId, message) {
  socket.emit('chat:addFriend', {
    userId: userId,
    message: message || '你好，我想加你好友'
  });
}
```

---

### 3. 红包模块（全部通过 WebSocket）

#### 3.1 发送红包

**使用 `chat:message` 事件，msgType=2**

```javascript
// 发送普通红包
socket.emit('chat:message', {
  msgType: 2,                    // 2=红包
  senderId: currentUser.userId,  // 当前用户ID
  groupId: "1000001",            // 群组ID
  content: {
    type: "redpacket",
    redPacketType: "normal",     // normal=普通, lucky=拼手气
    totalAmount: 100,
    count: 10,
    message: "恭喜发财"
  }
});

// 发送接龙红包
socket.emit('chat:message', {
  msgType: 2,
  senderId: currentUser.userId,
  groupId: "1000002",
  content: {
    type: "chainRedpacket",
    message: "接龙红包"
  }
});
```

**后端处理：**
1. 扣款
2. 创建红包记录
3. 广播 `receiveMessage` 事件给群组
4. 返回 `redPacketSent` 事件给发送者

```javascript
// 前端监听发送结果
socket.on('redPacketSent', (data) => {
  console.log('红包发送成功:', data);
  // {
  //   success: true,
  //   redPacketId: "10000000001",
  //   totalAmount: 100,
  //   config: { perAmount: 10, count: 10 }
  // }
});
```

---

#### 3.2 领取红包

**使用 `chat:redPacketOpen` 事件**

```javascript
// 领取红包
socket.emit('chat:redPacketOpen', {
  redPacketId: "10000000001",    // 红包ID（11位纯数字）
  userId: currentUser.userId     // 领取者ID
});
```

**后端处理：**
1. 校验（是否已领、是否抢完、冷却时间等）
2. 转账
3. 更新累计金额
4. 广播 `redPacketReceived` 给当前用户
5. 广播 `redPacketUpdated` 给群组
6. 如果被踢出，广播 `memberKicked`

**前端监听结果：**
```javascript
socket.on('redPacketReceived', (data) => {
  // 数据结构
  {
    redPacketId: "10000000001",
    senderId: "10000001",
    receiverId: "10000002",
    amount: 10,
    newBalance: 1000,
    totalReceived: 50,
    wasKicked: false,
    kickReason: "",
    timestamp: 1234567890
  }
  
  // 前端操作：
  // 1. 更新余额显示
  // 2. 更新累计领取金额
  // 3. 如果被踢出，显示提示并退出群组
});
```

---

#### 3.3 加入普通群

**使用 HTTP POST 接口**

```javascript
// 加入普通群（私人群/公开群）
POST /api/groups/:id/join

// 响应
{
  "success": true,
  "group": {
    "_id": "1000001",
    "name": "我的群组",
    "avatar": "https://...",
    "description": "群组描述",
    "memberCount": 10
  },
  "message": "Joined group successfully"
}
```

**群组类型：**
- **公开群** (`isPublic: true`): 所有人可见，可直接加入
- **私人群** (`isPublic: false`): 需要邀请才能加入

**后端操作：**
1. 验证群组是否存在
2. 检查是否已是成员
3. 检查是否需要审批
4. 添加用户到成员列表
5. 广播 `groupListUpdated` 事件
6. 让当前用户加入群组房间

---

#### 3.4 检查接龙群状态（新增）

**使用 `chat:checkChainStatus` 事件**

```javascript
// 发送检查请求
socket.emit('chat:checkChainStatus', {
  groupId: "1000002"  // 接龙群ID
});

// 监听响应
socket.on('chainStatusResponse', (data) => {
  console.log('群组状态:', data);
  
  // 数据结构
  {
    success: true,
    status: 'kicked',           // 状态：'normal' | 'kicked' | 'not_member'
    totalReceived: 400,         // 累计领取金额（仅 kicked 时返回）
    kickThreshold: 380,         // 踢出阈值（仅 kicked 时返回）
    kickReason: '累计领取达到380USDT'  // 踢出原因（仅 kicked 时返回）
  }
});
```

**状态说明：**
- `normal`: 正常成员，可以进群
- `kicked`: 已被踢出，需要重新缴费进群
- `not_member`: 从未加入过该群

**前端操作流程：**
1. 用户点击“进入群聊”
2. 发送 `chat:checkChainStatus` 检查状态
3. 如果 `status === 'kicked'`，弹出确认缴费框
4. 用户确认后调用 `chat:joinChainGroup` 重新进群

---

#### 3.5 加入接龙群

**使用 `chat:joinChainGroup` 事件**

```javascript
// 加入接龙群（正式环境 - 3小时冷却）
socket.emit('chat:joinChainGroup', {
  groupId: "1000002",            // 接龙群ID（7位纯数字）
  testMode: false                // false=正式(3小时), true=测试(3秒)
});

// 或者测试模式
socket.emit('chat:joinChainGroup', {
  groupId: "1000002",
  testMode: true                 // 3秒冷却
});
```

**请求参数：**
- `groupId`: 接龙群ID（必填，7位纯数字字符串）
- `testMode`: 测试模式（可选，默认false）
  - `true`: 冷却时间3秒（用于测试）
  - `false`: 冷却时间3小时（正式环境）

**接龙群类型：**
- **公开接龙群** (`isPublic: true`): 所有人可见，可直接加入（默认）
- **个人接龙群** (`isPublic: false`): 隐藏群，需要邀请码才能加入

**后端处理：**
1. 验证群组是否存在且为接龙群
2. 检查用户是否已是成员
3. 扣除门票 + 首包金额（从用户余额）
4. 自动创建新人首包红包
5. 添加用户到群组成员列表
6. 设置冷却时间（canGrabAfter）
7. 广播 `groupListUpdated` 更新群组信息
8. 让当前用户加入群组房间
9. 返回 `chainGroupJoined` 事件给当前用户

**前端监听加入结果：**
```javascript
socket.on('chainGroupJoined', (data) => {
  console.log('加入接龙群成功:', data);
  
  // 数据结构
  {
    success: true,
    group: {
      _id: "1000002",              // 群组ID（7位纯数字）
      name: "红包接龙",
      avatar: "🧧",
      description: "红包接龙游戏区",
      memberCount: 51,
      isPublic: true,
      settings: {
        isChainRedPacket: true,     // 是否接龙群
        ticketAmount: 10,           // 门票金额
        firstRedPacketAmount: 300,  // 首包金额
        redPacketCount: 30,         // 红包数量
        redPacketPerAmount: 10,     // 单个红包金额
        kickThreshold: 50,          // 踢人阈值
        waitHours: 3                // 冷却时间（小时）
      }
    },
    redPacket: {
      redPacketId: "10000000001",   // 红包ID（11位纯数字）
      totalAmount: 300,             // 总金额
      count: 30,                    // 红包数量
      message: "新人首包",
      createdAt: "2026-04-09T17:18:48.000Z"
    },
    canGrabAfter: "2026-04-09T20:18:48.000Z",  // 可领取时间
    remainingBalance: 1000,         // 剩余余额
    message: "加入接龙群成功，3小时后可领取红包",
    timestamp: 1234567890
  }
  
  // 前端操作：
  // 1. 显示提示消息
  // 2. 更新余额显示
  // 3. 切换到该群组聊天页面
  // 4. 记录可领取时间，显示倒计时
});
```

**错误处理：**
```javascript
socket.on('errorMessage', (data) => {
  console.log('加入失败:', data.msg);
  // 可能的错误：
  // - "Group not found" - 群组不存在
  // - "This is not a chain red packet group" - 不是接龙群
  // - "Already a member of this group" - 已是成员
  // - "Insufficient balance. Required: 310, Current: 100" - 余额不足
});
```

**注意事项：**
- ⚠️ 加入前确保用户余额充足（门票 + 首包金额）
- ⚠️ 加入后会自动发送新人首包到群聊
- ⚠️ 冷却时间内无法领取红包
- ⚠️ 被踢出后可以重新加入（会重置累计金额）

---

### 4. ❌ 已废弃的接口

以下接口**不再使用**，全部改为 WebSocket：

| 原接口 | 替代方案 | 说明 |
|--------|---------|------|
| `GET /api/groups` | `groupListUpdated` 事件 | 获取群组列表 |
| `GET /api/friends` | `friendListUpdated` 事件 | 获取好友列表 |
| `POST /api/friends` | `chat:addFriend` | 添加好友 |
| `PUT /api/friends/requests/:id/accept` | `chat:acceptFriend` | 接受好友请求 |
| `PUT /api/friends/requests/:id/reject` | `chat:rejectFriend` | 拒绝好友请求 |
| `GET /api/friends/requests` | `friendRequestReceived` 事件 | 获取好友请求 |
| `GET /api/messages/:groupId` | `receiveMessage` 事件 | 获取历史消息 |
| `GET /api/users/:id/status` | `userStatusChanged` 事件 | 获取在线状态 |
| `POST /api/redpackets` | `chat:message` (msgType=2) | 发红包 |
| `POST /api/redpackets/:id/open` | `chat:redPacketOpen` | 领红包 |
| `POST /api/redpackets/chain/join` | `chat:joinChainGroup` | 加入接龙群 |
| `POST /api/redpackets/chain` | `chat:message` (chainRedpacket) | 发接龙红包 |
| `POST /api/liuhe/create` | `chat:createLiuheRedPacket` | 创建六合红包 |
| `GET /api/liuhe/my-bills` | （待实现 WebSocket） | 获取我的账单 |

---

## 📝 第三部分：前端开发指南

### 1. 初始化流程

```javascript
import io from 'socket.io-client';

class ChatApp {
  constructor() {
    this.socket = null;
    this.groups = [];
    this.friends = [];
    this.messages = new Map();
  }

  async init(token) {
    // 1. 连接 WebSocket
    this.socket = io('http://localhost:5000', {
      auth: { token }
    });

    // 2. 注册事件监听
    this.setupEventListeners();

    // 3. 等待连接成功后，后端会自动推送群组和好友列表
  }

  setupEventListeners() {
    // 连接成功
    this.socket.on('connect', () => {
      console.log('✅ WebSocket 连接成功');
    });

    // 接收消息
    this.socket.on('receiveMessage', (data) => {
      this.handleMessage(data);
    });

    // 群组列表更新
    this.socket.on('groupListUpdated', (data) => {
      this.groups = data.groups;
      this.renderGroupList();
    });

    // 好友列表更新
    this.socket.on('friendListUpdated', (data) => {
      this.friends = data.friends;
      this.renderFriendList();
    });

    // 领取红包结果
    this.socket.on('redPacketReceived', (data) => {
      this.updateBalance(data.newBalance);
      this.showNotification(`领取红包 ${data.amount} USDT`);
      
      if (data.wasKicked) {
        this.showAlert(`你已被踢出：${data.kickReason}`);
      }
    });

    // 红包状态更新
    this.socket.on('redPacketUpdated', (data) => {
      this.updateRedPacketUI(data.redPacketId, data.remainCount);
    });

    // 成员被踢
    this.socket.on('memberKicked', (data) => {
      this.handleMemberKicked(data);
    });

    // 用户在线状态
    this.socket.on('userStatusChanged', (data) => {
      this.updateUserStatus(data.userId, data.online);
    });
  }

  handleMessage(data) {
    // 去重
    if (this.messages.has(data.msgId)) {
      return;
    }
    this.messages.set(data.msgId, data);

    // 根据消息类型处理
    if (data.content.type === 'redpacket') {
      this.renderRedPacketBubble(data);
    } else {
      this.renderTextMessage(data);
    }
  }

  // 发送消息
  sendTextMessage(groupId, text) {
    this.socket.emit('chat:message', {
      msgType: 1,
      senderId: this.currentUserId,
      groupId: groupId,
      content: {
        type: "text",
        text: text
      }
    });
  }

  // 领取红包（HTTP API）
  async openRedPacket(redPacketId) {
    const response = await fetch(`/api/redpackets/${redPacketId}/open`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.json();
    // ⚠️ 实际UI更新由 WebSocket 事件 redPacketReceived 触发
  }
}
```

---

### 2. 消息去重

```javascript
class MessageDeduplicator {
  constructor(maxSize = 1000) {
    this.processedMessages = new Set();
    this.maxSize = maxSize;
  }

  isDuplicate(msgId) {
    if (this.processedMessages.has(msgId)) {
      return true;
    }
    
    this.processedMessages.add(msgId);
    
    // 限制集合大小
    if (this.processedMessages.size > this.maxSize) {
      const firstKey = this.processedMessages.values().next().value;
      this.processedMessages.delete(firstKey);
    }
    
    return false;
  }
}
```

---

## 🎯 总结

### ✅ 前端只需要做这些事：

1. **连接 WebSocket**
2. **监听事件**（10个事件）
3. **收到数据直接渲染**
4. **所有操作用 WebSocket emit**（发消息、发红包、领红包、加群）
5. **只有认证用 HTTP API**（注册、登录）

### ❌ 前端不需要做这些事：

1. ~~主动请求群组列表~~
2. ~~主动请求好友列表~~
3. ~~主动请求消息历史~~
4. ~~轮询在线状态~~
5. ~~轮询红包状态~~
6. ~~HTTP 发红包~~
7. ~~HTTP 领红包~~
8. ~~HTTP 加入接龙群~~

**所有功能都通过 WebSocket 完成！**

---

**文档版本：** v2.1  
**更新时间：** 2026-04-09  
**核心原则：** WebSocket 为主，HTTP API 为辅  
**最新更新：** 新增 `chat:joinChainGroup` 完整标准

---

## 🤖 附录：自动发包机器人部署指南

### 1. 工作原理

机器人是一个独立的 Node.js 进程，通过 WebSocket 连接到后端服务器，模拟真实用户发送接龙红包。

**工作流程：**
```
机器人进程 → WebSocket 连接后端 → 发送 chat:message 事件 → 后端创建红包 → 广播到群组
```

**关键特点：**
- ✅ 完全模拟真实玩家，使用相同的 WebSocket 协议
- ✅ 随机间隔发包（5-15分钟），避免被检测
- ✅ 独立运行，不影响后端服务
- ✅ 使用 JWT Token 认证，与前端用户登录一致

---

### 2. 配置说明

#### 2.1 配置文件位置
`d:\weibo\usdchou\auto-redpacket-bot.js`

#### 2.2 核心配置项
```javascript
const CONFIG = {
  serverUrl: 'http://localhost:3000',  // 后端地址
  groupId: '1000002',                   // 接龙群ID
  userId: '10000002',                   // 机器人用户ID
  jwtSecret: 'usdchou_secret_key_2026_production',  // JWT密钥（从.env读取）
  packetsPerHour: 6,                    // 每小时发包数量
  message: '🧧 自动红包'                 // 红包消息
};
```

#### 2.3 发包间隔
- **当前设置**：5-15 分钟随机（平均 10 分钟 1 包）
- **计算公式**：`Math.random() * (maxInterval - minInterval) + minInterval`
- **调整方法**：修改 `getRandomInterval()` 函数中的 `minInterval` 和 `maxInterval`

---

### 3. 接入步骤

#### 3.1 前置条件
1. 后端服务已启动（`node server.js`）
2. MongoDB、Redis 正常运行
3. 机器人用户已创建并充值（余额充足）

#### 3.2 安装依赖
```bash
cd d:\weibo\usdchou
npm install socket.io-client jsonwebtoken
```

#### 3.3 生成 JWT Token
机器人使用与前端相同的 JWT 认证机制：
```javascript
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { user: { id: '10000002' } },
  'usdchou_secret_key_2026_production',
  { expiresIn: '7d' }
);
```

#### 3.4 启动机器人
```bash
node auto-redpacket-bot.js
```

**成功标志：**
```
🚀 自动发包机器人启动
📌 服务器: http://localhost:3000
📌 群ID: 1000002
📌 用户ID: 10000002
📌 发包频率: 6个/小时（随机间隔）
📌 红包金额: 10 USDT x 1
=========================================
✅ Socket 连接成功
📤 发送红包
⏰ 下次发包时间: 480.123秒后
```

---

### 4. 部署方案

#### 4.1 本地开发环境
**适用场景**：测试、调试

**部署步骤：**
1. 确保后端服务运行在 `localhost:3000`
2. 在另一个终端启动机器人：
   ```bash
   cd d:\weibo\usdchou
   node auto-redpacket-bot.js
   ```

**注意事项：**
- 关闭终端会停止机器人
- 适合快速测试和调整参数

---

#### 4.2 Linux 云服务器部署
**适用场景**：生产环境，24小时运行

##### 方案 A：使用 PM2（推荐）

**1. 安装 PM2**
```bash
npm install -g pm2
```

**2. 上传文件到服务器**
```bash
# 假设服务器路径为 /opt/usdt-chain/backend
scp auto-redpacket-bot.js root@your-server:/opt/usdt-chain/backend/
scp package.json root@your-server:/opt/usdt-chain/backend/
```

**3. 安装依赖**
```bash
ssh root@your-server
cd /opt/usdt-chain/backend
npm install socket.io-client jsonwebtoken
```

**4. 配置环境变量**
确保 `.env` 文件中包含：
```env
JWT_SECRET=usdchou_secret_key_2026_production
MONGODB_URI=mongodb://localhost:27017/usdchou
REDIS_URL=redis://localhost:6379
```

**5. 启动机器人**
```bash
pm2 start auto-redpacket-bot.js --name redpacket-bot
```

**6. 设置开机自启**
```bash
pm2 startup
pm2 save
```

**7. 查看日志**
```bash
pm2 logs redpacket-bot
```

**8. 管理命令**
```bash
pm2 restart redpacket-bot    # 重启
pm2 stop redpacket-bot       # 停止
pm2 delete redpacket-bot     # 删除
pm2 monit                    # 监控资源使用
```

---

##### 方案 B：使用 Systemd（更稳定）

**1. 创建服务文件**
```bash
sudo nano /etc/systemd/system/redpacket-bot.service
```

**2. 写入配置**
```ini
[Unit]
Description=USDCHOU RedPacket Bot
After=network.target mongod.service redis.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/usdt-chain/backend
ExecStart=/usr/bin/node auto-redpacket-bot.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

**3. 启动服务**
```bash
sudo systemctl daemon-reload
sudo systemctl enable redpacket-bot
sudo systemctl start redpacket-bot
```

**4. 查看状态**
```bash
sudo systemctl status redpacket-bot
sudo journalctl -u redpacket-bot -f  # 实时日志
```

---

#### 4.3 Docker 部署
**适用场景**：容器化环境，便于迁移

**1. 创建 Dockerfile**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install socket.io-client jsonwebtoken

COPY auto-redpacket-bot.js .
COPY .env .

CMD ["node", "auto-redpacket-bot.js"]
```

**2. 构建镜像**
```bash
docker build -t redpacket-bot .
```

**3. 运行容器**
```bash
docker run -d \
  --name redpacket-bot \
  --restart always \
  --network host \
  redpacket-bot
```

**4. 查看日志**
```bash
docker logs -f redpacket-bot
```

---

### 5. 监控与维护

#### 5.1 健康检查
机器人没有内置健康检查接口，可通过以下方式监控：

**PM2 方式：**
```bash
pm2 list  # 查看进程状态
pm2 logs redpacket-bot --lines 50  # 查看最近日志
```

**Systemd 方式：**
```bash
systemctl status redpacket-bot
journalctl -u redpacket-bot --since "1 hour ago"
```

#### 5.2 常见问题

**问题 1：机器人连接失败**
```
❌ 连接错误: Authentication error
```
**解决：**
- 检查 `jwtSecret` 是否与后端 `.env` 一致
- 确认 `userId` 对应的用户存在且未被禁用
- 检查后端服务是否正常运行

**问题 2：红包发送失败**
```
error: Open red packet error: Invalid chain red packet
```
**解决：**
- 确认机器人发送的 `content.type` 是 `'chainRedpacket'`
- 检查群组是否存在且开启了接龙红包功能
- 确认机器人用户是群组成员

**问题 3：余额不足**
```
error: Insufficient balance
```
**解决：**
- 给用户充值：
  ```javascript
  // 在 MongoDB 中执行
  db.users.updateOne(
    { _id: "10000002" },
    { $set: { balance: 999999999999 } }
  )
  ```

#### 5.3 调整发包频率

**临时调整（重启生效）：**
修改 `auto-redpacket-bot.js` 中的 `getRandomInterval()` 函数：
```javascript
function getRandomInterval() {
  // 例如：改为 1-3 分钟随机
  const minInterval = 1 * 60 * 1000;   // 1分钟
  const maxInterval = 3 * 60 * 1000;   // 3分钟
  return Math.floor(Math.random() * (maxInterval - minInterval) + minInterval);
}
```

然后重启：
```bash
pm2 restart redpacket-bot
```

---

### 6. 安全建议

1. **不要硬编码密钥**：将 `jwtSecret` 放入 `.env` 文件
2. **限制机器人权限**：仅赋予必要的群组访问权限
3. **监控异常行为**：定期检查日志，防止被滥用
4. **定期更换 Token**：虽然 Token 有效期 7 天，但建议定期更新
5. **备份配置**：保存好 `.env` 文件和机器人配置

---

### 7. 性能优化

**1. 减少日志输出**
生产环境可以注释掉部分 `console.log`，或使用日志库（如 `winston`）。

**2. 断线重连**
机器人已内置断线重连机制（5秒后自动重连）。

**3. 资源占用**
机器人非常轻量，内存占用 < 50MB，CPU 几乎为零。

---

**机器人部署完成！** 🎉
