# 加密货币行情后端API文档

## 服务地址

- REST API: `http://localhost:3001`
- WebSocket API: `ws://localhost:3001`

## REST API接口

### 1. 获取币种实时价格

**端点**: `GET /ticker/:symbol`

**参数**:
- `symbol`: 币种代码（如btcusd、ethusd）

**响应格式**:
```json
{
  "last": "68500.50",
  "change_percent": "2.5"
}
```

**示例请求**:
```
GET http://localhost:3001/ticker/btcusd
```

### 2. 获取K线历史数据

**端点**: `GET /ohlc/:symbol`

**参数**:
- `symbol`: 币种代码（如btcusd、ethusd）
- `step`: 时间间隔（秒），可选，默认900（15分钟）
- `limit`: 返回数据点数量，可选，默认50
- `start`: 开始时间戳，可选，默认当前时间往前推limit个step

**响应格式**:
```json
{
  "data": [
    [
      1678900000,  // 时间戳
      "68500.50",  // 开盘价
      "68600.25",  // 最高价
      "68400.75",  // 最低价
      "68550.00",  // 收盘价
      100          // 成交量
    ],
    // 更多数据点...
  ]
}
```

**示例请求**:
```
GET http://localhost:3001/ohlc/btcusd?step=900&limit=50
```

## WebSocket接口

### 连接地址
`ws://localhost:3001`

### 订阅实时交易数据

**订阅消息格式**:
```json
{
  "event": "bts:subscribe",
  "data": {
    "channel": "live_trades_btcusd"
  }
}
```

**订阅成功响应**:
```json
{
  "event": "bts:subscription_succeeded",
  "channel": "live_trades_btcusd"
}
```

**实时交易数据推送**:
```json
{
  "event": "trade",
  "data": {
    "price": "68500.50",
    "amount": "0.5000",
    "timestamp": 1678900000,
    "type": "buy"
  }
}
```

## 支持的币种

- BTC (Bitcoin)
- ETH (Ethereum)
- BNB (Binance Coin)
- SOL (Solana)
- ADA (Cardano)

## 支持的时间周期

- 1分钟: 60秒
- 5分钟: 300秒
- 15分钟: 900秒
- 1小时: 3600秒
- 4小时: 14400秒
- 1天: 86400秒

## 前端配置说明

1. 修改前端API基础URL:
```javascript
// src/constants/market.js
export const API_CONFIG = {
  BASE_URL: 'http://localhost:3001',
  WS_URL: 'ws://localhost:3001'
}
```

2. 确保前端已安装axios和WebSocket客户端库

## 注意事项

- 本服务提供模拟数据，价格和涨跌幅为随机生成
- WebSocket连接会自动推送实时交易数据，每2秒更新一次
- REST API支持CORS跨域访问
- 服务默认运行在3001端口