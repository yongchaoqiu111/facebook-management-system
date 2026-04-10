const wsManager = require('./manager');

function handleWebSocketConnection(wss) {
  wss.on('connection', (ws, req) => {
    const clientId = req.socket.remoteAddress;
    
    wsManager.addClient(ws, clientId);
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        
        if (data.event === 'bts:subscribe' && data.data && data.data.channel) {
          wsManager.subscribe(clientId, data.data.channel);
          
          ws.send(JSON.stringify({
            event: 'bts:subscription_succeeded',
            channel: data.data.channel
          }));
        }
      } catch (error) {
        console.error('消息处理错误:', error);
      }
    });
    
    ws.on('close', () => {
      wsManager.removeClient(clientId);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket错误:', clientId, error);
      wsManager.removeClient(clientId);
    });
    
    ws.on('pong', () => {
      const client = wsManager.clients.get(clientId);
      if (client) {
        client.lastHeartbeat = Date.now();
      }
    });
  });
  
  // 启动心跳检测
  wsManager.startHeartbeat();
}

module.exports = { handleWebSocketConnection };