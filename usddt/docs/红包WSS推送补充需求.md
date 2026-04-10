# 红包 WSS 实时推送补充需求

> **优先级：🔴 最高**  
> **原因**：红包数据的实时性比聊天更重要，直接影响用户体验和资金安全  
> **提交时间**：2026-04-07  
> **提交人**：前端团队  
> **后端反馈**：✅ **已确认并实施**（见《消息系统架构-后端反馈.md》）

---

## ✅ 后端已确认实施方案

**后端已在《消息系统架构-后端反馈.md》中详细实现了所有需求**：

### 1. 接龙红包进度推送 ✅
- 事件名：`chainRedPacketProgress`
- 实现位置：Phase 2, 第 743-755 行
- 包含字段：totalClaimed, threshold, entryFee, remainToThreshold, isExceeded, topClaimers
- 并发控制：MongoDB 事务 + 原子操作（第 673-831 行）

### 2. 红包领取明细推送 ✅
- 事件名：`redPacketClaimed`
- 实现位置：Phase 2, 第 758-769 行
- 推送范围：群内所有人

### 3. 红包状态更新 ✅
- 事件名：`redPacketStatusUpdate`
- 实现位置：Phase 2, 第 782-791 行
- 触发条件：超过阈值或领完

### 4. 我的抢红包结果 ✅
- 事件名：`myRedPacketResult`
- 实现位置：Phase 2, 第 772-779 行
- 推送范围：仅自己

### 5. 余额变动推送 ✅
- 事件名：`balanceChange`
- 实现位置：Phase 2, 第 795-801 行
- 隐私保护：只推送给当前用户

### 6. 审计推送 ✅
- 所有红包操作都推送到审计服务器
- 实现位置：Phase 2, 第 804-814 行
- 确保企业级安全

---

## 📋 原始需求（供参考）

## 📋 背景说明

在之前的架构设计中，我们遗漏了**红包相关的实时 WSS 推送**。经过重新评估，发现：

1. **红包领取频率高**：一个群红包可能被 10-50 人快速领取
2. **数据实时性要求高**：用户需要立即看到谁领了多少、还剩多少
3. **金额变动频繁**：每次领取都涉及余额变化，必须实时同步

**当前问题**：
- ❌ 缺少红包领取明细的实时推送
- ❌ 缺少红包状态更新（领完/过期）的推送
- ❌ 抢红包结果依赖 HTTP 轮询，体验差

---

## 🎯 需要补充的 4 个 Socket 事件

### 0️⃣ chainRedPacketProgress - 接龙红包进度推送（❗ 核心业务）

**触发时机**：
- 每当有人领取接龙红包时
- 累计金额发生变化时
- 达到阈值（380 USDT）时

**推送范围**：`io.to(\`group:${groupId}\`).emit('chainRedPacketProgress', data)`

**数据格式**：
```javascript
{
  "redPacketId": "69d5f2c3c0fe62ba5e42b94f",
  "chainGroupId": "69d4ac8de8e03b8ae3397bb7",
  "totalClaimed": 379.5,        // 当前累计领取金额（USDT）
  "threshold": 380,             // 阈值（固定 380）
  "entryFee": 310,              // 进群费（固定 310）
  "remainToThreshold": 0.5,     // 距离阈值还剩多少
  "isExceeded": false,          // 是否已超过阈值
  "status": "active",           // active | exceeded | finished
  "topClaimers": [              // 领取排行榜（前3名）
    {
      "userId": "user_123",
      "username": "李四",
      "avatar": "https://...",
      "claimedAmount": 50,
      "claimedAt": "2026-04-08T10:30:00.000Z"
    }
  ],
  "timestamp": "2026-04-08T10:30:00.000Z"
}
```

**前端用途**：
- ✅ 实时更新接龙进度条（显示 379.5 / 380 USDT）
- ✅ 显示距离阈值还剩多少（0.5 USDT）
- ✅ 超过阈值时立即禁用领取按钮（多 1 毛都不行）
- ✅ 显示实时排行榜（谁领得最多）
- ✅ 超过阈值时显示警告提示

