# USDCHOU 前端对接完整文档

## 📋 文档说明

本文档包含后端所有已实现的 API 接口，前端可以据此进行对接开发。

**后端状态**: ✅ 已完成并运行中  
**服务地址**: `http://localhost:5000`  
**数据库**: MongoDB (已清空，可重新注册)  
**TRON 钱包**: ✅ 已配置  

---

## 🔑 核心功能概览

### **1. 用户系统**
- ✅ 用户注册（自动生成 8 位数字 userId）
- ✅ 用户登录
- ✅ 获取用户信息

### **2. 好友系统**
- ✅ 搜索用户（支持 userId 或用户名）
- ✅ 发送好友请求
- ✅ 获取好友列表
- ✅ 获取好友请求
- ✅ 接受/拒绝好友请求

### **3. 钱包系统**
- ✅ 获取钱包信息（余额 + 充值地址）
- ✅ 自动生成用户专属充值地址
- ✅ 估算提现手续费（动态计算）
- ✅ 申请提现（自动化处理）
- ✅ 获取交易记录

### **4. 红包系统**
- ✅ 创建红包
- ✅ 抢红包
- ✅ 获取红包详情

### **5. 聊天系统**
- ✅ Socket.io 实时通讯
- ✅ 发送消息
- ✅ 接收消息

---

## 📡 API 接口详解

### **基础信息**

- **Base URL**: `http://localhost:5000/api`
- **认证方式**: Bearer Token
- **请求头**: 
  ```
  Authorization: Bearer <token>
  Content-Type: application/json
  ```

---

## 1️⃣ 认证模块

### **1.1 用户注册**

```http
POST /api/auth/register
Content-Type: application/json
```

**请求体**:
```json
{
  "username": "张三",
  "phone": "13800138000",
  "password": "123456"
}
```

**响应**:
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "65a5f1234567890abcdef1234",
      "userId": "56781234",
      "username": "张三",
      "phone": "13800138000",
      "balance": 0
    }
  }
}
```

**重要说明**:
- ✅ `userId` 是 8 位纯数字，系统自动生成
- ✅ 用于好友搜索和添加
- ✅ 一旦生成不可修改

**错误响应**:
```json
{
  "success": false,
  "error": {
    "code": "USERNAME_EXISTS",
    "message": "用户名已存在",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### **1.2 用户登录**

```http
POST /api/auth/login
Content-Type: application/json
```

**请求体**:
```json
{
  "phone": "13800138000",
  "password": "123456"
}
```

**响应**:
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "65a5f1234567890abcdef1234",
      "userId": "56781234",
      "username": "张三",
      "phone": "13800138000",
      "balance": 100
    }
  }
}
```

---

### **1.3 获取当前用户信息**

```http
GET /api/users/me
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "65a5f1234567890abcdef1234",
    "userId": "56781234",
    "username": "张三",
    "phone": "13800138000",
    "avatar": "",
    "balance": 100,
    "depositAddress": "TUserDepositAddressXxxxx",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## 2️⃣ 好友模块

### **2.1 搜索用户**

```http
GET /api/friends/search?keyword=56781234
Authorization: Bearer <token>
```

**参数**:
- `keyword`: 搜索关键词
  - 纯数字：精确匹配 userId（如 `56781234`）
  - 非数字：模糊匹配用户名（如 `张三`）
  - 最少 2 个字符

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "65a5f1234567890abcdef1234",
      "userId": "56781234",
      "username": "张三",
      "avatar": "👤"
    }
  ]
}
```

---

### **2.2 发送好友请求**

```http
POST /api/friends
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**:
```json
{
  "userId": "56781234",
  "message": "你好，我想加你为好友"
}
```

**响应**:
```json
{
  "success": true,
  "message": "好友请求发送成功",
  "data": {
    "friendRequest": {
      "_id": "...",
      "sender": {
        "_id": "...",
        "username": "李四",
        "avatar": "👤"
      },
      "message": "你好，我想加你为好友",
      "status": "pending",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "用户不存在，请检查用户ID",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### **2.3 获取好友列表**

```http
GET /api/friends
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "65a5f1234567890abcdef5678",
      "userId": "87654321",
      "username": "李四",
      "avatar": "👤",
      "phone": "139****1234",
      "remark": "",
      "status": "accepted",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### **2.4 获取好友请求**

