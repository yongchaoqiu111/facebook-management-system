const axios = require('axios');
const WebSocket = require('ws');

const BASE_URL = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3001';

async function testRestAPI() {
  console.log('=== 测试REST API ===');
  
  try {
    // 测试获取BTC实时价格
    console.log('1. 测试获取BTC实时价格...');
    const btcPrice = await axios.get(`${BASE_URL}/ticker/btcusd`);
    console.log('BTC价格:', btcPrice.data);
    
    // 测试获取ETH实时价格
    console.log('2. 测试获取ETH实时价格...');
    const ethPrice = await axios.get(`${BASE_URL}/ticker/ethusd`);
    console.log('ETH价格:', ethPrice.data);
    
    // 测试获取K线数据
    console.log('3. 测试获取BTC K线数据...');
    const klineData = await axios.get(`${BASE_URL}/ohlc/btcusd?step=900&limit=10`);
    console.log('BTC K线数据点数:', klineData.data.data.length);
    console.log('第一条K线数据:', klineData.data.data[0]);
    
  } catch (error) {
    console.error('REST API测试失败:', error.message);
  }
}

function testWebSocket() {
  console.log('\n=== 测试WebSocket API ===');
  
  const ws = new WebSocket(WS_URL);
  
  ws.on('open', () => {
    console.log('WebSocket连接成功');
    
    // 订阅BTC实时交易
    ws.send(JSON.stringify({
      event: 'bts:subscribe',
      data: {
        channel: 'live_trades_btcusd'
      }
    }));
  });
  
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    console.log('收到WebSocket消息:', data);
    
    // 只接收3条消息后关闭连接
    if (data.event === 'trade') {
      if (!ws.messageCount) ws.messageCount = 0;
      ws.messageCount++;
      
      if (ws.messageCount >= 3) {
        console.log('收到3条消息后关闭连接');
        ws.close();
      }
    }
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket错误:', error);
  });
  
  ws.on('close', () => {
    console.log('WebSocket连接关闭');
  });
}

// 运行测试
async function runTests() {
  await testRestAPI();
  testWebSocket();
}

runTests();