**业务规则**：
```
进群费：310 USDT
阈值：380 USDT
规则：累计领取金额 >= 380 时，禁止继续领取
精度：小数点后 2 位（0.01 USDT）
```

**实现建议**：
```javascript
// 后端伪代码
RedPacketModel.findByIdAndUpdate(redPacketId, {
  $inc: { 
    remainCount: -1, 
    remainAmount: -claimAmount,
    totalClaimed: claimAmount  // 累加领取金额
  },
  $push: { claims: { userId, amount, claimedAt } }
}).then(async (redPacket) => {
  const totalClaimed = redPacket.totalClaimed || 0;
  const threshold = 380;
  const isExceeded = totalClaimed >= threshold;
  
  // 推送进度给群内所有人
  io.to(`group:${redPacket.groupId}`).emit('chainRedPacketProgress', {
    redPacketId: redPacket._id,
    chainGroupId: redPacket.chainGroupId,
    totalClaimed: totalClaimed,
    threshold: threshold,
    entryFee: 310,
    remainToThreshold: Math.max(0, threshold - totalClaimed),
    isExceeded: isExceeded,
    status: isExceeded ? 'exceeded' : 'active',
    topClaimers: await getTopClaimers(redPacket._id, 3),
    timestamp: new Date().toISOString()
  });
  
  // 如果超过阈值，额外推送状态更新
  if (isExceeded) {
    io.to(`group:${redPacket.groupId}`).emit('redPacketStatusUpdate', {
      redPacketId: redPacket._id,
      status: 'exceeded',
      reason: `累计领取 ${totalClaimed} USDT，已超过阈值 ${threshold} USDT`,
      timestamp: new Date().toISOString()
    });
  }
});
```

**注意事项**：
1. **精度问题**：使用 Decimal 类型避免浮点数误差
2. **并发控制**：使用原子操作确保不会超发
3. **实时性**：每次领取都必须推送，延迟 < 50ms
4. **边界处理**：379.99 + 0.02 = 380.01 > 380，应该拒绝

---

### 1️⃣ redPacketClaimed - 红包领取明细推送

**触发时机**：每当有人领取红包时，立即推送给**群内所有在线用户**

**推送范围**：`io.to(\`group:${groupId}\`).emit('redPacketClaimed', data)`

**数据格式**：
```javascript
{
  "redPacketId": "69d5f2c3c0fe62ba5e42b94f",
  "claimer": {
    "_id": "user_123",
    "username": "李四",
    "avatar": "https://example.com/avatar.jpg"
  },
  "amount": 20,                    // 领取金额（USDT）
  "remainCount": 5,                // 剩余个数
  "remainAmount": 80,              // 剩余金额（USDT）
  "timestamp": "2026-04-08T10:30:00.000Z"
}
```

**前端用途**：
- ✅ 实时更新红包账单列表（显示"李四 领取了 20 USDT"）
- ✅ 更新红包卡片上的剩余数量和金额
- ✅ 播放领取动画/音效

**实现建议**：
```javascript
// 后端伪代码
RedPacketModel.findByIdAndUpdate(redPacketId, {
  $inc: { remainCount: -1, remainAmount: -claimAmount },
  $push: { claims: { userId, amount, claimedAt } }
}).then(async (redPacket) => {
  // 推送给群内所有人
  io.to(`group:${redPacket.groupId}`).emit('redPacketClaimed', {
    redPacketId: redPacket._id,
    claimer: await getUserInfo(userId),
    amount: claimAmount,
    remainCount: redPacket.remainCount,
    remainAmount: redPacket.remainAmount,
    timestamp: new Date().toISOString()
  });
});
```

---

### 2️⃣ redPacketStatusUpdate - 红包状态更新

**触发时机**：
- 红包被领完（remainCount === 0）
- 红包过期（expiredAt < now）
- 红包被撤回（如果支持）

**推送范围**：`io.to(\`group:${groupId}\`).emit('redPacketStatusUpdate', data)`