```http
GET /api/friends/requests
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "received": [
      {
        "_id": "...",
        "sender": {
          "_id": "...",
          "userId": "12345678",
          "username": "王五",
          "avatar": "👤"
        },
        "message": "你好",
        "status": "pending",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "sent": []
  }
}
```

---

### **2.5 接受好友请求**

```http
PUT /api/friends/requests/:id/accept
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "message": "已接受好友请求"
}
```

---

### **2.6 拒绝好友请求**

```http
PUT /api/friends/requests/:id/reject
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "message": "已拒绝好友请求"
}
```

---

## 3️⃣ 钱包模块 ⭐⭐⭐

### **3.1 获取钱包信息**（重要）

```http
GET /api/wallet/info
Authorization: Bearer <token>
```

**功能说明**:
- ✅ 返回用户余额
- ✅ 首次访问时自动生成专属充值地址
- ✅ 后续访问返回相同地址

**响应**:
```json
{
  "success": true,
  "data": {
    "balance": 100,
    "depositAddress": "TUserDepositAddressXxxxx",
    "platformName": "USDCHOU Platform",
    "note": "请只向此地址充值 USDT-TRC20，充值将自动到账"
  }
}
```

**重要说明**:
- 🎯 `depositAddress` 是用户的专属充值地址
- 🎯 **首次访问 `/api/wallet/info` 时自动生成**
- 🎯 由平台生成并保管私钥
- 🎯 用户只能看到公钥地址
- 🎯 充值到此地址会自动更新余额
- 🎯 每个用户有唯一的地址

**注意**: 注册时不会立即生成地址，需要调用钱包接口才会触发创建。

---

### **3.2 估算提现手续费**

```http
GET /api/wallet/withdraw-fee?amount=100
Authorization: Bearer <token>
```

**参数**:
- `amount`: 提现金额（可选，用于计算总扣除额）

**响应**:
```json
{
  "success": true,
  "data": {
    "fee": {
      "inTRX": 13.5,
      "inUSDT": 1.62,
      "breakdown": {
        "energyFee": 12.5,
        "bandwidthFee": 1.0,
        "hasEnoughEnergy": false,
        "hasEnoughBandwidth": true
      }
    },
    "price": {
      "trxToUSDT": 0.12,
      "timestamp": "2024-01-15T10:30:00.000Z"
    },
    "resources": {
      "current": {
        "energy": 5000,
        "bandwidth": 1500
      },
      "required": {
        "energy": 15000,
        "bandwidth": 500
      }
    },
    "withdrawal": {
      "amount": 100,
      "fee": 1.62,
      "totalDeduction": 101.62,
      "actualReceived": 100
    },
    "note": "⚠️ Energy 不足（缺 10000），预计手续费: 1.62 USDT"
  }
}
```

**重要说明**:
- 💰 手续费是动态计算的
- 💰 根据平台资源情况调整
- 💰 用户承担手续费
- 💰 提现 100 USDT，实际扣除 101.62 USDT

---

### **3.3 申请提现**

