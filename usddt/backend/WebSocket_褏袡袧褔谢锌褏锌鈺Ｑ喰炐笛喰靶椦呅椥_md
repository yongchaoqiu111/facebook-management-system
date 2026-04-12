# 前端 WebSocket 统一消息协议标准

## 📋 目录
- [1. ID 规范](#1-id-规范)
- [2. 消息分类](#2-消息分类)
- [3. 统一消息格式](#3-统一消息格式)
- [4. 前端发送事件](#4-前端发送事件)
- [5. 后端广播事件](#5-后端广播事件)
- [6. 红包相关](#6-红包相关)
- [7. 示例代码](#7-示例代码)

---

## 1. ID 规范

### 所有 ID 统一为纯数字字符串

| 类型 | 长度 | 起始值 | 示例 | 说明 |
|------|------|--------|------|------|
| **用户 ID** | 8位 | `10000000` | `"10000001"` | 自增，永不重复 |
| **群组 ID** | 7位 | `1000000` | `"1000001"` | 自增，永不重复 |
| **红包 ID** | 11位 | `10000000000` | `"10000000001"` | 自增，永不重复 |
| **消息 ID** | 12位 | `100000000000` | `"100000000001"` | 自增，永不重复 |

**优势：**
- ✅ 纯数字，前端后端统一处理
- ✅ 固定长度，容易校验
- ✅ 传输效率高（比 ObjectId 短）
- ✅ 后期加密解密简单（前后端各一个 JS 文件）

---

## 2. 消息分类

所有消息通过 `msgType` 字段区分：

| msgType | 类型 | 处理方式 | 说明 |
|---------|------|----------|------|
| `1` | 聊天消息 | 存数据库 + 广播 | 文本、图片、语音等 |
| `2` | 红包消息 | 存数据库 + 广播 | 发红包、领红包 |
| `3` | 系统通知 | 直接广播 | 成员加入/退出、踢人等 |

---

## 3. 统一消息格式

### 前端 → 后端（发送）

```javascript
socket.emit('chat:message', {
  msgType: 1,           // 消息类型：1=聊天, 2=红包, 3=系统
  msgId: "100000000001", // 消息ID（可选，后端可生成）
  senderId: "10000001",  // 发送者userId（必填）
  receiverId: null,      // 接收者userId（私聊必填，群聊null）
  groupId: "1000001",    // 群组ID（群聊必填，私聊null）
  content: {             // 消息内容（必填）
    type: "text",        // 内容类型：text/image/voice/redpacket
    text: "Hello"        // 具体内容
  },
  timestamp: Date.now()  // 时间戳（可选）
});
```

### 后端 → 前端（广播）

```javascript
{
  msgType: 1,            // 消息类型
  msgId: "100000000001", // 消息ID（唯一标识，用于去重）
  senderId: "10000001",  // 发送者userId
  receiverId: null,      // 接收者userId
  groupId: "1000001",    // 群组ID
  content: {
    type: "text",
    text: "Hello"
  },
  timestamp: 1234567890  // 服务器时间戳
}
```

---

## 4. 前端发送事件

### 4.1 发送聊天消息（msgType=1）

```javascript
// 群聊
socket.emit('chat:message', {
  msgType: 1,
  senderId: currentUser.userId,  // "10000001"
  groupId: currentGroup.id,      // "1000001"
  content: {
    type: "text",
    text: "大家好"
  }
});

// 私聊
socket.emit('chat:message', {
  msgType: 1,
  senderId: currentUser.userId,  // "10000001"
  receiverId: targetUser.userId, // "10000002"
  content: {
    type: "text",
    text: "你好"
  }
});
```

### 4.2 发送红包（msgType=2）

```javascript
// 普通红包
socket.emit('chat:message', {
  msgType: 2,
  senderId: currentUser.userId,
  groupId: currentGroup.id,
  content: {
    type: "redpacket",
    redPacketType: "normal",     // normal/lucky
    totalAmount: 100,            // 总金额
    count: 10,                   // 数量
    message: "恭喜发财"
  }
});

// 接龙红包
socket.emit('chat:message', {
  msgType: 2,
  senderId: currentUser.userId,
  groupId: currentGroup.id,
  content: {
    type: "chainRedpacket",
    message: "接龙红包"
  }
});
```

### 4.3 领取红包

```javascript
// HTTP 接口（暂时保留）
POST /api/redpackets/{redPacketId}/open

// 或者 WebSocket（推荐）
socket.emit('chat:redPacketOpen', {
  redPacketId: "10000000001",  // 红包ID
  userId: currentUser.userId    // 领取者ID
});
```

---

## 5. 后端广播事件

### 5.1 receiveMessage - 通用消息广播

**触发场景：** 聊天消息、红包消息

```javascript
socket.on('receiveMessage', (data) => {
  console.log('收到消息:', data);
  
  // 数据结构
  {
    msgType: 1,              // 消息类型
    msgId: "100000000001",   // 消息ID（用于去重）
    senderId: "10000001",    // 发送者ID
    groupId: "1000001",      // 群组ID
    content: {
      type: "text",
      text: "Hello"
    },
    timestamp: 1234567890
  }
});
```

### 5.2 redPacketReceived - 领红包结果

**触发场景：** 用户领取红包后

```javascript
socket.on('redPacketReceived', (data) => {
  console.log('领取红包结果:', data);
  
  // 数据结构
  {
    redPacketId: "10000000001",  // 红包ID
    senderId: "10000001",        // 发包人ID
    receiverId: "10000002",      // 领包人ID（当前用户）
    amount: 10,                  // 领取金额
    newBalance: 1000,            // 最新余额
    totalReceived: 50,           // 累计领取金额
    wasKicked: false,            // 是否被踢出
    kickReason: "",              // 踢出原因
    timestamp: 1234567890
  }
});
```

### 5.3 redPacketUpdated - 红包状态更新

**触发场景：** 有人领取红包后，更新红包剩余数量

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
});
```

### 5.4 memberKicked - 成员被踢出

**触发场景：** 用户达到领取上限被踢出群

```javascript
socket.on('memberKicked', (data) => {
  console.log('成员被踢出:', data);
  
  // 数据结构
  {
    userId: "10000002",          // 被踢用户ID
    reason: "累计领取达到50USDT", // 踢出原因
    timestamp: 1234567890
  }
});
```

### 5.5 groupListUpdated - 群组列表更新

**触发场景：** 用户连接时、加入新群时、退出群时

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
          isChainRedPacket: false,
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
          ticketAmount: 10,
          kickThreshold: 50
        }
      }
    ],
    timestamp: 1234567890
  }
});
```

### 5.6 friendListUpdated - 好友列表更新

**触发场景：** 用户连接时、添加好友时、删除好友时

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
});
```

### 5.7 userStatusChanged - 用户在线状态变化

**触发场景：** 用户上线/下线时广播给所有人

```javascript
socket.on('userStatusChanged', (data) => {
  console.log('用户状态变化:', data);
  
  // 数据结构
  {
    userId: "10000001",           // 用户ID
    online: true,                 // true=上线, false=下线
    timestamp: 1234567890
  }
});
```

---

## 6. 红包相关

### 6.1 发红包流程

```
前端 → socket.emit('chat:message', {msgType: 2, ...})
     ↓
后端 → 扣款 + 创建红包记录
     ↓
后端 → socket.broadcast.to(`group:${groupId}`).emit('receiveMessage', {...})
     ↓
前端 → 收到 receiveMessage，显示红包气泡
```

### 6.2 领红包流程

```
前端 → POST /api/redpackets/{id}/open
     ↓
后端 → 校验 + 转账 + 更新累计金额
     ↓
后端 → socket.to(`user:${userId}`).emit('redPacketReceived', {...})
后端 → socket.to(`group:${groupId}`).emit('redPacketUpdated', {...})
     ↓
前端 → 收到 redPacketReceived，更新余额和累计金额
前端 → 收到 redPacketUpdated，更新红包UI
```

### 6.3 红包消息数据结构

**receiveMessage 中的红包内容：**

```javascript
{
  msgType: 2,
  msgId: "100000000001",
  senderId: "10000001",
  groupId: "1000001",
  content: {
    type: "redpacket",
    redPacketId: "10000000001",  // 红包ID
    redPacketType: "normal",     // normal/lucky/chain
    totalAmount: 100,            // 总金额
    count: 10,                   // 总数量
    remainCount: 8,              // 剩余数量
    message: "恭喜发财",
    createdAt: "2026-04-09T10:30:00.000Z"
  },
  timestamp: 1234567890
}
```

### 6.4 创建六合红包（WebSocket）

**发送事件：** `chat:createLiuheRedPacket`

```javascript
socket.emit('chat:createLiuheRedPacket', {
  prizePool: 100,           // 奖池金额（USDT）
  groupId: "1000001",       // 群组ID（必须是“六合天下”群）
  bettingDuration: 30       // 投注时长（分钟）
});
```

**响应事件：** `liuheRedPacketCreated`

```javascript
socket.on('liuheRedPacketCreated', (data) => {
  console.log('创建成功:', data);
  // data: { success: true, data: {...}, message: '...' }
});
```

**群组广播事件：** `newLiuheRedPacket`（其他成员收到）

```javascript
socket.on('newLiuheRedPacket', (data) => {
  console.log('新六合红包:', data);
  // data: { success: true, data: {...}, message: '...' }
});
```

---

## 7. 示例代码

### 7.1 React/Vue 集成示例

```javascript
import io from 'socket.io-client';

class ChatService {
  constructor() {
    this.socket = io('http://localhost:5000');
    this.setupListeners();
  }

  setupListeners() {
    // 监听通用消息
    this.socket.on('receiveMessage', (data) => {
      this.handleMessage(data);
    });

    // 监听领红包结果
    this.socket.on('redPacketReceived', (data) => {
      this.updateBalance(data.newBalance);
      this.showNotification(`领取红包 ${data.amount} USDT`);
      
      if (data.wasKicked) {
        this.showAlert(`你已被踢出群组：${data.kickReason}`);
      }
    });

    // 监听红包状态更新
    this.socket.on('redPacketUpdated', (data) => {
      this.updateRedPacketUI(data.redPacketId, data.remainCount);
    });

    // 监听成员被踢
    this.socket.on('memberKicked', (data) => {
      this.showSystemMessage(`用户 ${data.userId} 已被踢出：${data.reason}`);
    });
  }

  // 发送聊天消息
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

  // 发送红包
  sendRedPacket(groupId, redPacketData) {
    this.socket.emit('chat:message', {
      msgType: 2,
      senderId: this.currentUserId,
      groupId: groupId,
      content: {
        type: "redpacket",
        ...redPacketData
      }
    });
  }

  // 领取红包
  async openRedPacket(redPacketId) {
    const response = await fetch(`/api/redpackets/${redPacketId}/open`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.json();
  }

  handleMessage(data) {
    // 去重逻辑
    if (this.processedMessages.has(data.msgId)) {
      return;
    }
    this.processedMessages.add(data.msgId);

    // 根据消息类型处理
    if (data.content.type === 'redpacket') {
      this.renderRedPacketBubble(data);
    } else {
      this.renderTextMessage(data);
    }
  }
}

export default new ChatService();
```

### 7.2 消息去重逻辑

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
    
    // 限制集合大小，防止内存泄漏
    if (this.processedMessages.size > this.maxSize) {
      const firstKey = this.processedMessages.values().next().value;
      this.processedMessages.delete(firstKey);
    }
    
    return false;
  }

  clear() {
    this.processedMessages.clear();
  }
}
```

---

## 8. 注意事项

### 8.1 ID 处理
- ✅ 所有 ID 都是**字符串类型**（即使内容是数字）
- ✅ 前端不要做任何 ID 转换或计算
- ✅ 直接使用后端返回的 ID

### 8.2 消息去重
- ✅ 使用 `msgId` 进行去重
- ✅ 维护一个 Set 存储已处理的消息 ID
- ✅ 定期清理旧数据，防止内存泄漏

### 8.3 错误处理
- ✅ 监听 `connect_error` 事件
- ✅ 实现自动重连机制
- ✅ 网络异常时给出友好提示

### 8.4 性能优化
- ✅ 避免频繁发送小消息，适当合并
- ✅ 大量消息时使用虚拟滚动
- ✅ 离线消息拉取时分页加载

---

## 9. 测试清单

前端开发完成后，请测试以下场景：

- [ ] 发送文本消息，其他用户能实时收到
- [ ] 发送红包，其他用户能看到红包气泡
- [ ] 领取红包，余额和累计金额实时更新
- [ ] 红包抢完后，UI 显示"已抢完"
- [ ] 被踢出群后，收到系统通知
- [ ] 刷新页面后，消息不重复显示
- [ ] 网络断开后，能自动重连
- [ ] 多个设备同时登录，消息同步正常

---

## 10. 常见问题

### Q1: 为什么不用 ObjectId？
A: ObjectId 太长（24位），包含字母和数字，不利于：
- 前端处理和校验
- 后期加密解密
- 日志排查和调试

### Q2: ID 会不会用完？
A: 
- 用户 ID（8位）：最大 99,999,999，足够用
- 群组 ID（7位）：最大 9,999,999，足够用
- 红包 ID（11位）：最大 999,999,999,999，每天发 1 亿个也能用 27 年

### Q3: 如何保证 ID 不重复？
A: 使用 MongoDB 原子操作 `$inc`，高并发下也能保证唯一性。

### Q4: 后期如何加密 ID？
A: 前后端各部署一个相同的加密 JS 文件：
```javascript
// crypto.js（前后端共用）
function encryptId(id) {
  return btoa(id).split('').reverse().join('');
}

function decryptId(encrypted) {
  return atob(encrypted.split('').reverse().join(''));
}
```

---

**文档版本：** v1.0  
**更新时间：** 2026-04-09  
**联系人：** 后端开发团队