**数据格式**：
```javascript
{
  "redPacketId": "69d5f2c3c0fe62ba5e42b94f",
  "status": "finished",            // active | finished | expired | revoked
  "remainCount": 0,
  "remainAmount": 0,
  "totalClaims": 10,               // 总领取人数
  "timestamp": "2026-04-08T10:30:00.000Z"
}
```

**前端用途**：
- ✅ 红包卡片显示"已领完"或"已过期"
- ✅ 禁用点击打开按钮
- ✅ 更新 UI 状态（灰色显示）

**实现建议**：
```javascript
// 后端伪代码
if (redPacket.remainCount === 0) {
  io.to(`group:${redPacket.groupId}`).emit('redPacketStatusUpdate', {
    redPacketId: redPacket._id,
    status: 'finished',
    remainCount: 0,
    remainAmount: 0,
    totalClaims: redPacket.claims.length,
    timestamp: new Date().toISOString()
  });
}
```

---

### 3️⃣ myRedPacketResult - 我的抢红包结果

**触发时机**：当**当前用户**成功领取红包后，立即推送给**该用户**

**推送范围**：`socket.to(\`user:${userId}\`).emit('myRedPacketResult', data)`

**数据格式**：
```javascript
{
  "redPacketId": "69d5f2c3c0fe62ba5e42b94f",
  "amount": 20,                    // 领取金额
  "message": "恭喜发财，大吉大利",  // 红包祝福语
  "from": "张三",                  // 发送者昵称
  "balance": 480,                  // 领取后的余额
  "timestamp": "2026-04-08T10:30:00.000Z"
}
```

**前端用途**：
- ✅ 立即显示抢红包结果弹窗（无需等待 HTTP 响应）
- ✅ 更新钱包余额显示
- ✅ 播放庆祝动画/音效

**优势**：
- 🚀 用户体验提升：从 HTTP 轮询的 500ms+ 降低到 WSS 的 <50ms
- 💰 减少服务器压力：无需频繁查询余额

**实现建议**：
```javascript
// 后端伪代码
RedPacketModel.open(redPacketId, userId).then(async (result) => {
  // 推送给我自己
  io.to(`user:${userId}`).emit('myRedPacketResult', {
    redPacketId: result.redPacketId,
    amount: result.amount,
    message: result.redPacket.message,
    from: result.redPacket.sender.username,
    balance: await getUserBalance(userId),
    timestamp: new Date().toISOString()
  });
});
```

---

## 📊 与现有事件的对比

| 事件名 | 当前状态 | 推送内容 | 推送范围 | 优先级 |
|--------|---------|---------|---------|--------|
| `groupRedPacket` | ✅ 已有 | 红包发送通知 | 群内所有人 | 中 |
| `redPacketOpened` | ⚠️ 模糊 | 红包被打开（无明细） | ？ | 低 |
| **`chainRedPacketProgress`** | ❌ **缺失** | **接龙进度+阈值** | **群内所有人** | **🔴 最高** |
| **`redPacketClaimed`** | ❌ **缺失** | **领取明细+剩余量** | **群内所有人** | **🔴 最高** |
| **`redPacketStatusUpdate`** | ❌ **缺失** | **状态变更** | **群内所有人** | **🔴 最高** |
| **`myRedPacketResult`** | ❌ **缺失** | **我的领取结果** | **仅自己** | **🔴 最高** |
| `balanceChange` | ✅ 计划中 | 余额变动通用通知 | 仅自己 | 高 |

---

## 🔧 实施建议

### Phase 1：核心事件（立即实施）
- [ ] 实现 `chainRedPacketProgress` 事件（接龙进度）
- [ ] 实现 `redPacketClaimed` 事件
- [ ] 实现 `myRedPacketResult` 事件
- [ ] 测试接龙红包领取流程

**预计工期**：1 天

### Phase 2：状态管理（本周内）
- [ ] 实现 `redPacketStatusUpdate` 事件
- [ ] 添加红包过期定时任务
- [ ] 测试边界情况（并发领取、网络断开）

**预计工期**：0.5 天