```http
POST /api/wallet/withdraw
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**:
```json
{
  "amount": 100,
  "walletAddress": "TUserExternalAddressXxxxx"
}
```

**验证规则**:
- 最低提现: 10 USDT
- 最高提现: 10000 USDT
- 余额必须 >= 提现金额 + 手续费
- 地址必须是有效的 TRON 地址

**响应**:
```json
{
  "success": true,
  "message": "提现申请已提交",
  "data": {
    "balance": 898.38,
    "transaction": {
      "_id": "...",
      "type": "withdraw",
      "amount": 100,
      "fee": 1.62,
      "status": "completed",
      "txId": "a1b2c3d4e5f6...",
      "walletAddress": "TUserExternalAddressXxxxx",
      "blockchainNetwork": "TRON"
    },
    "fee": 1.62,
    "actualReceived": 100,
    "note": "手续费 1.62 USDT 已从您的余额中扣除"
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "error": {
    "code": "BALANCE_INSUFFICIENT",
    "message": "余额不足，需要 101.62 USDT（含手续费 1.62 USDT）",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### **3.4 获取交易记录**

```http
GET /api/wallet/transactions?page=1&limit=20
Authorization: Bearer <token>
```

**参数**:
- `page`: 页码（默认 1）
- `limit`: 每页数量（默认 20）

**响应**:
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "_id": "...",
        "type": "recharge",
        "amount": 100,
        "status": "completed",
        "txId": "abc123...",
        "depositAddress": "TUserDepositAddressXxxxx",
        "createdAt": "2024-01-15T10:30:00.000Z"
      },
      {
        "_id": "...",
        "type": "withdraw",
        "amount": 50,
        "fee": 1.5,
        "status": "completed",
        "txId": "def456...",
        "walletAddress": "TExternalAddress",
        "createdAt": "2024-01-15T11:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 2,
      "pages": 1
    }
  }
}
```

---

## 4️⃣ 红包模块

### **4.1 创建红包（通用）**

```http
POST /api/redpackets
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**:
```json
{
  "type": "lucky",
  "totalAmount": 100,
  "count": 10,
  "message": "恭喜发财",
  "roomId": "69d4ac8de8e03b8ae3397bb7"
}
```

**参数说明**:
- `type`: 红包类型（必填）
  - `"lucky"`: 拼手气红包（金额随机分配）
  - `"normal"`: 普通红包（平均分配）
- `totalAmount`: 总金额（必填，最小 0.01）
- `count`: 红包数量（必填）
  - 拼手气红包最少 2 个
  - 普通红包最少 1 个
- `message`: 红包祝福语（可选）
- `roomId`: 房间ID/群组ID（必填）

**响应**:
```json
{
  "success": true,
  "message": "红包创建成功",
  "data": {
    "redPacket": {
      "_id": "69d6c953713d9e7d19d4a362",
      "sender": {
        "_id": "69d658d7cb4369f44d6918bd",
        "username": "张三",
        "avatar": "👤"
      },
      "type": "lucky",
      "totalAmount": 100,
      "count": 10,
      "message": "恭喜发财",
      "roomId": "69d4ac8de8e03b8ae3397bb7",
      "amounts": [15.5, 8.2, 12.3, ...],
      "remainAmount": 100,
      "remainCount": 10,
      "createdAt": "2026-04-09T07:38:00.000Z"
    }
  }
}
```

**验证规则**:
- ✅ 拼手气红包：`totalAmount >= count * 0.01`
- ✅ 余额必须 >= `totalAmount`
- ✅ 自动扣除余额并创建交易记录
- ✅ 通过 Socket 广播到房间

---

### **4.2 抢红包**

```http
POST /api/redpackets/:id/open
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "message": "恭喜抢到红包",
  "data": {
    "amount": 12.5,
    "remainCount": 9,
    "isLast": false
  }
}
```

---

### **4.3 接龙红包 (Chain Red Packet) ⭐**

**重要说明**: 只能在接龙群中使用。

#### **4.3.1 加入接龙群（正式环境 - 3小时冷却）**
```http
POST /api/redpackets/chain/join
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**:
```json
{
  "groupId": "69d4ac8de8e03b8ae3397bb7"
}
```

**参数说明**:
- `groupId`: 群组ID（必填）

**响应**:
```json
{
  "success": true,
  "message": "操作成功",
  "data": {
    "group": { ... },
    "redPacket": { ... },
    "canGrabAfter": "2026-04-09T10:30:00.000Z",
    "remainingBalance": 1000,
    "message": "加入接龙群成功，3小时后可领取红包"
  }
}
```

**功能说明**:
- ✅ 扣除门票 + 首包金额
- ✅ 自动发送新人首包
- ✅ 设置 3 小时冷却时间
- ✅ 使用 Redis 统计累计领取金额

---

#### **4.3.2 加入接龙群（测试环境 - 3秒冷却）**
```http
POST /api/redpackets/chain/join-test
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**:
```json
{
  "groupId": "69d4ac8de8e03b8ae3397bb7"
}
```

