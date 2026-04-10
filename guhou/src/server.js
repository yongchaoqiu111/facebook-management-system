const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// 导入配置
const { PORT, CORS_CONFIG } = require('./config');

// 导入中间件
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// 导入路由
const tickerRouter = require('./routes/ticker');
const ohlcRouter = require('./routes/ohlc');

// 导入WebSocket处理器
const { handleWebSocketConnection } = require('./websocket/handler');

// 创建Express应用
const app = express();

// 创建logs目录
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// 配置中间件
app.use(cors(CORS_CONFIG));
app.use(express.json());

// 设置路由
app.use('/ticker', tickerRouter);
app.use('/ohlc', ohlcRouter);

// 404 处理
app.use(notFoundHandler);

// 全局错误处理
app.use(errorHandler);

// 启动HTTP服务器
const server = app.listen(PORT, () => {
  console.log('后端服务运行在 http://localhost:' + PORT);
});

// 设置WebSocket服务器
const wss = new WebSocket.Server({ server });

// 处理WebSocket连接
handleWebSocketConnection(wss);

console.log('WebSocket服务运行在 ws://localhost:' + PORT);