### Phase 3：优化（可选）
- [ ] 添加领取排行榜推送
- [ ] 添加红包雨特效数据
- [ ] 性能优化（批量推送）

---

## ⚠️ 注意事项

### 1. 并发控制
**问题**：多人同时领取最后一个红包  
**解决**：使用 MongoDB 原子操作 `$inc` + 条件查询
```javascript
RedPacketModel.findOneAndUpdate(
  { 
    _id: redPacketId, 
    remainCount: { $gt: 0 }  // 确保还有剩余
  },
  { 
    $inc: { remainCount: -1, remainAmount: -claimAmount },
    $push: { claims: { userId, amount, claimedAt: new Date() } }
  },
  { new: true }
)
```

### 2. 推送顺序
**正确顺序**：
1. 数据库更新（原子操作）
2. 推送 `redPacketClaimed` 给群内所有人
3. 推送 `myRedPacketResult` 给领取者
4. 如果领完，推送 `redPacketStatusUpdate`

### 3. 失败处理
**如果 WSS 推送失败**：
- ❌ 不回滚数据库（消息已持久化）
- ✅ 记录日志，后续补偿
- ✅ 前端通过 HTTP 查询兜底

### 4. 性能优化
**高频场景**：50 人同时抢 10 个红包  
**优化方案**：
- 使用 Redis 缓存剩余数量
- 批量推送（每 100ms 合并一次）
- 限制推送频率（每人每秒最多 10 次）

---

## 📝 前端对接示例

### 监听红包领取明细
```javascript
import { getSocket } from '@/socket'

const socket = getSocket()

socket.on('redPacketClaimed', (data) => {
  console.log('有人领取红包:', data)
  
  // 更新红包账单列表
  updateRedPacketBill(data.redPacketId, {
    claimer: data.claimer,
    amount: data.amount,
    timestamp: data.timestamp
  })
  
  // 更新剩余数量
  updateRemainCount(data.redPacketId, {
    remainCount: data.remainCount,
    remainAmount: data.remainAmount
  })
})
```

### 监听我的抢红包结果
```javascript
socket.on('myRedPacketResult', (data) => {
  console.log('我抢到了红包:', data)
  
  // 显示结果弹窗
  showRedPacketResultModal({
    amount: data.amount,
    message: data.message,
    from: data.from
  })
  
  // 更新余额
  updateBalance(data.balance)
})
```

### 监听红包状态更新
```javascript
socket.on('redPacketStatusUpdate', (data) => {
  console.log('红包状态变更:', data)
  
  // 更新红包卡片状态
  updateRedPacketStatus(data.redPacketId, {
    status: data.status,
    remainCount: data.remainCount
  })
})
```

---

## ✅ 验收标准

### 功能验收
- [ ] **接龙进度实时显示**：领取后 <50ms 内更新进度条（379.5 / 380）
- [ ] **阈值精确控制**：累计 >= 380 时，立即禁用领取按钮（多 0.01 都不行）
- [ ] 领取红包后，群内其他人能在 <100ms 内看到领取明细
- [ ] 领取红包后，本人能在 <50ms 内看到结果弹窗
- [ ] 红包领完后，所有用户能看到“已领完”状态
- [ ] 并发领取时，不会出现超发（remainCount < 0 或 totalClaimed > threshold）

### 性能验收
- [ ] 50 人同时抢红包，服务器 CPU < 80%
- [ ] WSS 推送延迟 < 100ms（P95）
- [ ] 接龙进度更新延迟 < 50ms（P95）
- [ ] 无消息丢失（100% 送达率）

### 兼容性验收
- [ ] 与现有的 `groupRedPacket` 事件不冲突
- [ ] 与 `balanceChange` 事件协同工作
- [ ] 旧版本客户端不受影响

---

## 📞 联系方式

如有疑问，请联系前端团队：
- **负责人**：_____________
- **联系方式**：_____________
- **期望完成时间**：2026-04-08（明天）

---

**感谢后端团队的支持！一起打造流畅的红包体验！🎉**