**响应**:
```json
{
  "success": true,
  "message": "操作成功",
  "data": {
    "group": { ... },
    "redPacket": { ... },
    "canGrabAfter": "2026-04-09T07:38:08.000Z",
    "remainingBalance": 1000,
    "message": "加入接龙群成功，3秒后可领取红包（测试模式）"
  }
}
```

**功能说明**:
- ✅ 扣除门票 + 首包金额
- ✅ 自动发送新人首包
- ✅ 设置 3 秒冷却时间（测试用）
- ✅ 不使用 Redis，直接使用 MongoDB 字段统计

---

#### **4.3.3 创建接龙红包**
```http
POST /api/redpackets/chain
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**:
```json
{
  "groupId": "69d4ac8de8e03b8ae3397bb7",
  "message": "接龙红包"
}
```

**参数说明**:
- `groupId`: 群组ID（必填）
- `message`: 红包消息（可选，默认"接龙红包"）

**重要说明**:
- ⚠️ **不需要传 `perAmount` 和 `count`**
- ✅ 系统自动从群组配置中读取：
  - `group.settings.redPacketPerAmount`（单个红包金额，默认 10 USDT）
  - `group.settings.redPacketCount`（红包数量，默认 30 个）
- ✅ 总金额 = `perAmount * count`（例如：10 * 30 = 300 USDT）

**响应**:
```json
{
  "success": true,
  "message": "操作成功",
  "data": {
    "redPacket": {
      "_id": "69d6c953713d9e7d19d4a362",
      "sender": {
        "_id": "69d658d7cb4369f44d6918bd",
        "username": "张三",
        "avatar": "👤"
      },
      "type": "normal",
      "totalAmount": 300,
      "count": 30,
      "message": "接龙红包",
      "roomId": "69d4ac8de8e03b8ae3397bb7",
      "amounts": [10, 10, 10, ...],
      "isChainRedPacket": true,
      "chainGroupId": "69d4ac8de8e03b8ae3397bb7",
      "remainAmount": 300,
      "remainCount": 30,
      "createdAt": "2026-04-09T06:30:00.000Z"
    },
    "message": "接龙红包发送成功"
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "error": {
    "code": "GROUP_NOT_FOUND",
    "message": "群组不存在",
    "timestamp": "2026-04-09T06:30:00.000Z"
  }
}
```

**验证规则**:
- ✅ 必须是接龙群（`group.settings.isChainRedPacket === true`）
- ✅ 用户必须是群成员且未被踢出
- ✅ 余额必须 >= `perAmount * count`
- ✅ 自动通过 Socket 广播到群组

---

#### **4.3.4 领取接龙红包**
```http
POST /api/redpackets/:id/open
Authorization: Bearer <token>
```

**查询参数**:
- `useRedis`: 是否使用 Redis 统计（可选，默认 false）
  - `true`: 老接口，使用 Redis 累加统计
  - `false` 或不传: 新接口，使用 MongoDB 字段统计

**响应**:
```json
{
  "success": true,
  "message": "红包领取成功",
  "data": {
    "redPacket": { ... },
    "amount": 10,
    "newBalance": 1010,
    "totalReceived": 10,
    "wasKicked": false,
    "kickReason": ""
  }
}
```

**踢出逻辑**:
- 当 `totalReceived >= kickThreshold`（默认 380 USDT）时自动踢出
- 被踢出后无法继续领取红包

---

### **4.4 六合红包 (LiuHe) ⭐**

**重要限制**: 只能在群组 `69d3f89668f596338b0c1930` (六合天下) 中使用。

#### **4.3.1 做庄发红包**
```http
POST /api/liuhe/create
Authorization: Bearer <token>
Content-Type: application/json
```
**请求体**:
```json
{
  "prizePool": 490,
  "groupId": "69d3f89668f596338b0c1930"
}
```
**响应**:
```json
{
  "success": true,
  "data": {
    "_id": "69d4063546d61dd912853593",
    "banker": { ... },
    "prizePool": 490,
    "bettingDeadline": "2026-04-07T12:32:00.000Z",
    "status": "open"
  }
}
```

#### **4.3.2 玩家投注**
```http
POST /api/liuhe/:id/bet
Authorization: Bearer <token>
Content-Type: application/json
```
**请求体**:
```json
{
  "numbers": [1, 2, 3],
  "amountPerNumber": 10
}
```

#### **4.3.3 获取红包详情与额度**
```http
GET /api/liuhe/:id
Authorization: Bearer <token>
```
**说明**: 返回红包详情、每个号码的剩余额度以及当前用户的投注记录。

#### **4.3.4 个人账单** ⭐ 新增
```http
GET /api/liuhe/my-bills
Authorization: Bearer <token>
```
**功能说明**:
- ✅ 返回用户作为庄家的所有红包记录
- ✅ 返回用户作为玩家的所有投注记录
- ✅ 包含详细的统计数据

**响应**:
```json
{
  "success": true,
  "data": {
    "stats": {
      "bankerStats": {
        "totalPackets": 3,           // 发了几个红包
        "totalPrizePool": 1470,      // 总奖池金额
        "openPackets": 1,            // 进行中
        "settledPackets": 2,         // 已结算
        "refundedPackets": 0,        // 已退款
        "totalProfit": 150           // 总盈利
      },
      "playerStats": {
        "totalBets": 10,             // 下了几次注
        "totalBetAmount": 500,       // 总投注金额
        "wonBets": 3,                // 中奖次数
        "lostBets": 5,               // 未中奖次数
        "pendingBets": 2,            // 待开奖
        "totalWon": 800,             // 总奖金
        "totalLost": 300             // 总亏损
      }
    },
    "bankerRecords": [
      {
        "_id": "69d4dbd116110a5d0af12a00",
        "prizePool": 490,
        "groupId": "69d4ac8de8e03b8ae3397bab",
        "status": "settled",
        "bankerProfit": 50,
        "lotteryPeriod": "2026096",
        "winningNumbers": [35, 37, 26, 5, 25, 15, 43],
        "createdAt": "2026-04-07T10:26:25.000Z",
        
        // 📊 投注汇总（新增）
        "betsSummary": {
          "totalBets": 15,              // 总投注次数
          "totalBetAmount": 1200,       // 总投注金额
          "uniqueNumbers": 28,          // 有多少个不同号码被压
          "totalPayout": 440,           // 总赔付金额
          "profit": 50,                 // 盈利 = 奖池 - 赔付
          
          // 每个号码的投注详情
          "betsByNumber": {
            "7": {
              "number": 7,
              "totalBet": 150,          // 这个号总共被压了150
              "betCount": 5,            // 有5个人压了这个号
              "bettors": [              // 压注者列表
                {
                  "userId": "1234567",
                  "username": "张三",
                  "amount": 50
                }
              ]
            }
          }
        },
        
        // 📝 投注明细列表（新增）
        "betList": [
          {
            "_id": "...",
            "user": {
              "userId": "1234567",
              "username": "张三"
            },
            "numbers": [7, 15, 23],     // 压了哪些号
            "amountPerNumber": 50,      // 每个号压多少
            "totalAmount": 150,         // 总投注
            "status": "won",            // pending/won/lost
            "createdAt": "2026-04-07T10:30:00.000Z"
          }
        ]
      }
    ],
    "betRecords": [
      {
        "_id": "...",
        "numbers": [7, 15, 23],      // 下了哪些号码
        "amountPerNumber": 50,       // 每个号码投多少
        "totalAmount": 150,          // 总投注
        "status": "won",             // pending/won/lost
        "matchedNumbers": [15],      // 中了哪些号
        "grossPayout": 2450,         // 税前奖金
        "platformFee": 245,          // 平台抽成
        "netPayout": 2205,           // 实得奖金
        "redPacket": {
          "prizePool": 490,
          "groupId": "69d4ac8de8e03b8ae3397bab",
          "status": "settled",
          "lotteryPeriod": "2026096",
          "winningNumbers": [35, 37, 26, 5, 25, 15, 43]
        }
      }
    ]
  }
}
```

**字段说明**:

### 庄家记录 (bankerRecords)
- **betsSummary**: 投注汇总统计
  - `totalBets`: 总共有多少次投注
  - `totalBetAmount`: 所有玩家总共压了多少
  - `uniqueNumbers`: 有多少个不同的号码被压
  - `totalPayout`: 需要赔付的总金额
  - `profit`: 盈利 = 奖池 - 赔付
  - `betsByNumber`: 每个号码的详细投注情况
    - `number`: 号码
    - `totalBet`: 这个号码总共被压了多少
    - `betCount`: 有多少人压了这个号码
    - `bettors`: 压注者列表（包含用户信息和金额）

- **betList**: 投注明细列表
  - 每一条投注记录的详细信息
  - 包含用户、号码、金额、状态等

### 玩家记录 (betRecords)
- 显示自己作为玩家的投注历史
- 包含中奖情况和奖金

**前端使用示例**:
```javascript
// 获取账单数据
const billsRes = await request.get('/liuhe/my-bills');
const { stats, bankerRecords, betRecords } = billsRes.data;

console.log('我发了', stats.bankerStats.totalPackets, '个红包');
console.log('我下了', stats.playerStats.totalBets, '次注');
console.log('总盈利:', stats.bankerStats.totalProfit);
console.log('总奖金:', stats.playerStats.totalWon);
```

---

## 5️⃣ 聊天模块

### **5.1 Socket.io 连接**

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'your_jwt_token'
  }
});

// 连接成功
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

// 接收消息
socket.on('receiveMessage', (message) => {
  console.log('收到消息:', message);
});

// 发送消息
socket.emit('sendMessage', {
  roomId: 'room123',
  content: '你好',
  type: 'text'
});
```

---

## 📊 错误码对照表

| 错误码 | 说明 | HTTP 状态码 |
|--------|------|------------|
| `USERNAME_EXISTS` | 用户名已存在 | 400 |
| `PHONE_EXISTS` | 手机号已注册 | 400 |
| `INVALID_PHONE_FORMAT` | 手机号格式错误 | 400 |
| `PASSWORD_TOO_SHORT` | 密码长度不足 | 400 |
| `INVALID_CREDENTIALS` | 账号或密码错误 | 401 |
| `USER_NOT_FOUND` | 用户不存在 | 404 |
| `ALREADY_FRIENDS` | 已经是好友 | 400 |
| `FRIEND_REQUEST_SENT` | 已发送好友请求 | 400 |
| `CANNOT_ADD_SELF` | 不能添加自己 | 400 |
| `INSUFFICIENT_BALANCE` | 余额不足 | 400 |
| `BALANCE_INSUFFICIENT` | 余额不足（提现） | 400 |
| `INVALID_WALLET_ADDRESS` | 无效的钱包地址 | 400 |
| `MINIMUM_WITHDRAWAL` | 低于最低提现金额 | 400 |
| `MAXIMUM_WITHDRAWAL` | 超过最高提现金额 | 400 |
| `TRANSACTION_FAILED` | 交易失败 | 500 |
| `INTERNAL_ERROR` | 服务器内部错误 | 500 |
| `INVALID_GROUP` | 群组错误（如非六合天下群） | 400 |
| `BETTING_CLOSED` | 不在投注时段 | 400 |

---

## 6️⃣ 开奖数据模块

### **6.1 获取最新开奖结果**
```http
GET /api/lottery/latest
```
**响应**:
```json
{
  "success": true,
  "data": {
    "period": "2026096",
    "numbers": [35, 37, 26, 5, 25, 15, 43],
    "firstNumber": 35
  }
}
```

### **6.2 获取群置顶公告**
```http
GET /api/lottery/group/:groupId/pinned
```

---

## 💡 前端开发建议

### **1. 本地存储用户信息**

```javascript
// stores/user.js
import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
  state: () => ({
    userInfo: null,
    token: null
  }),
  
  actions: {
    setUserInfo(user, token) {
      this.userInfo = user;
      this.token = token;
      uni.setStorageSync('userInfo', user);
      uni.setStorageSync('token', token);
    },
    
    loadUserInfo() {
      this.userInfo = uni.getStorageSync('userInfo');
      this.token = uni.getStorageSync('token');
    }
  }
});
```

### **2. 封装请求工具**

```javascript
// utils/request.js
import axios from 'axios';
import { useUserStore } from '@/stores/user';

const request = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000
});

// 请求拦截器
request.interceptors.request.use(config => {
  const userStore = useUserStore();
  if (userStore.token) {
    config.headers.Authorization = `Bearer ${userStore.token}`;
  }
  return config;
});

// 响应拦截器
request.interceptors.response.use(
  response => response.data,
  error => {
    const message = error.response?.data?.error?.message || '请求失败';
    uni.showToast({
      title: message,
      icon: 'none'
    });
    return Promise.reject(error);
  }
);

export default request;
```

### **3. 显示用户 ID**

```vue
<template>
  <div class="profile-card">
    <h2>{{ user.username }}</h2>
    
    <!-- 用户ID卡片 -->
    <div class="user-id-card" @click="copyUserId">
      <div class="label">我的用户ID</div>
      <div class="id-number">{{ user.userId }}</div>
      <div class="hint">点击复制</div>
    </div>
  </div>
</template>

<script setup>
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();
const user = computed(() => userStore.userInfo);

const copyUserId = () => {
  navigator.clipboard.writeText(user.value.userId);
  uni.showToast({
    title: '已复制：' + user.value.userId,
    icon: 'success'
  });
};
</script>
```

---

## 🚀 快速开始

### **步骤 1: 注册用户**

```javascript
const res = await request.post('/auth/register', {
  username: '测试用户',
  phone: '13800138000',
  password: '123456'
});

// 保存用户信息
userStore.setUserInfo(res.data.user, res.data.token);
```

### **步骤 2: 获取钱包信息**

```javascript
const walletRes = await request.get('/wallet/info');
console.log('充值地址:', walletRes.data.depositAddress);
```

### **步骤 3: 搜索好友**

```javascript
const searchRes = await request.get('/friends/search', {
  params: { keyword: '56781234' }
});
```

### **步骤 4: 添加好友**

```javascript
await request.post('/friends', {
  userId: '56781234',
  message: '你好'
});
```

---

## 📞 技术支持

如有问题，请联系后端开发。

**当前状态**:
- ✅ 服务运行中: `http://localhost:5000`
- ✅ 数据库: MongoDB (已清空)
- ✅ TRON 钱包: 已配置
- ✅ 充值监听: 已启动

---

**文档版本**: v1.3  
**更新时间**: 2026-04-09 06:30  
**后端开发**: Lingma

---

## 🆕 最新更新 (2026-04-09)

### 新增接口
- ✅ **POST /api/redpackets/chain** - 创建接龙红包
  - 支持在接龙群中发送固定金额红包
  - 自动验证群组类型和成员身份
  - 自动通过 Socket 广播到群组
  - 参数：groupId, perAmount, count, message(可选)

---

## 🆕 最新更新 (2026-04-07)

### 新增接口
- ✅ **GET /api/liuhe/my-bills** - 六合红包个人账单
  - 返回庄家记录（发了几个红包、总盈利）
  - 返回玩家记录（下了哪些号码、中奖情况）
  - 包含详细统计数据

---

## ⚠️ 重要提示

1. **ID 格式规范**: 所有的业务 ID（如红包 ID、群 ID）均为 MongoDB ObjectId 格式（24位十六进制字符串），请勿自行生成或使用临时 ID。
2. **六合红包时间段**: 00:00-20:32 为投注期，20:33-21:32 为封盘期，21:33-23:59 为结算期。
3. **群组限制**: 六合红包只能在「六合天下」群（ID: `69d3f89668f596338b0c1930`）中发送和参与。
