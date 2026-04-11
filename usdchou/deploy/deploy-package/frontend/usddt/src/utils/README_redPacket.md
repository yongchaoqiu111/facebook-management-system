# 红包业务逻辑模块 (redPacket.js)

## 📋 模块概述

该模块统一管理所有红包类型的生成、发送和接收逻辑，避免在 `Chat.vue` 中重复编写相似的代码。

## 🎯 核心功能

### 1. 红包ID生成 (`generateRedPacketId`)

**作用**：生成全局唯一的红包ID，确保不同聊天场景下的红包不会冲突。

**格式规范**：
- 私聊红包：`pvt_${senderId}_${timestamp}_${random}`
- 群聊红包：`grp_${senderId}_${timestamp}_${random}`
- 接龙红包：`chn_${senderId}_${timestamp}_${random}`

**示例**：
```javascript
const redPacketId = generateRedPacketId('private', '123456')
// 输出: pvt_123456_1775587178377_a3f9k2m1x
```

---

### 2. 构建红包消息对象 (`buildRedPacketMessage`)

**作用**：将红包参数转换为标准化的前端消息对象，确保所有红包消息结构一致。

**输入参数**：
```javascript
{
  redPacketId: string,      // 红包唯一ID
  type: string,             // 红包类型: 'normal' | 'lucky' | 'chain'
  amount: number,           // 红包总金额
  count: number,            // 红包个数
  message: string,          // 祝福语
  time: string,             // 时间字符串 (HH:mm)
  senderId: string,         // 发送者ID
  senderName: string,       // 发送者名称
  receiverId?: string,      // 接收者ID（私聊必填）
  receiverName?: string,    // 接收者名称
  groupId?: string,         // 群聊ID（群聊必填）
  isChainRedPacket?: boolean, // 是否为接龙红包
  perAmount?: number        // 单个红包金额
}
```

**输出**：标准化的红包消息对象，包含 `type: 'redPacket'` 等固定字段。

---

### 3. 发送私聊红包 (`emitPrivateRedPacket`)

**作用**：通过 Socket 发送私聊红包给指定用户。

**使用示例**：
```javascript
const success = emitPrivateRedPacket({
  redPacketId: 'pvt_123_...',
  receiverId: '456',
  receiverName: '张三',
  type: 'lucky',
  amount: 100,
  message: '恭喜发财',
  senderId: '123',
  senderName: '我'
})
```

**Socket 事件**：`chat:sendPrivateRedPacket`

---

### 4. 发送群聊红包 (`emitGroupRedPacket`)

**作用**：通过 Socket 广播群聊红包给所有群成员。

**使用示例**：
```javascript
const success = emitGroupRedPacket({
  redPacketId: 'grp_123_...',
  groupId: 'group_789',
  type: 'normal',
  amount: 500,
  count: 10,
  message: '大家一起来抢红包',
  senderId: '123',
  senderName: '我',
  isChainRedPacket: true
})
```

**Socket 事件**：`chat:sendGroupRedPacket`

---

### 5. 验证红包归属 (`isRedPacketForCurrentChat`)

**作用**：判断收到的红包是否属于当前聊天窗口，避免在非相关聊天中显示红包。

**匹配规则**：
- **群聊红包**：检查 `groupId` 是否与当前群聊ID匹配
- **私聊红包**：检查发送者或接收者是否是当前聊天的参与者

**使用示例**：
```javascript
const isMatch = isRedPacketForCurrentChat(redPacketData, currentContact, currentUserId)
if (isMatch) {
  // 显示红包
}
```

---

### 6. 处理接收到的红包 (`processReceivedRedPacket`)

**作用**：将后端广播的红包数据转换为前端可显示的消息对象。

**处理内容**：
- 解析发送者和接收者信息（兼容对象和字符串格式）
- 生成时间戳
- 调用 `buildRedPacketMessage` 构建标准化对象

**使用示例**：
```javascript
onReceiveRedPacket((data) => {
  const redPacketMessage = processReceivedRedPacket(data, currentUserId)
  addMessage(redPacketMessage)
})
```

---

## 🔧 模块优势

### 1. **代码复用**
- 避免在 `Chat.vue` 中重复编写红包ID生成、消息构建等逻辑
- 所有红包相关操作集中在一个文件中

### 2. **易于维护**
- 修改红包逻辑只需改一处
- 新增红包类型时，只需扩展此模块

### 3. **类型安全**
- 统一的函数签名和返回值
- 减少因手动拼写对象导致的错误

### 4. **测试友好**
- 纯函数设计，易于单元测试
- 不依赖 Vue 组件状态

---

## 📝 使用建议

### ✅ 推荐做法
```javascript
// 1. 导入模块
import { generateRedPacketId, buildRedPacketMessage, emitPrivateRedPacket } from '../utils/redPacket'

// 2. 生成红包ID
const redPacketId = generateRedPacketId('private', userId)

// 3. 构建消息对象
const message = buildRedPacketMessage({ ... })

// 4. 发送红包
emitPrivateRedPacket({ ... })
```

### ❌ 避免做法
```javascript
// 不要在组件中手动拼接红包ID
const badId = 'mock_' + Date.now()

// 不要硬编码红包消息对象结构
const badMessage = {
  type: 'redPacket',
  redPacketType: ...,
  // ... 大量重复字段
}
```

---

## 🚀 未来扩展

如果需要支持新的红包类型（如定时红包、专属红包），只需：

1. 在 `generateRedPacketId` 中添加新的前缀
2. 在 `buildRedPacketMessage` 中添加新字段
3. 创建新的发送函数（如 `emitScheduledRedPacket`）

无需修改 `Chat.vue` 中的其他逻辑。
