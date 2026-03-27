const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// 配置项
const WS_SERVER_URL = 'ws://127.0.0.1:3000';
const RECONNECT_INTERVAL = 3000; // 断连后重连间隔（3秒）
let ws = null;
let isConnected = false;

// 客户端核心逻辑
function createWebSocket() {
  // 关闭旧连接（如果存在）
  if (ws) {
    ws.removeAllListeners();
    ws.close();
  }

  // 新建连接
  ws = new WebSocket(WS_SERVER_URL);

  // 连接成功
  ws.on('open', () => {
    console.log('✅ WebSocket 连接成功');
    isConnected = true;
    // 发送心跳（可选：主动维持连接）
    setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.pong(); // 响应服务端的 ping
      }
    }, 30000);
  });

  // 接收服务端消息
  ws.on('message', (data) => {
    try {
      const response = JSON.parse(data.toString());
      const { requestId, code, msg, data: responseData } = response;
      
      // 根据状态码处理响应
      if (code === 200) {
        console.log(`✅ [${requestId}] 成功：`, responseData);
      } else if (code === 202) {
        console.log(`⌛ [${requestId}] 处理中：`, msg);
      } else {
        console.log(`❌ [${requestId}] 失败：`, msg);
      }
    } catch (err) {
      console.error('解析服务端消息失败：', err);
    }
  });

  // 连接关闭
  ws.on('close', (code, reason) => {
    console.log(`❌ WebSocket 连接关闭：${code} - ${reason}`);
    isConnected = false;
    // 自动重连
    setTimeout(createWebSocket, RECONNECT_INTERVAL);
  });

  // 连接错误
  ws.on('error', (err) => {
    console.error('WebSocket 错误：', err);
    isConnected = false;
  });
}

// 发送请求到服务端
function sendRequest(action, params) {
  if (!isConnected) {
    console.error('❌ 未连接到服务器，无法发送请求');
    return null;
  }

  // 生成唯一请求ID（用于匹配响应）
  const requestId = uuidv4();
  
  // 构造请求体
  const request = {
    requestId,
    action,
    params
  };

  // 发送消息
  ws.send(JSON.stringify(request));
  console.log(`📤 发送请求 [${requestId}]：${action}`, params);
  return requestId;
}

// 测试使用
// 1. 初始化连接
createWebSocket();

// 2. 等待连接建立后发送测试请求
setTimeout(() => {
  // 调用大模型（核心场景）
  sendRequest('call_llm', {
    prompt: '你是一名喜欢养绿植的爱好者，给我推荐一种适合新手养殖的多肉植物',
    model: 'qwen3.5-plus',
    temperature: 0.8
  });

  // 获取提示词
  sendRequest('get_prompts', {
    page: 1,
    size: 10
  });
}, 1000); // 等待 1 秒确保连接建立